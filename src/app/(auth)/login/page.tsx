"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HardHat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Login failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
              <HardHat className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-fg-default">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-fg-muted">Sign in to your workspace</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome back</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    error={!!error}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    error={!!error}
                  />
                </div>

                {error && (
                  <div className="animate-fade-in rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading} loading={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-fg-muted">
                Demo accounts use password{" "}
                <code className="rounded bg-surface-sunken px-1 font-mono text-fg-default">password123</code>
              </p>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-fg-muted">
            <Link href="/" className="text-primary hover:underline font-medium">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — brand illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-terracotta-700 via-terracotta-600 to-sand-600 items-center justify-center relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur shadow-2xl mb-8">
            <HardHat className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white text-balance">
            Construction control for Grade-1 practice
          </h2>
          <p className="mt-4 text-base text-sand-100 leading-relaxed">
            Daily reports, WBS, quality, HSE, cost, procurement, and FIDIC-aligned
            workflows in one platform.
          </p>
        </div>
      </div>
    </div>
  );
}