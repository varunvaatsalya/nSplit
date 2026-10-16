"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Circle, Lock, Mail, User } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const longEnough = password.length >= MIN_PASSWORD;

  function clear(field) {
    setErrors((x) => ({ ...x, [field]: null, form: null }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!name.trim()) found.name = "Enter your name";
    if (!EMAIL.test(email.trim())) found.email = "Enter a valid email address";
    if (!longEnough) found.password = `Use at least ${MIN_PASSWORD} characters`;
    setErrors(found);
    if (found.name || found.email || found.password) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors({ form: json?.error?.message || "Could not create your account. Try again." });
        return;
      }
      router.push(json.data?.invitations?.pending > 0 ? "/notifications" : "/groups");
      router.refresh();
    } catch {
      setErrors({ form: "Could not reach nSplit. Check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free, and it takes a few seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline dark:text-primary-foreground">
            Log in
          </Link>
        </>
      }
    >
      <GoogleButton text="signup_with" />
      <AuthDivider />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthField
          label="Your name"
          icon={User}
          autoComplete="name"
          placeholder="How your group knows you"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clear("name");
          }}
          error={errors.name}
          autoFocus
        />
        <AuthField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clear("email");
          }}
          error={errors.email}
        />
        <AuthField
          label="Password"
          icon={Lock}
          password
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clear("password");
          }}
          error={errors.password}
          hint={
            <span className={cn("flex items-center gap-1.5", longEnough && "text-success")}>
              {longEnough ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              At least {MIN_PASSWORD} characters
            </span>
          }
        />
        {errors.form ? (
          <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
            {errors.form}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-[15px] font-bold">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
