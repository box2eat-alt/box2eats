import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, resetPassword } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resetPassword(formData.email);
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const t0 = Date.now();
      console.log('[Login] Starting sign-in...');

      const result = await Promise.race([
        (async () => {
          const r = isSignUp
            ? await signup(formData.email, formData.password, formData.full_name)
            : await login(formData.email, formData.password);
          console.log('[Login] Supabase responded in', Date.now() - t0, 'ms', r);
          return r;
        })(),
        new Promise((_, reject) =>
          setTimeout(() => {
            console.error('[Login] Timed out after 30s');
            reject(new Error('Login timed out. Please try again.'));
          }, 30000)
        ),
      ]);
      if (result) {
        console.log('[Login] Success — redirecting to /home');
        window.location.href = '/home';
      }
    } catch (err) {
      console.error('[Login] Error:', err.message, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#c0282d] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl bg-gray-900 text-white border-0">
        <CardHeader className="text-center">
          <img src="/box2eats-logo.png" alt="Box2Eats Logo" className="w-32 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {isForgotPassword ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <p className="text-gray-300 text-sm">
            {isForgotPassword
              ? "Enter your email and we'll send you a reset link"
              : isSignUp
              ? "Sign up to start ordering healthy meals"
              : "Sign in to your Box2Eats account"}
          </p>
        </CardHeader>
        <CardContent>
          {/* Forgot Password View */}
          {isForgotPassword ? (
            resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="bg-green-800/40 border border-green-600 text-green-300 px-4 py-3 rounded-lg text-sm">
                  Check your email — a reset link has been sent.
                </div>
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setResetEmailSent(false); setError(null); }}
                  className="text-[#c0282d] font-semibold hover:underline text-sm"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                {error && (
                  <div className="bg-red-800/40 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full bg-[#c0282d] hover:bg-[#a02125] text-white" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <p className="text-center text-sm text-gray-300">
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(false); setError(null); }}
                    className="text-[#c0282d] font-semibold hover:underline"
                  >
                    Back to Sign In
                  </button>
                </p>
              </form>
            )
          ) : (
            /* Sign In / Sign Up View */
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(true); setError(null); }}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                    minLength={6}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-red-800/40 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-[#c0282d] hover:bg-[#a02125] text-white" disabled={loading}>
                {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
              </Button>
              <p className="text-center text-sm text-gray-300">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                  className="text-[#c0282d] font-semibold hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
