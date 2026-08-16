<script lang="ts" setup>
  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Family Accounting" });

  const { api, formatMoney, formatDate } = useFamilyAccounting();
  const { monthRange, weekRange, today, formatPeriodLabel } = useDateRanges();

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);
  const thisWeek = weekRange(0);
  const lastWeek = weekRange(-1);

  const { data, pending, error, refresh } = await useAsyncData(
    "family-accounting-dashboard",
    async () => {
      const [balance, summary, previous, week, previousWeek, budgets, recent] =
        await Promise.all([
          api.balance(),
          api.summary(thisMonth),
          api.summary(lastMonth),
          api.summary(thisWeek),
          api.summary(lastWeek),
          // Pass the browser's local date so "this week" follows her calendar
          // rather than the server's UTC day.
          api.budgets(today()),
          api.transactions({ limit: 10 }),
        ]);
      return { balance, summary, previous, week, previousWeek, budgets, recent };
    },
  );

  // Entries added or edited elsewhere should be reflected on return to this page.
  onActivated(refresh);

  const scope = ref<"week" | "month">("week");

  const weeklyBudgets = computed(
    () => data.value?.budgets.filter((b) => b.period === "weekly") ?? [],
  );
  const monthlyBudgets = computed(
    () => data.value?.budgets.filter((b) => b.period === "monthly") ?? [],
  );

  /** Total still available across the budgets shown, carry included. */
  const budgetRemaining = computed(() => {
    const rows = scope.value === "week" ? weeklyBudgets.value : monthlyBudgets.value;
    return rows.reduce((sum, b) => sum + b.remainingCents, 0);
  });

  const shownBudgets = computed(() =>
    scope.value === "week" ? weeklyBudgets.value : monthlyBudgets.value,
  );

  /** Group the recent list by date so a whole week entered at once reads as one block. */
  const grouped = computed(() => {
    const groups = new Map<string, typeof data.value.recent>();
    for (const tx of data.value?.recent ?? []) {
      if (!groups.has(tx.date)) groups.set(tx.date, []);
      groups.get(tx.date)!.push(tx);
    }
    return [...groups.entries()];
  });

  const periodLabel = computed(() =>
    scope.value === "week"
      ? formatPeriodLabel(today(), "weekly")
      : formatPeriodLabel(today(), "monthly"),
  );
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

      <!-- Week/month toggle drives both the summary and the budget list. -->
      <div role="tablist" class="tabs tabs-box">
        <button
          role="tab"
          class="tab"
          :class="{ 'tab-active': scope === 'week' }"
          @click="scope = 'week'"
        >
          This week
        </button>
        <button
          role="tab"
          class="tab"
          :class="{ 'tab-active': scope === 'month' }"
          @click="scope = 'month'"
        >
          This month
        </button>
      </div>

      <FamilyAccountingMonthSummary
        :summary="scope === 'week' ? data.week : data.summary"
        :previous="scope === 'week' ? data.previousWeek : data.previous"
        :title="periodLabel"
        :comparison-label="scope === 'week' ? 'vs last week' : 'vs last month'"
      />

      <div v-if="data.budgets.length" class="bg-base-200 rounded-box p-4">
        <div class="flex items-center justify-between mb-1">
          <h2 class="font-semibold">Budget left</h2>
          <NuxtLink to="/family-accounting/budgets" class="link link-hover text-sm">
            Manage
          </NuxtLink>
        </div>
        <div
          class="text-3xl font-mono font-bold mb-3"
          :class="budgetRemaining < 0 ? 'text-error' : 'text-success'"
        >
          {{ budgetRemaining < 0 ? "-" : "" }}{{ formatMoney(Math.abs(budgetRemaining)) }}
        </div>

        <FamilyAccountingBudgetTracker
          :budgets="shownBudgets"
          :period="scope === 'week' ? 'weekly' : 'monthly'"
        />

        <p
          v-if="scope === 'week' && monthlyBudgets.length && !weeklyBudgets.length"
          class="text-sm opacity-60"
        >
          Your budgets are all monthly — switch to This month to see them.
        </p>
      </div>

      <div v-else class="bg-base-200 rounded-box p-4">
        <h2 class="font-semibold mb-1">Budgets</h2>
        <p class="text-sm opacity-70">
          Set a spending limit per category and track what's left as you go.
          <NuxtLink to="/family-accounting/new" class="link">Add a budget</NuxtLink>
          from the Add page.
        </p>
      </div>

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
