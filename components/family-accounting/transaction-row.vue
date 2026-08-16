<script lang="ts" setup>
  import type { TransactionDto } from "~/composables/useFamilyAccounting";

  defineProps<{ transaction: TransactionDto }>();

  const { formatSigned } = useFamilyAccounting();
</script>

<template>
  <NuxtLink
    :to="`/family-accounting/transactions/${transaction.id}`"
    class="flex items-center gap-3 px-4 py-3 hover:bg-base-200 active:bg-base-300 transition-colors"
  >
    <div class="bg-base-300 rounded-full p-2 shrink-0">
      <Icon :name="transaction.categoryIcon || 'tabler:point'" size="20" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="font-medium truncate">{{ transaction.categoryName }}</div>
      <div v-if="transaction.note" class="text-sm opacity-60 truncate">
        {{ transaction.note }}
      </div>
    </div>

    <div
      class="font-mono font-medium shrink-0"
      :class="{
        'text-success': transaction.categoryType === 'income',
        'text-info': transaction.categoryType === 'transfer',
      }"
    >
      {{ formatSigned(transaction.amountCents, transaction.categoryType) }}
    </div>
  </NuxtLink>
</template>
