// components/team/accept-invitation-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Building2,
  User,
  Mail,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface AcceptInvitationFormProps {
  token: string;
  email: string;
  fullName: string;
  roleLabel: string;
  organizationName: string;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score
                ? score <= 1
                  ? "bg-red-500"
                  : score <= 2
                    ? "bg-amber-500"
                    : score <= 3
                      ? "bg-lime-500"
                      : "bg-emerald-500"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              "flex items-center gap-1.5 text-[11px]",
              c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            {c.ok ? (
              <CheckCircle2 className="h-3 w-3 shrink-0" />
            ) : (
              <span className="h-3 w-3 shrink-0 rounded-full border border-muted-foreground/40" />
            )}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AcceptInvitationForm({
  token,
  email,
  fullName,
  roleLabel,
  organizationName,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: fullName,
          password: values.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || "Something went wrong");
        return;
      }

      toast.success("Account created", {
        description: "You can sign in with your new password.",
      });
      router.push("/login?accepted=1");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      setServerError(message);
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      {/* Invite context card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border bg-card p-5 shadow-sm space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-foreground truncate">
              {fullName}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Mail className="h-3 w-3 shrink-0" />
              {email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Shield className="h-3 w-3" />
              Role
            </div>
            <p className="text-sm font-medium text-foreground">{roleLabel}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-3 w-3" />
              Organization
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {organizationName}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Password form */}
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border bg-card p-5 shadow-sm space-y-5"
        noValidate
      >
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            Create your password
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose a strong password to secure your account.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="h-10 pl-9 pr-10"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {password.length > 0 && <PasswordStrength password={password} />}
            {errors.password && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-medium">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className="h-10 pl-9 pr-10"
                placeholder="••••••••"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className="w-full h-10"
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          By creating an account you agree to join{" "}
          <span className="font-medium text-foreground">{organizationName}</span>{" "}
          as a <span className="font-medium text-foreground">{roleLabel}</span>.
        </p>
      </motion.form>
    </div>
  );
}