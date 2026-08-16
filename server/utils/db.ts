import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../lib/db/schema";
import type { H3Event } from "h3";

export function useDb(event: H3Event) {
  const d1 = event.context.cloudflare.env.CF_NUXT_D1;
  return drizzle(d1, { schema });
}
