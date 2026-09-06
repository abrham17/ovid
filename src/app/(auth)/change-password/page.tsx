"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function ChangePasswordPage() { const router = useRouter(); const [error, setError] = useState<string>(); async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); if (f.get("password") !== f.get("confirm")) return setError("Passwords do not match"); const r = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: f.get("password") }) }); const j = await r.json(); if (!j.success) return setError(j.error); router.push("/dashboard"); router.refresh(); } return <div className="flex min-h-screen items-center justify-center p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Change initial password</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div><Label>New password</Label><Input name="password" type="password" minLength={12} required /></div><div><Label>Confirm password</Label><Input name="confirm" type="password" minLength={12} required /></div>{error && <p className="text-sm text-danger">{error}</p>}<Button className="w-full">Change password</Button></form></CardContent></Card></div>; }
