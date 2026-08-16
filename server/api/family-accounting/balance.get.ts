/** GET /api/family-accounting/balance — the number the spreadsheet's Balance column held. */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  return await computeBalance(useDb(event));
});
