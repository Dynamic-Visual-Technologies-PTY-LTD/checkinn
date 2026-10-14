/**
 * Copies text to the clipboard. Resolves false when the Clipboard API is
 * missing or the browser refuses, so the caller can offer a fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (!clipboard || typeof clipboard.writeText !== "function") return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
