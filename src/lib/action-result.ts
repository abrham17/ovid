import { ZodError } from "zod";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string };

export function ok(message?: string): ActionResult {
  return message ? { ok: true, message } : { ok: true };
}

export function fail(message: string): ActionResult {
  return { ok: false, message };
}

export function fromError(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message ?? "Invalid input.");
  }
  if (error instanceof Error) {
    return fail(error.message);
  }
  return fail("Something went wrong.");
}

/** Wrap a mutation so forms always get a structured result. */
export async function runAction(
  fn: () => Promise<void | ActionResult>
): Promise<ActionResult> {
  try {
    const result = await fn();
    if (result && typeof result === "object" && "ok" in result) {
      return result;
    }
    return ok();
  } catch (error) {
    return fromError(error);
  }
}
