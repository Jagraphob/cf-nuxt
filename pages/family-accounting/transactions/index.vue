<script lang="ts" setup>
  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "History" });

  const { api, formatDate, formatMoney } = useFamilyAccounting();
  const { monthRange } = useDateRanges();

  const range = ref<{ from?: string; to?: string }>(monthRange(0));
  const categoryId = ref<string>("");

  const { data: categories } = await useAsyncData("fa-categories-all", () =>
    api.categories(true),
  );

  const query = computed(() => ({
    ...range.value,
    ...(categoryId.value ? { categoryId: categoryId.value } : {}),
    limit: 500,
  }));

  const { data: transactions, pending } = await useAsyncData(
    "fa-transactions",
    () => api.transactions(query.value),
    { watch: [query] },
  );

  /** Group by date so a week entered in one batch reads as a single block. */
  const grouped = computed(() => {
    const groups = new Map<string, NonNullable<typeof transactions.value>>();
    for (const tx of transactions.value ?? []) {
      if (!groups.has(tx.date)) groups.set(tx.date, []);
      groups.get(tx.date)!.push(tx);
    }
    return [...groups.entries()];
  });

  /** Net movement across the filtered set, so the header total matches what's listed. */
  const netCents = computed(() =>
    (transactions.value ?? []).reduce(
      (sum, tx) => sum + (tx.categoryType === "income" ? tx.amountCents : -tx.amountCents),
      0,
    ),
  );
</script>

<template>
  <div>
    <h1 class="text-xl font-bold px-4 pt-4">History</h1>

    <FamilyAccountingDateRangePicker v-model="range" />

    <div class="px-4 pb-3">
      <select v-model="categoryId" class="select select-sm select-bordered w-full">
        <option value="">All categories</option>
        <option v-for="c in categories ?? []" :key="c.id" :value="c.id">
          {{ c.name }}{{ c.archivedAt ? " (archived)" : "" }}
        </option>
      </select>
    </div>

    <div class="px-4 pb-3 flex items-center justify-between text-sm">
      <span class="opacity-60">{{ transactions?.length ?? 0 }} entries</span>
      <span class="font-mono" :class="netCents < 0 ? 'text-error' : 'text-success'">
        net {{ formatMoney(netCents) }}
      </span>
    </div>

    <div v-if="pending" class="px-4 space-y-2">
      <div v-for="n in 5" :key="n" class="skeleton h-14 w-full"></div>
    </div>

    <p v-else-if="!transactions?.length" class="px-4 opacity-60">
      Nothing in this period.
    </p>

    <div v-else class="bg-base-200">
      <template v-for="[date, items] in grouped" :key="date">
        <div class="px-4 py-1 text-xs uppercase opacity-60 bg-base-300">
          {{ formatDate(date) }}
        </div>
        <FamilyAccountingTransactionRow
          v-for="tx in items"
          :key="tx.id"
          :transaction="tx"
        />
      </template>
    </div>
  </div>
</template>
