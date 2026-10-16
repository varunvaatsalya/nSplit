"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/groups";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!EMAIL.test(email.trim())) found.email = "Enter a valid email address";
    if (!password) found.password = "Enter your password";
    setErrors(found);
    if (found.email || found.password) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ form: json?.error?.message || "Could not log in. Check your email and password." });
        return;
      }
      const pending = json.data?.invitations?.pending > 0;
      router.push(!searchParams.get("next") && pending ? "/notifications" : next);
      router.refresh();
    } catch {
      setErrors({ form: "Could not reach nSplit. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <AuthField
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrors((x) => ({ ...x, email: null, form: null }));
        }}
        error={errors.email}
        autoFocus
      />
      <AuthField
        label="Password"
        icon={Lock}
        password
        autoComplete="current-password"
        placeholder="Your password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setErrors((x) => ({ ...x, password: null, form: null }));
        }}
        error={errors.password}
      />
      {errors.form ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-[15px] font-bold">
        {loading ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to see your groups and balances."
      footer={
        <>
          New to nSplit?{" "}
          <Link href="/signup" className="font-bold text-primary hover:underline dark:text-primary-foreground">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-soft" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
