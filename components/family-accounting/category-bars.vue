<script lang="ts" setup>
  import type { SummaryDto } from "~/composables/useFamilyAccounting";

  const props = defineProps<{
    rows: SummaryDto["byCategory"];
    /** Bars are drawn relative to the largest row, not the total, so small ones stay visible. */
    emptyMessage?: string;
  }>();

  defineEmits<{ select: [categoryId: string] }>();

  const { formatMoney } = useFamilyAccounting();

  const total = computed(() => props.rows.reduce((sum, r) => sum + r.totalCents, 0));
  const max = computed(() => Math.max(...props.rows.map((r) => r.totalCents), 1));

  function percentOfTotal(cents: number): number {
    return total.value === 0 ? 0 : Math.round((cents / total.value) * 100);
  }
</script>

<template>
  <div>
    <p v-if="!rows.length" class="opacity-60 text-sm px-1">
      {{ emptyMessage || "Nothing in this period." }}
    </p>

    <ul v-else class="space-y-3">
      <li v-for="row in rows" :key="row.categoryId">
        <button class="w-full text-left" @click="$emit('select', row.categoryId)">
          <div class="flex items-center gap-2 mb-1">
            <Icon :name="row.icon || 'tabler:point'" size="16" class="opacity-70" />
            <span class="flex-1 truncate">{{ row.name }}</span>
            <span class="font-mono text-sm">{{ formatMoney(row.totalCents) }}</span>
            <span class="text-xs opacity-60 w-9 text-right">
              {{ percentOfTotal(row.totalCents) }}%
            </span>
          </div>
          <progress
            class="progress w-full"
            :class="{
              'progress-success': row.type === 'income',
              'progress-info': row.type === 'transfer',
              'progress-primary': row.type === 'expense',
            }"
            :value="row.totalCents"
            :max="max"
          ></progress>
        </button>
      </li>
    </ul>
  </div>
</template>
