<script lang="ts" setup>
  import type { TrendPointDto } from "~/composables/useFamilyAccounting";

  const props = defineProps<{ points: TrendPointDto[] }>();

  const { formatMoney, formatMonth } = useFamilyAccounting();

  /**
   * Hand-rolled SVG rather than a charting dependency: two grouped bars per month
   * is not worth ~200KB in a Worker bundle. The viewBox scales to fit any width.
   */
  const HEIGHT = 140;
  const GAP = 6;

  const max = computed(() =>
    Math.max(...props.points.flatMap((p) => [p.income, p.expense]), 1),
  );

  const width = computed(() => Math.max(props.points.length * 40, 200));
  const slot = computed(() => width.value / Math.max(props.points.length, 1));

  function barHeight(cents: number): number {
    return (cents / max.value) * HEIGHT;
  }

  const selected = ref<number | null>(null);
  const active = computed(() =>
    selected.value === null ? null : props.points[selected.value],
  );
</script>

<template>
  <div>
    <p v-if="!points.length" class="opacity-60 text-sm">Not enough data yet.</p>

    <div v-else>
      <div class="overflow-x-auto">
        <svg
          :viewBox="`0 0 ${width} ${HEIGHT + 24}`"
          :style="{ minWidth: `${width}px` }"
          class="w-full"
          role="img"
          aria-label="Income and expense by month"
        >
          <g v-for="(point, index) in points" :key="point.month">
            <!-- Full-height hit area: thin bars are hard to tap on a phone. -->
            <rect
              :x="index * slot"
              y="0"
              :width="slot"
              :height="HEIGHT + 24"
              fill="transparent"
              class="cursor-pointer"
              @click="selected = selected === index ? null : index"
            />
            <rect
              :x="index * slot + GAP / 2"
              :y="HEIGHT - barHeight(point.income)"
              :width="slot / 2 - GAP"
              :height="barHeight(point.income)"
              class="fill-success"
              :opacity="selected === null || selected === index ? 1 : 0.4"
            />
            <rect
              :x="index * slot + slot / 2 + GAP / 2"
              :y="HEIGHT - barHeight(point.expense)"
              :width="slot / 2 - GAP"
              :height="barHeight(point.expense)"
              class="fill-primary"
              :opacity="selected === null || selected === index ? 1 : 0.4"
            />
            <text
              :x="index * slot + slot / 2"
              :y="HEIGHT + 16"
              text-anchor="middle"
              class="fill-current text-[9px] opacity-60"
            >
              {{ formatMonth(point.month) }}
            </text>
          </g>
        </svg>
      </div>

      <div class="flex items-center gap-4 text-xs mt-2">
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-success inline-block"></span> In
        </span>
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-sm bg-primary inline-block"></span> Out
        </span>
        <span class="opacity-60">Tap a month for detail</span>
      </div>

      <div v-if="active" class="bg-base-300 rounded-box p-3 mt-3 text-sm">
        <div class="font-semibold mb-1">{{ formatMonth(active.month) }}</div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
          <span class="opacity-70">In</span>
          <span class="text-right">{{ formatMoney(active.income) }}</span>
          <span class="opacity-70">Out</span>
          <span class="text-right">{{ formatMoney(active.expense) }}</span>
          <span class="opacity-70">Saved</span>
          <span class="text-right">{{ formatMoney(active.transfer) }}</span>
          <span class="opacity-70">Net</span>
          <span class="text-right" :class="active.net < 0 ? 'text-error' : 'text-success'">
            {{ formatMoney(active.net) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
