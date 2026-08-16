import { settings } from "../../../lib/db/schema";

/** GET /api/family-accounting/settings */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const [row] = await db.select().from(settings).limit(1);
  return (
    row ?? {
      id: 1,
      openingBalanceCents: 0,
      openingBalanceDate: "1970-01-01",
      currency: "NZD",
    }
  );
});
