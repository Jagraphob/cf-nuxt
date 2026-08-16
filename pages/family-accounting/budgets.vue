<script lang="ts" setup>
  import type { BudgetProgressDto } from "~/composables/useFamilyAccounting";
  import type { BudgetPeriod } from "~/lib/periods";

  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Budgets" });

  const { api, formatMoney, centsToInput, inputToCents, formatDate } =
    useFamilyAccounting();
  const { today, formatPeriodLabel } = useDateRanges();

  const { data, pending, refresh } = await useAsyncData("fa-budgets", () =>
    api.budgetHistory(today()),
  );

  const busy = ref(false);
  const errorMessage = ref("");

  // --- Edit an amount ---
  const editingId = ref("");
  const editingAmount = ref("");
  const editingPeriod = ref<BudgetPeriod>("weekly");

  function startEdit(budget: BudgetProgressDto) {
    editingId.value = budget.categoryId;
    editingAmount.value = centsToInput(budget.amountCents);
    editingPeriod.value = budget.period;
  }

  async function saveEdit(budget: BudgetProgressDto) {
    const cents = inputToCents(editingAmount.value);
    if (cents === null || cents <= 0) {
      errorMessage.value = "A budget has to be a positive amount.";
      return;
    }
    busy.value = true;
    errorMessage.value = "";
    try {
      // Takes effect from the current period; earlier periods keep their old
      // figure, so past weeks still show what they were actually judged against.
      await api.setBudgets({
        categoryId: budget.categoryId,
        period: editingPeriod.value,
        amountCents: cents,
        startDate: today(),
      });
      editingId.value = "";
      await refresh();
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't save that budget.";
    } finally {
      busy.value = false;
    }
  }

  // --- Stop / remove ---
  const confirmingStop = ref("");

  async function stop(budget: BudgetProgressDto, purge: boolean) {
    busy.value = true;
    errorMessage.value = "";
    try {
      await api.stopBudget(budget.categoryId, purge);
      confirmingStop.value = "";
      await refresh();
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't stop that budget.";
    } finally {
      busy.value = false;
    }
  }

  /** Past versions of a category's budget, newest first. */
  function history(categoryId: string) {
    return (data.value?.versions ?? [])
      .filter((v) => v.categoryId === categoryId && v.endDate !== null)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  const expanded = ref("");
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold">Budgets</h1>
      <NuxtLink to="/family-accounting/new" class="btn btn-primary btn-sm">
        <Icon name="tabler:plus" size="16" /> Add
      </NuxtLink>
    </div>

    <div v-if="errorMessage" role="alert" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button class="btn btn-xs btn-ghost" @click="errorMessage = ''">Dismiss</button>
    </div>

    <div v-if="pending" class="space-y-2">
      <div v-for="n in 3" :key="n" class="skeleton h-24 w-full"></div>
    </div>

    <p v-else-if="!data?.progress.length" class="opacity-70">
      No budgets yet. Use the
      <NuxtLink to="/family-accounting/new" class="link">Add page</NuxtLink>
      and pick the Budget tab to set a spending limit for a category.
    </p>

    <div
      v-for="budget in data?.progress ?? []"
      v-else
      :key="budget.categoryId"
      class="bg-base-200 rounded-box p-4 space-y-2"
    >
      <div class="flex items-center gap-2">
        <Icon :name="budget.icon || 'tabler:point'" size="20" />
        <span class="font-semibold flex-1 truncate">{{ budget.name }}</span>
        <span class="badge badge-ghost">
          {{ formatMoney(budget.amountCents) }}/{{ budget.period === "weekly" ? "wk" : "mo" }}
        </span>
      </div>

      <template v-if="editingId === budget.categoryId">
        <label class="input input-bordered flex items-center gap-2 w-full">
          <span class="opacity-60">$</span>
          <input
            v-model="editingAmount"
            type="text"
            inputmode="decimal"
            class="grow font-mono"
          />
        </label>
        <div role="tablist" class="tabs tabs-box">
          <button
            v-for="p in (['weekly', 'monthly'] as BudgetPeriod[])"
            :key="p"
            role="tab"
            class="tab capitalize"
            :class="{ 'tab-active': editingPeriod === p }"
            @click="editingPeriod = p"
          >
            {{ p }}
          </button>
        </div>
        <p class="text-xs opacity-60">
          Applies from {{ formatPeriodLabel(today(), editingPeriod) }} onward.
          Earlier periods keep their old amount.
        </p>
        <div class="flex gap-2">
          <button class="btn btn-sm btn-ghost flex-1" @click="editingId = ''">
            Cancel
          </button>
          <button
            class="btn btn-sm btn-primary flex-1"
            :disabled="busy"
            @click="saveEdit(budget)"
          >
            Save
          </button>
        </div>
      </template>

      <template v-else>
        <div class="flex items-baseline gap-2">
          <span
            class="text-2xl font-mono font-bold"
            :class="budget.remainingCents < 0 ? 'text-error' : 'text-success'"
          >
            {{ budget.remainingCents < 0 ? "-" : ""
            }}{{ formatMoney(Math.abs(budget.remainingCents)) }}
          </span>
          <span class="text-sm opacity-60">left</span>
        </div>

        <div class="text-sm opacity-70">
          {{ formatMoney(budget.spentThisPeriodCents) }} spent
          {{ budget.period === "weekly" ? "this week" : "this month" }}
          ({{ formatPeriodLabel(budget.periodStart, budget.period) }})
        </div>
        <div class="text-xs opacity-60">
          Since {{ formatDate(budget.since) }}:
          {{ formatMoney(budget.budgetedCents) }} budgeted,
          {{ formatMoney(budget.spentSinceCents) }} spent
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <button class="btn btn-xs btn-ghost bg-base-100" @click="startEdit(budget)">
            <Icon name="tabler:pencil" size="14" /> Change amount
          </button>
          <button
            v-if="history(budget.categoryId).length"
            class="btn btn-xs btn-ghost bg-base-100"
            @click="expanded = expanded === budget.categoryId ? '' : budget.categoryId"
          >
            <Icon name="tabler:history" size="14" />
            {{ expanded === budget.categoryId ? "Hide" : "History" }}
          </button>
          <button
            class="btn btn-xs btn-ghost bg-base-100 text-error"
            @click="confirmingStop = budget.categoryId"
          >
            <Icon name="tabler:x" size="14" /> Stop
          </button>
        </div>

        <ul
          v-if="expanded === budget.categoryId"
          class="text-xs opacity-70 space-y-1 pt-1"
        >
          <li v-for="version in history(budget.categoryId)" :key="version.id">
            {{ formatMoney(version.amountCents) }}/{{
              version.period === "weekly" ? "wk" : "mo"
            }}
            — {{ formatDate(version.startDate) }} to {{ formatDate(version.endDate!) }}
          </li>
        </ul>

        <div v-if="confirmingStop === budget.categoryId" class="bg-base-100 rounded-box p-3 space-y-2">
          <p class="text-sm">Stop budgeting {{ budget.name }}?</p>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-xs btn-ghost" @click="confirmingStop = ''">
              Keep it
            </button>
            <button
              class="btn btn-xs btn-warning"
              :disabled="busy"
              @click="stop(budget, false)"
            >
              Stop, keep history
            </button>
            <button
              class="btn btn-xs btn-error"
              :disabled="busy"
              @click="stop(budget, true)"
            >
              Delete entirely
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
