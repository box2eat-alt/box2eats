import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // If env vars are missing (e.g. Vercel without VITE_*), never block the whole app on auth.
  const [isLoadingAuth, setIsLoadingAuth] = useState(isSupabaseConfigured);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Failed to fetch profile:', error);
    }
    console.log('[AuthContext] profile fetched:', { data, error, userId });
    setProfile(data ?? null);
    return data;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let cancelled = false;
    const SESSION_INIT_MS = 8_000;
    const FAILSAFE_MS = 5_000;

    const failSafeId = window.setTimeout(() => {
      setIsLoadingAuth(false);
    }, FAILSAFE_MS);

    (async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session check timed out')), SESSION_INIT_MS)
          ),
        ]);
        if (cancelled) return;
        const session = result?.data?.session;
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Auth init failed:', err);
        }
      } finally {
        window.clearTimeout(failSafeId);
        if (!cancelled) {
          setIsLoadingAuth(false);
        }
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(failSafeId);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signup = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('signOut error (ignored):', e);
    }
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    const { role: _ignoredRole, ...safeUpdates } = updates;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  };

  const displayFullName = (p, authUser) => {
    const fromProfile = p?.full_name?.trim();
    if (fromProfile) return fromProfile;
    const fromMeta = authUser?.user_metadata?.full_name?.trim();
    if (fromMeta) return fromMeta;
    if (authUser?.email) return authUser.email.split('@')[0];
    return '';
  };

  const combinedUser = user
    ? profile
      ? {
          ...profile,
          id: user.id,
          email: user.email || profile.email,
          full_name: displayFullName(profile, user),
        }
      : {
          id: user.id,
          email: user.email,
          role: 'user',
          full_name: displayFullName(null, user),
        }
    : null;

  return (
    <AuthContext.Provider value={{
      user: combinedUser,
      rawUser: user,
      profile,
      isAuthenticated,
      isLoadingAuth,
      login,
      signup,
      logout,
      updateProfile,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
