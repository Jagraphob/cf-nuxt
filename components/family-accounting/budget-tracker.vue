<script lang="ts" setup>
  import type { BudgetProgressDto } from "~/composables/useFamilyAccounting";
  import type { BudgetPeriod } from "~/lib/periods";

  const props = defineProps<{
    budgets: BudgetProgressDto[];
    /** Show only weekly or only monthly budgets; omit for all. */
    period?: BudgetPeriod;
    title?: string;
  }>();

  const { formatMoney } = useFamilyAccounting();

  const rows = computed(() =>
    props.period
      ? props.budgets.filter((b) => b.period === props.period)
      : props.budgets,
  );

  /**
   * Bar shows this period's allowance consumed. Carry is deliberately kept out
   * of the bar and shown as a separate line — mixing it in makes a bar that can
   * start part-full or already past the end, which reads as a bug.
   */
  function barValue(budget: BudgetProgressDto): number {
    return Math.min(budget.spentThisPeriodCents, budget.amountCents);
  }

  function isOver(budget: BudgetProgressDto): boolean {
    return budget.remainingCents < 0;
  }

  function barTone(budget: BudgetProgressDto): string {
    if (isOver(budget)) return "progress-error";
    if (budget.spentThisPeriodCents > budget.amountCents) return "progress-warning";
    return "progress-success";
  }
</script>

<template>
  <div>
    <h2 v-if="title" class="font-semibold mb-3">{{ title }}</h2>

    <p v-if="!rows.length" class="text-sm opacity-60">
      No budgets set.
      <NuxtLink to="/family-accounting/new" class="link">Add one</NuxtLink>
      from the Add page.
    </p>

    <ul v-else class="space-y-4">
      <li v-for="budget in rows" :key="budget.categoryId">
        <div class="flex items-center gap-2 mb-1">
          <Icon :name="budget.icon || 'tabler:point'" size="16" class="opacity-70" />
          <span class="flex-1 truncate">{{ budget.name }}</span>
          <span
            class="font-mono font-semibold"
            :class="isOver(budget) ? 'text-error' : 'text-success'"
          >
            {{ isOver(budget) ? "-" : "" }}{{ formatMoney(Math.abs(budget.remainingCents)) }}
          </span>
        </div>

        <progress
          class="progress w-full"
          :class="barTone(budget)"
          :value="barValue(budget)"
          :max="budget.amountCents"
        ></progress>

        <div class="flex justify-between text-xs opacity-60 mt-1">
          <span>
            {{ formatMoney(budget.spentThisPeriodCents) }} of
            {{ formatMoney(budget.amountCents) }}
            this {{ budget.period === "weekly" ? "week" : "month" }}
          </span>
          <span v-if="budget.carriedInCents !== 0">
            {{ budget.carriedInCents > 0 ? "+" : "-"
            }}{{ formatMoney(Math.abs(budget.carriedInCents)) }} carried in
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
