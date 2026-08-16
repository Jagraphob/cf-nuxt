const ALLOWED_EMAILS = new Set([
  "jagraphob.j@gmail.com",
  "toe15g@gmail.com",
  "thichawee.p@gmail.com",
  "thichawee.j@gmail.com",
]);

export function isAllowedEmail(email: string | undefined | null): boolean {
  return !!email && ALLOWED_EMAILS.has(email.toLowerCase());
}
