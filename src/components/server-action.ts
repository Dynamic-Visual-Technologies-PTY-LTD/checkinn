import type { ActionResult } from "@/domain/types";

/*
 * Helpers for client components that call a server action inside a
 * transition and handle its outcome themselves (AD-11).
 */

/** When the request itself fails, the guest sees the same message as a server error. */
export const NETWORK_ERROR: ActionResult = {
  ok: false,
  code: "SERVER_ERROR",
  message: "Something went wrong on our side. Try again.",
};

/**
 * Where a server action that redirected sent the guest, or null for any other
 * error. It rejects with Next's redirect error after the router has
 * navigated; the digest reads "NEXT_REDIRECT;<type>;<url>;<status>;".
 */
export function redirectTarget(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error) ||
    typeof error.digest !== "string" ||
    !error.digest.startsWith("NEXT_REDIRECT;")
  ) {
    return null;
  }
  return error.digest.split(";")[2] ?? "";
}
