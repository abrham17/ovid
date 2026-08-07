"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { APP_NAME, titleCase } from "@/lib/constants";

type InviteInfo = {
  email: string;
  fullName: string;
  jobTitle: string;
  role: string;
  organization: { name: string; partyType: string };
  project?: { code: string; name: string } | null;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/accept-invitation?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setLoadError(json.error || "Invalid or expired invitation");
          return;
        }
        setInfo(json.data);
        setName(json.data.fullName || "");
      })
      .catch(() => setLoadError("Could not load invitation"));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password, confirmPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Could not accept invitation");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-default px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-fg-default">{APP_NAME}</h1>
          <p className="text-sm text-fg-muted">Accept your invitation</p>
        </div>

        {loadError && (
          <Card className="border-danger/30">
            <CardContent className="p-6 text-center text-sm text-danger">
              {loadError}
            </CardContent>
          </Card>
        )}

        {!loadError && !info && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-subtle" />
          </div>
        )}

        {info && (
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                Join <span className="font-medium text-fg-default">{info.organization.name}</span>
                {info.project ? (
                  <>
                    {" "}
                    on project{" "}
                    <span className="font-medium text-fg-default">
                      {info.project.code} — {info.project.name}
                    </span>
                  </>
                ) : null}{" "}
                as <span className="font-medium text-fg-default">{titleCase(info.role)}</span>.
              </CardDescription>
              <p className="text-xs text-fg-subtle">{info.email}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading} loading={loading}>
                  {loading ? "Creating account…" : "Create account & join"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}