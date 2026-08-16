<script lang="ts" setup>
  import type { CategoryType } from "~/lib/db/schema/accounting";

  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Add entry" });

  const { api, inputToCents, today } = useFamilyAccounting();

  const { data: categories } = await useAsyncData("fa-categories", () =>
    api.categories(),
  );

  /**
   * One shared date for the whole batch: she enters a week at a time, and
   * re-picking the date on every line would be the slowest part of the form.
   */
  const date = ref(today());
  const tab = ref<CategoryType>("expense");

  interface Line {
    categoryId: string;
    amount: string;
    note: string;
  }
  const lines = ref<Line[]>([{ categoryId: "", amount: "", note: "" }]);

  const visibleCategories = computed(
    () => categories.value?.filter((c) => c.type === tab.value) ?? [],
  );

  // Switching tab invalidates any category picked from the previous type.
  watch(tab, () => {
    for (const line of lines.value) line.categoryId = "";
  });

  function addLine() {
    lines.value.push({ categoryId: "", amount: "", note: "" });
  }

  function removeLine(index: number) {
    lines.value.splice(index, 1);
    if (!lines.value.length) addLine();
  }

  const saving = ref(false);
  const errorMessage = ref("");

  /** Lines that are actually filled in — a blank trailing line is not an error. */
  const filledLines = computed(() =>
    lines.value.filter((l) => l.categoryId && l.amount.trim()),
  );

  const canSave = computed(() => filledLines.value.length > 0 && !saving.value);

  async function save() {
    errorMessage.value = "";

    const payload = [];
    for (const line of filledLines.value) {
      const cents = inputToCents(line.amount);
      if (cents === null || cents === 0) {
        errorMessage.value = `"${line.amount}" isn't a valid amount.`;
        return;
      }
      payload.push({
        date: date.value,
        categoryId: line.categoryId,
        amountCents: cents,
        note: line.note.trim() || null,
      });
    }

    saving.value = true;
    try {
      await api.createTransactions(payload);
      await navigateTo("/family-accounting");
    } catch (error: any) {
      errorMessage.value = error?.statusMessage || "Couldn't save. Please try again.";
    } finally {
      saving.value = false;
    }
  }
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">Add entry</h1>

    <div role="tablist" class="tabs tabs-box">
      <button
        v-for="type in (['expense', 'income', 'transfer'] as CategoryType[])"
        :key="type"
        role="tab"
        class="tab capitalize"
        :class="{ 'tab-active': tab === type }"
        @click="tab = type"
      >
        {{ type === "transfer" ? "Saving" : type }}
      </button>
    </div>

    <label class="form-control">
      <span class="label-text mb-1 block">Date</span>
      <input v-model="date" type="date" class="input input-bordered w-full" />
    </label>

    <div
      v-for="(line, index) in lines"
      :key="index"
      class="bg-base-200 rounded-box p-3 space-y-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium opacity-70">Line {{ index + 1 }}</span>
        <button
          v-if="lines.length > 1"
          class="btn btn-ghost btn-xs"
          @click="removeLine(index)"
        >
          <Icon name="tabler:trash" size="16" /> Remove
        </button>
      </div>

      <label class="form-control">
        <span class="label-text mb-1 block">Amount</span>
        <label class="input input-bordered flex items-center gap-2 w-full">
          <span class="opacity-60">$</span>
          <!-- inputmode="decimal" gets the numeric keypad on mobile. -->
          <input
            v-model="line.amount"
            type="text"
            inputmode="decimal"
            placeholder="0.00"
            class="grow font-mono"
          />
        </label>
      </label>

      <div>
        <span class="label-text mb-1 block">Category</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in visibleCategories"
            :key="category.id"
            class="btn btn-sm"
            :class="
              line.categoryId === category.id ? 'btn-primary' : 'btn-ghost bg-base-100'
            "
            @click="line.categoryId = category.id"
          >
            <Icon v-if="category.icon" :name="category.icon" size="16" />
            {{ category.name }}
          </button>
        </div>
        <p v-if="!visibleCategories.length" class="text-sm opacity-60 mt-1">
          No {{ tab }} categories yet —
          <NuxtLink to="/family-accounting/categories" class="link">add one</NuxtLink>.
        </p>
      </div>

      <label class="form-control">
        <span class="label-text mb-1 block">Note (optional)</span>
        <input
          v-model="line.note"
          type="text"
          placeholder="e.g. 5-11 Jan expense, Kmart"
          class="input input-bordered w-full"
        />
      </label>
    </div>

    <button class="btn btn-ghost w-full" @click="addLine">
      <Icon name="tabler:plus" size="18" /> Add another line
    </button>

    <div v-if="errorMessage" role="alert" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <div class="flex gap-2">
      <NuxtLink to="/family-accounting" class="btn btn-ghost flex-1">Cancel</NuxtLink>
      <button class="btn btn-primary flex-1" :disabled="!canSave" @click="save">
        <span v-if="saving" class="loading loading-spinner loading-sm"></span>
        Save{{ filledLines.length > 1 ? ` ${filledLines.length} lines` : "" }}
      </button>
    </div>
  </div>
</template>
