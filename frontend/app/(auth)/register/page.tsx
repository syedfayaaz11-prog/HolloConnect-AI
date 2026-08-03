"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { register } from "@/lib/auth";
import { Button, GlassCard, Input } from "@/components/ui/primitives";
import { AuthLogoHero } from "@/components/auth/AuthLogoHero";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

// How long the success pulse plays before we actually navigate. Short enough to not feel like
// a delay, long enough for the glow/ring animation to read clearly.
const SUCCESS_ANIMATION_MS = 650;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      await register(email, password, name || undefined);
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
          <Sparkles size={13} /> Get started
        </p>
        <h1 className="text-xl font-semibold text-white mb-1 text-center">Create your account</h1>
        <p className="text-sm text-gray-400 mb-6 text-center">Start building with HolloConnect AI</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={success}
            autoComplete="name"
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={success}
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            disabled={success}
            autoComplete="new-password"
          />
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">
              {error}
            </motion.p>
          )}
          <Button type="submit" className="w-full" disabled={loading || success}>
            {success ? "Account created" : loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <div className="mt-5">
          <GoogleSignInButton onSuccess={onGoogleSuccess} onError={setError} />
        </div>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-violet hover:text-accent-cyan transition-colors">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </>
  );
}
