import { expect, type Page, type Request } from "@playwright/test";

// Seed photos are the only remote requests (AD-17).
export const SEED_PHOTO_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

/** Aborts seed photos only, as at the stand without internet. */
export async function blockSeedPhotos(page: Page) {
  await page.route(
    (url) => SEED_PHOTO_HOSTS.has(url.hostname),
    (route) => route.abort(),
  );
}

/**
 * A request a navigation cancels: a document load that a newer one replaced,
 * or a Next.js router fetch (an RSC payload or a prefetch, both GET with the
 * `rsc` header).
 */
function isRouterRequest(request: Request): boolean {
  if (request.isNavigationRequest()) return true;
  if (request.method() !== "GET") return false;
  const headers = request.headers();
  return headers.rsc === "1" || headers["next-router-prefetch"] === "1";
}

/**
 * The stand without internet (epic "Done when" 3, AD-17): every request that
 * is not to the app's own origin is aborted. Seed photos are the only remote
 * requests the app should make; anything else it tries is recorded.
 */

export type BlockedNetwork = {
  /** Remote requests other than seed photos: AD-17 says there are none. */
  remote: string[];
  /** Requests to the app that failed or answered with an error status. */
  failedApp: string[];
  /** Fails the test unless both lists are empty. */
  expectClean: () => void;
};

export async function blockNetwork(page: Page, baseURL: string | undefined): Promise<BlockedNetwork> {
  if (!baseURL) throw new Error("blockNetwork needs the project's baseURL");
  const app = new URL(baseURL).origin;
  const remote: string[] = [];
  const failedApp: string[] = [];

  await page.route(
    (url) => url.origin !== app,
    (route) => {
      const url = new URL(route.request().url());
      if (!SEED_PHOTO_HOSTS.has(url.hostname)) remote.push(url.href);
      return route.abort("internetdisconnected");
    },
  );
  // Requests the app answered without an error status.
  const answered = new WeakSet<Request>();
  page.on("response", (response) => {
    if (new URL(response.url()).origin !== app) return;
    if (response.status() >= 400) {
      failedApp.push(`${response.request().method()} ${response.url()} ${response.status()}`);
    } else {
      answered.add(response.request());
    }
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin !== app) return;
    const error = request.failure()?.errorText ?? "";
    // Cancelled by a navigation, which is the browser moving on, not the app
    // failing: a router fetch or document load that a newer navigation
    // replaced, or a server action whose redirect the router followed before
    // the answer's body was read to the end (the answer arrived, so it is in
    // `answered`). An action or fetch aborted with no answer still fails.
    if (error === "net::ERR_ABORTED" && (isRouterRequest(request) || answered.has(request))) return;
    failedApp.push(`${request.method()} ${request.url()} ${error}`);
  });

  return {
    remote,
    failedApp,
    expectClean: () => {
      expect(remote, "remote requests other than seed photos").toEqual([]);
      expect(failedApp, "failed requests to the app").toEqual([]);
    },
  };
}

/** Fails if the page scrolls sideways at the current viewport. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(0);
}
