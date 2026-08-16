<script lang="ts" setup>
  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Analysis" });

  const { api, formatMoney, formatMonth, formatDate } = useFamilyAccounting();
  const { monthRange } = useDateRanges();

  const range = ref<{ from?: string; to?: string }>(monthRange(0));

  const { data, pending } = await useAsyncData(
    "fa-analysis",
    async () => {
      const [summary, previous, trend] = await Promise.all([
        api.summary(range.value),
        api.summary(monthRange(-1)),
        // The trend is deliberately not clipped to the selected range — the point
        // of it is to show drift over time, which one month can't reveal.
        api.trend(),
      ]);
      return { summary, previous, trend };
    },
    { watch: [range] },
  );

  const expenses = computed(
    () => data.value?.summary.byCategory.filter((c) => c.type === "expense") ?? [],
  );
  const transfers = computed(
    () => data.value?.summary.byCategory.filter((c) => c.type === "transfer") ?? [],
  );
  const income = computed(
    () => data.value?.summary.byCategory.filter((c) => c.type === "income") ?? [],
  );

  // --- Drill-down ---
  const drilldownId = ref("");
  const drilldown = computed(() =>
    data.value?.summary.byCategory.find((c) => c.categoryId === drilldownId.value),
  );

  const { data: drilldownData } = await useAsyncData(
    "fa-drilldown",
    async () => {
      if (!drilldownId.value) return null;
      const [entries, months] = await Promise.all([
        api.transactions({ ...range.value, categoryId: drilldownId.value, limit: 200 }),
        api.trend({ categoryId: drilldownId.value }),
      ]);
      return { entries, months };
    },
    { watch: [drilldownId, range] },
  );

  function open(categoryId: string) {
    drilldownId.value = categoryId;
  }
</script>

<template>
  <div>
    <h1 class="text-xl font-bold px-4 pt-4">Analysis</h1>

    <FamilyAccountingDateRangePicker v-model="range" />

    <div v-if="pending" class="px-4 space-y-3">
      <div class="skeleton h-32 w-full"></div>
      <div class="skeleton h-40 w-full"></div>
    </div>

    <div v-else-if="data" class="px-4 space-y-5 pt-1">
      <FamilyAccountingMonthSummary
        :summary="data.summary"
        :previous="data.previous"
        title="Totals for this period"
      />

      <section class="bg-base-200 rounded-box p-4">
        <h2 class="font-semibold mb-3">Where the money went</h2>
        <FamilyAccountingCategoryBars
          :rows="expenses"
          empty-message="No spending in this period."
          @select="open"
        />
      </section>

      <section v-if="transfers.length" class="bg-base-200 rounded-box p-4">
        <!-- Kept apart from spending on purpose: a single savings transfer is
             often larger than every real expense combined. -->
        <h2 class="font-semibold mb-3">Savings &amp; transfers</h2>
        <FamilyAccountingCategoryBars :rows="transfers" @select="open" />
      </section>

      <section v-if="income.length" class="bg-base-200 rounded-box p-4">
        <h2 class="font-semibold mb-3">Income</h2>
        <FamilyAccountingCategoryBars :rows="income" @select="open" />
      </section>

      <section class="bg-base-200 rounded-box p-4">
        <h2 class="font-semibold mb-3">Month by month</h2>
        <FamilyAccountingTrendChart :points="data.trend" />
      </section>
    </div>

    <!-- Drill-down -->
    <div v-if="drilldown" class="modal modal-open" @click.self="drilldownId = ''">
      <div class="modal-box max-h-[80vh]">
        <div class="flex items-center gap-2 mb-3">
          <Icon :name="drilldown.icon || 'tabler:point'" size="20" />
          <h3 class="font-bold text-lg flex-1">{{ drilldown.name }}</h3>
          <button class="btn btn-sm btn-circle btn-ghost" @click="drilldownId = ''">✕</button>
        </div>

        <p class="font-mono text-2xl mb-1">{{ formatMoney(drilldown.totalCents) }}</p>
        <p class="text-sm opacity-60 mb-4">
          {{ drilldown.count }} entr{{ drilldown.count === 1 ? "y" : "ies" }} in this period
        </p>

        <template v-if="drilldownData">
          <h4 class="font-semibold text-sm mb-2">Month by month (all time)</h4>
          <ul class="space-y-1 mb-4 text-sm font-mono">
            <li
              v-for="month in drilldownData.months"
              :key="month.month"
              class="flex justify-between"
            >
              <span class="opacity-70">{{ formatMonth(month.month) }}</span>
              <span>
                {{ formatMoney(month.income + month.expense + month.transfer) }}
              </span>
            </li>
          </ul>

          <h4 class="font-semibold text-sm mb-2">Entries</h4>
          <ul class="space-y-2 text-sm">
            <li
              v-for="entry in drilldownData.entries"
              :key="entry.id"
              class="flex justify-between gap-2"
            >
              <div class="min-w-0">
                <div class="opacity-70">{{ formatDate(entry.date) }}</div>
                <div v-if="entry.note" class="opacity-60 truncate">{{ entry.note }}</div>
              </div>
              <span class="font-mono shrink-0">{{ formatMoney(entry.amountCents) }}</span>
            </li>
          </ul>
        </template>
      </div>
    </div>
  </div>
</template>
