"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setError("Check your email for a confirmation link!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign up";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16">
        <motion.div
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#E07B39]/20 to-[#C9A227]/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#C9A227]" />
          </div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-4">
            Check Your Email
          </h1>
          <p className="text-[#6B5344] mb-8">
            We sent a magic link to <strong>{email}</strong>
            <br />
            Click the link to sign in.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-[#E07B39] hover:underline"
          >
            Try a different email
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="absolute inset-0 pattern-overlay pointer-events-none" />

      <motion.div
        className="max-w-md w-full relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#6B5344] hover:text-[#2C1810] mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-[#C9A227]" />
            <span className="text-sm font-medium text-[#2C1810]">TravelCards</span>
          </div>
          <h1 className="font-serif text-3xl text-[#2C1810] mb-2">
            {mode === "login" && "Welcome Back"}
            {mode === "signup" && "Create Account"}
            {mode === "magic" && "Magic Link"}
          </h1>
          <p className="text-[#6B5344]">
            {mode === "login" && "Sign in to manage your journeys"}
            {mode === "signup" && "Start creating magical journeys"}
            {mode === "magic" && "Sign in without a password"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8">
          <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleMagicLink}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5344]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none transition-colors bg-white"
                  />
                </div>
              </div>

              {mode !== "magic" && (
                <div>
                  <label className="block text-sm font-medium text-[#2C1810] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B5344]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5DDD5] focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 outline-none transition-colors bg-white"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className={`text-sm ${error.includes("Check your email") ? "text-emerald-600" : "text-red-500"}`}>
                  {error}
                </p>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#E07B39] to-[#C9A227] text-white rounded-xl font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {mode === "magic" ? "Sending..." : mode === "signup" ? "Creating..." : "Signing in..."}
                  </span>
                ) : (
                  <>
                    {mode === "login" && "Sign In"}
                    {mode === "signup" && "Create Account"}
                    {mode === "magic" && "Send Magic Link"}
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Mode toggles */}
          <div className="mt-6 pt-6 border-t border-[#E5DDD5] text-center space-y-2">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("magic")}
                  className="text-sm text-[#6B5344] hover:text-[#E07B39]"
                >
                  Sign in with magic link instead
                </button>
                <p className="text-sm text-[#6B5344]">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-[#E07B39] hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-sm text-[#6B5344]">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-[#E07B39] hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "magic" && (
              <button
                onClick={() => setMode("login")}
                className="text-sm text-[#6B5344] hover:text-[#E07B39]"
              >
                Sign in with password instead
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
