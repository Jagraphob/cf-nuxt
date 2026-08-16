import { eq } from "drizzle-orm";
import { z } from "zod";
import { settings } from "../../../lib/db/schema";

const patchSchema = z.object({
  openingBalanceCents: z.number().int().optional(),
  openingBalanceDate: isoDateSchema.optional(),
  currency: z.string().trim().length(3).optional(),
});

/** PATCH /api/family-accounting/settings — adjust the ledger's starting point. */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = patchSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid settings",
      data: parsed.error.issues,
    });
  }

  const [existing] = await db.select().from(settings).limit(1);
  if (!existing) {
    const row = {
      id: 1,
      openingBalanceCents: parsed.data.openingBalanceCents ?? 0,
      openingBalanceDate: parsed.data.openingBalanceDate ?? "1970-01-01",
      currency: parsed.data.currency ?? "NZD",
    };
    await db.insert(settings).values(row);
    return row;
  }

  await db.update(settings).set(parsed.data).where(eq(settings.id, existing.id));
  return { ...existing, ...parsed.data };
});
