<script lang="ts" setup>
  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Edit entry" });

  const route = useRoute();
  const id = route.params.id as string;

  const { api, centsToInput, inputToCents, formatDate } = useFamilyAccounting();

  const { data, error } = await useAsyncData(`fa-tx-${id}`, async () => {
    const [transaction, categories] = await Promise.all([
      api.transaction(id),
      api.categories(true),
    ]);
    return { transaction, categories };
  });

  const date = ref(data.value?.transaction.date ?? "");
  const amount = ref(
    data.value ? centsToInput(data.value.transaction.amountCents) : "",
  );
  const categoryId = ref(data.value?.transaction.categoryId ?? "");
  const note = ref(data.value?.transaction.note ?? "");

  /**
   * Only categories of the same type are offered. Moving an expense into an
   * income category would flip its sign and silently rewrite history.
   */
  const sameTypeCategories = computed(() => {
    const type = data.value?.transaction.categoryType;
    return (data.value?.categories ?? []).filter(
      (c) => c.type === type && (!c.archivedAt || c.id === categoryId.value),
    );
  });

  const saving = ref(false);
  const errorMessage = ref("");
  const confirmingDelete = ref(false);

  async function save() {
    const cents = inputToCents(amount.value);
    if (cents === null || cents === 0) {
      errorMessage.value = `"${amount.value}" isn't a valid amount.`;
      return;
    }
    saving.value = true;
    errorMessage.value = "";
    try {
      await api.updateTransaction(id, {
        date: date.value,
        categoryId: categoryId.value,
        amountCents: cents,
        note: note.value.trim() || null,
      });
      await navigateTo("/family-accounting/transactions");
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't save. Please try again.";
    } finally {
      saving.value = false;
    }
  }

  async function remove() {
    saving.value = true;
    try {
      await api.deleteTransaction(id);
      await navigateTo("/family-accounting/transactions");
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't delete. Please try again.";
      saving.value = false;
    }
  }
</script>

<template>
  <div class="p-4 space-y-4">
    <div v-if="error" role="alert" class="alert alert-error">
      <span>That entry couldn't be found.</span>
    </div>

    <template v-else-if="data">
      <h1 class="text-xl font-bold">Edit entry</h1>
      <p class="text-sm opacity-60">
        {{ data.transaction.categoryType === "transfer" ? "Saving" : data.transaction.categoryType }}
        · entered by {{ data.transaction.createdBy }}
      </p>

      <label class="form-control">
        <span class="label-text mb-1 block">Date</span>
        <input v-model="date" type="date" class="input input-bordered w-full" />
      </label>

      <label class="form-control">
        <span class="label-text mb-1 block">Amount</span>
        <label class="input input-bordered flex items-center gap-2 w-full">
          <span class="opacity-60">$</span>
          <input
            v-model="amount"
            type="text"
            inputmode="decimal"
            class="grow font-mono"
          />
        </label>
      </label>

      <div>
        <span class="label-text mb-1 block">Category</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in sameTypeCategories"
            :key="category.id"
            class="btn btn-sm"
            :class="categoryId === category.id ? 'btn-primary' : 'btn-ghost bg-base-200'"
            @click="categoryId = category.id"
          >
            <Icon v-if="category.icon" :name="category.icon" size="16" />
            {{ category.name }}
            <span v-if="category.archivedAt" class="opacity-60">(archived)</span>
          </button>
        </div>
      </div>

      <label class="form-control">
        <span class="label-text mb-1 block">Note</span>
        <input v-model="note" type="text" class="input input-bordered w-full" />
      </label>

      <div v-if="errorMessage" role="alert" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <div class="flex gap-2">
        <NuxtLink to="/family-accounting/transactions" class="btn btn-ghost flex-1">
          Cancel
        </NuxtLink>
        <button class="btn btn-primary flex-1" :disabled="saving" @click="save">
          <span v-if="saving" class="loading loading-spinner loading-sm"></span>
          Save
        </button>
      </div>

      <div class="divider"></div>

      <div v-if="!confirmingDelete">
        <button class="btn btn-error btn-outline w-full" @click="confirmingDelete = true">
          <Icon name="tabler:trash" size="18" /> Delete entry
        </button>
      </div>
      <div v-else class="space-y-2">
        <p class="text-sm">Delete this entry? This can't be undone.</p>
        <div class="flex gap-2">
          <button class="btn btn-ghost flex-1" @click="confirmingDelete = false">
            Keep it
          </button>
          <button class="btn btn-error flex-1" :disabled="saving" @click="remove">
            Delete
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
