<script lang="ts" setup>
  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Family Accounting" });

  const { api, formatMoney, formatDate } = useFamilyAccounting();
  const { monthRange } = useDateRanges();

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const { data, pending, error, refresh } = await useAsyncData(
    "family-accounting-dashboard",
    async () => {
      const [balance, summary, previous, recent] = await Promise.all([
        api.balance(),
        api.summary(thisMonth),
        api.summary(lastMonth),
        api.transactions({ limit: 10 }),
      ]);
      return { balance, summary, previous, recent };
    },
  );

  // Entries added or edited elsewhere should be reflected on return to this page.
  onActivated(refresh);

  /** Group the recent list by date so a whole week entered at once reads as one block. */
  const grouped = computed(() => {
    const groups = new Map<string, typeof data.value.recent>();
    for (const tx of data.value?.recent ?? []) {
      if (!groups.has(tx.date)) groups.set(tx.date, []);
      groups.get(tx.date)!.push(tx);
    }
    return [...groups.entries()];
  });
</script>

<template>
  <div>
    <div v-if="pending" class="p-4 space-y-4">
      <div class="skeleton h-28 w-full"></div>
      <div class="skeleton h-32 w-full"></div>
    </div>

    <div v-else-if="error" role="alert" class="alert alert-error m-4">
      <span>Couldn't load your ledger. {{ error.message }}</span>
      <button class="btn btn-sm" @click="refresh()">Retry</button>
    </div>

    <div v-else-if="data" class="p-4 space-y-4">
      <!-- The number she checks first: the spreadsheet's Balance column. -->
      <div class="bg-primary text-primary-content rounded-box p-5">
        <div class="text-sm opacity-80">Current balance</div>
        <div class="text-4xl font-mono font-bold">
          {{ formatMoney(data.balance.balanceCents) }}
        </div>
        <div class="text-xs opacity-70 mt-1">
          since {{ formatDate(data.balance.openingDate) }}
        </div>
      </div>

      <FamilyAccountingMonthSummary
        :summary="data.summary"
        :previous="data.previous"
        title="This month"
      />

      <div class="bg-base-200 rounded-box overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <h2 class="font-semibold">Recent</h2>
          <NuxtLink to="/family-accounting/transactions" class="link link-hover text-sm">
            See all
          </NuxtLink>
        </div>

        <p v-if="!data.recent.length" class="px-4 pb-4 opacity-60">
          No entries yet — tap Add to record the first one.
        </p>

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

    <NuxtLink
      to="/family-accounting/new"
      class="btn btn-primary btn-circle btn-lg fixed bottom-24 right-5 shadow-lg"
      aria-label="Add entry"
    >
      <Icon name="tabler:plus" size="28" />
    </NuxtLink>
  </div>
</template>
