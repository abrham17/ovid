import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { DomainError } from "@/lib/domain-rules";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiError = {
  success: false;
  error: string;
  details?: unknown;
};

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, data, meta } satisfies ApiSuccess<T>, { status });
}

export function created<T>(data: T) {
  return ok(data, undefined, 201);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details } satisfies ApiError,
    { status }
  );
}

export function handleApiError(err: unknown) {
  console.error("[API Error]", err);

  if (err instanceof AuthError) {
    return fail(err.message, err.status);
  }
  if (err instanceof PermissionError) {
    return fail(err.message, err.status);
  }
  if (err instanceof DomainError) {
    return fail(err.message, err.status);
  }
  if (err instanceof ZodError) {
    return fail("Validation failed", 422, err.flatten());
  }
  if (err instanceof Error) {
    // Don't leak internal details in production
    const message =
      process.env.NODE_ENV === "development" ? err.message : "Internal server error";
    return fail(message, 500);
  }
  return fail("Internal server error", 500);
}

/** Parse JSON body safely */
export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/** Extract pagination from search params */
export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10) || 20));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}
