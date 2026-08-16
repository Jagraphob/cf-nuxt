import type { H3Event } from "h3";

const ALLOWED_EMAILS = new Set([
  "jagraphob.j@gmail.com",
  "toe15g@gmail.com",
  "thichawee.p@gmail.com",
  "thichawee.j@gmail.com",
]);

export function isAllowedEmail(email: string | undefined | null): boolean {
  return !!email && ALLOWED_EMAILS.has(email.toLowerCase());
}

/**
 * Server-side guard for API routes. `middleware/auth.ts` only runs in the browser,
 * so it protects the page but not the endpoint behind it — every handler that
 * touches family data must call this itself.
 *
 * Throws 401 with no session, 403 if the session somehow holds a non-allowlisted
 * email (belt and braces: the OAuth callback already refuses to create one).
 */
export async function requireFamilyUser(event: H3Event) {
  const { user } = await requireUserSession(event);
  if (!isAllowedEmail(user.email)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  return user;
}
