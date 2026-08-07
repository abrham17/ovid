/** Result type for server actions */
export type ActionResult =
  | { ok: true; message?: string; data?: unknown }
  | { ok: false; message: string; data?: never };