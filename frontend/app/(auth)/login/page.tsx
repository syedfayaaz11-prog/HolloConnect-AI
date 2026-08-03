"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { login } from "@/lib/auth";
import { Button, GlassCard, Input } from "@/components/ui/primitives";
import { AuthLogoHero } from "@/components/auth/AuthLogoHero";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

// How long the success pulse plays before we actually navigate. Short enough to not feel like
// a delay, long enough for the glow/ring animation to read clearly.
const SUCCESS_ANIMATION_MS = 650;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLoading(false);
      setSuccess(true);
      window.setTimeout(() => router.push("/dashboard"), SUCCESS_ANIMATION_MS);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function onGoogleSuccess() {
    setError(null);
    setSuccess(true);
    window.setTimeout(() => router.push("/dashboard"), SUCCESS_ANIMATION_MS);
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 mb-6">
        <AuthLogoHero size={72} success={success} />
        <span className="text-white font-semibold tracking-tight">HolloConnect AI</span>
      </div>

      <GlassCard>
        <p className="text-xs text-accent-violet font-medium mb-2 flex items-center gap-1.5 justify-center">
          <Sparkles size={13} /> Welcome back
        </p>
        <h1 className="text-xl font-semibold text-white mb-1 text-center">Sign in</h1>
        <p className="text-sm text-gray-400 mb-6 text-center">Continue to your AI workspace</p>

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={success}
            // "off" alone is widely ignored by Chrome/Firefox for login forms — browsers
            // specifically look for "username"/"current-password" (to autofill on purpose)
            // or, as here, deliberately non-matching values to opt out of the saved-password
            // autofill that was populating these fields on every visit.
            autoComplete="hollo-email"
            name="hollo-email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={success}
            autoComplete="new-password"
            name="hollo-password"
          />
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
              {error}
            </motion.p>
          )}
          <Button type="submit" className="w-full" disabled={loading || success}>
            {success ? "Signed in" : loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5">
          <GoogleSignInButton onSuccess={onGoogleSuccess} onError={setError} />
        </div>

        <p className="text-sm text-gray-400 mt-6 text-center">
          No account?{" "}
          <Link href="/register" className="text-accent-violet hover:text-accent-cyan transition-colors">
            Create one
          </Link>
        </p>
      </GlassCard>
    </>
  );
}
