import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ?? null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const SESSION_INIT_MS = 12_000;

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
          void fetchProfile(session.user.id);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Auth init failed:', err);
        }
      } finally {
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
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
