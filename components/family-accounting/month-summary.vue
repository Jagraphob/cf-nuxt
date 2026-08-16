<script lang="ts" setup>
  import type { SummaryDto } from "~/composables/useFamilyAccounting";

  const props = withDefaults(
    defineProps<{
      summary: SummaryDto | null;
      previous?: SummaryDto | null;
      title?: string;
      comparisonLabel?: string;
    }>(),
    { comparisonLabel: "vs last month" },
  );

  const { formatMoney } = useFamilyAccounting();

  /** Percentage change vs the comparison period; null when there's nothing to compare. */
  function delta(current: number, prior: number | undefined): number | null {
    if (prior === undefined || prior === 0) return null;
    return Math.round(((current - prior) / prior) * 100);
  }

  /**
   * Colour for a change arrow. Spending more is bad, earning or saving more is
   * good — so "Out" is the one metric where a rise is red.
   */
  function deltaTone(label: string, change: number): string {
    const isGood = label === "Out" ? change < 0 : change > 0;
    return isGood ? "text-success" : "text-error";
  }

  const rows = computed(() => {
    const t = props.summary?.totals;
    const p = props.previous?.totals;
    if (!t) return [];
    return [
      { label: "In", cents: t.income, delta: delta(t.income, p?.income), tone: "text-success" },
      { label: "Out", cents: t.expense, delta: delta(t.expense, p?.expense), tone: "" },
      { label: "Saved", cents: t.transfer, delta: delta(t.transfer, p?.transfer), tone: "text-info" },
      { label: "Net", cents: t.net, delta: null, tone: t.net < 0 ? "text-error" : "text-success" },
    ];
  });
</script>

<template>
  <div class="bg-base-200 rounded-box p-4">
    <h2 v-if="title" class="font-semibold mb-3">{{ title }}</h2>
    <div class="grid grid-cols-2 gap-3">
      <div v-for="row in rows" :key="row.label">
        <div class="text-xs uppercase opacity-60">{{ row.label }}</div>
        <div class="text-lg font-mono font-semibold" :class="row.tone">
          {{ formatMoney(row.cents) }}
        </div>
        <div
          v-if="row.delta !== null"
          class="text-xs"
          :class="deltaTone(row.label, row.delta)"
        >
          {{ row.delta > 0 ? "▲" : "▼" }} {{ Math.abs(row.delta) }}% {{ comparisonLabel }}
        </div>
      </div>
    </div>
  </div>
</template>
