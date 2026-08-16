<script lang="ts" setup>
  import type { CategoryType } from "~/lib/db/schema/accounting";
  import type { CategoryDto } from "~/composables/useFamilyAccounting";

  definePageMeta({ layout: "family-accounting", middleware: ["auth"] });
  useHead({ title: "Categories" });

  const { api } = useFamilyAccounting();

  const { data: categories, refresh } = await useAsyncData("fa-categories-manage", () =>
    api.categories(true),
  );

  const busy = ref(false);
  const errorMessage = ref("");
  const showArchived = ref(false);

  const TYPE_LABELS: Record<CategoryType, string> = {
    expense: "Expenses",
    income: "Income",
    transfer: "Savings & transfers",
  };

  const groups = computed(() =>
    (["expense", "income", "transfer"] as CategoryType[]).map((type) => ({
      type,
      label: TYPE_LABELS[type],
      items: (categories.value ?? []).filter(
        (c) => c.type === type && (showArchived.value || !c.archivedAt),
      ),
    })),
  );

  // --- Add ---
  const newName = ref("");
  const newType = ref<CategoryType>("expense");
  const newIcon = ref("tabler:point");

  /** A short palette beats a full icon picker on a phone. */
  const ICON_CHOICES = [
    "tabler:point", "tabler:shopping-cart", "tabler:school", "tabler:car",
    "tabler:train", "tabler:bolt", "tabler:wifi", "tabler:tools",
    "tabler:home", "tabler:heart", "tabler:plane", "tabler:gift",
    "tabler:pizza", "tabler:paw", "tabler:cash", "tabler:pig-money",
  ];

  async function addCategory() {
    if (!newName.value.trim()) return;
    busy.value = true;
    errorMessage.value = "";
    try {
      await api.createCategory({
        name: newName.value.trim(),
        type: newType.value,
        icon: newIcon.value,
      });
      newName.value = "";
      await refresh();
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't add that category.";
    } finally {
      busy.value = false;
    }
  }

  // --- Rename ---
  const editingId = ref("");
  const editingName = ref("");

  function startRename(category: CategoryDto) {
    editingId.value = category.id;
    editingName.value = category.name;
  }

  async function saveRename() {
    busy.value = true;
    errorMessage.value = "";
    try {
      await api.updateCategory(editingId.value, { name: editingName.value.trim() });
      editingId.value = "";
      await refresh();
    } catch (e: any) {
      errorMessage.value = e?.statusMessage || "Couldn't rename that category.";
    } finally {
      busy.value = false;
    }
  }

  // --- Reorder ---
  async function move(category: CategoryDto, direction: -1 | 1) {
    const siblings = (categories.value ?? [])
      .filter((c) => c.type === category.type && !c.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((c) => c.id === category.id);
    const swapWith = siblings[index + direction];
    if (!swapWith) return;

    busy.value = true;
    try {
      // Swap the two sortOrder values rather than renumbering the whole list.
      await Promise.all([
        api.updateCategory(category.id, { sortOrder: swapWith.sortOrder }),
        api.updateCategory(swapWith.id, { sortOrder: category.sortOrder }),
      ]);
      await refresh();
    } finally {
      busy.value = false;
    }
  }

  // --- Archive / delete ---
  async function setArchived(category: CategoryDto, archived: boolean) {
    busy.value = true;
    errorMessage.value = "";
    try {
      await api.updateCategory(category.id, { archived });
      await refresh();
    } finally {
      busy.value = false;
    }
  }

  /**
   * Try a real delete first; the API refuses with 409 when the category has
   * history, and we offer archiving instead rather than destroying entries.
   */
  async function removeCategory(category: CategoryDto) {
    busy.value = true;
    errorMessage.value = "";
    try {
      await api.deleteCategory(category.id);
      await refresh();
    } catch (e: any) {
      if (e?.statusCode === 409) {
        const count = e?.data?.data?.transactionCount ?? e?.data?.transactionCount;
        errorMessage.value =
          `"${category.name}" is used by ${count} entr${count === 1 ? "y" : "ies"}, ` +
          `so it can't be deleted. Archive it instead — it disappears from the ` +
          `pickers but its history stays intact.`;
      } else {
        errorMessage.value = e?.statusMessage || "Couldn't delete that category.";
      }
    } finally {
      busy.value = false;
    }
  }
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-bold">Categories</h1>

    <div v-if="errorMessage" role="alert" class="alert alert-warning">
      <span>{{ errorMessage }}</span>
      <button class="btn btn-xs btn-ghost" @click="errorMessage = ''">Dismiss</button>
    </div>

    <!-- Add -->
    <div class="bg-base-200 rounded-box p-3 space-y-3">
      <h2 class="font-semibold">Add a category</h2>
      <input
        v-model="newName"
        type="text"
        placeholder="Category name"
        class="input input-bordered w-full"
        @keyup.enter="addCategory"
      />
      <div role="tablist" class="tabs tabs-box">
        <button
          v-for="type in (['expense', 'income', 'transfer'] as CategoryType[])"
          :key="type"
          role="tab"
          class="tab"
          :class="{ 'tab-active': newType === type }"
          @click="newType = type"
        >
          {{ type === "transfer" ? "Saving" : type === "income" ? "Income" : "Expense" }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="icon in ICON_CHOICES"
          :key="icon"
          class="btn btn-sm btn-square"
          :class="newIcon === icon ? 'btn-primary' : 'btn-ghost bg-base-100'"
          @click="newIcon = icon"
        >
          <Icon :name="icon" size="18" />
        </button>
      </div>
      <button class="btn btn-primary w-full" :disabled="busy || !newName.trim()" @click="addCategory">
        Add category
      </button>
    </div>

    <label class="label cursor-pointer justify-start gap-2">
      <input v-model="showArchived" type="checkbox" class="checkbox checkbox-sm" />
      <span class="label-text">Show archived</span>
    </label>

    <!-- Existing -->
    <div v-for="group in groups" :key="group.type" class="space-y-2">
      <h2 class="font-semibold">{{ group.label }}</h2>
      <p v-if="!group.items.length" class="text-sm opacity-60">None yet.</p>

      <div
        v-for="category in group.items"
        :key="category.id"
        class="bg-base-200 rounded-box p-3"
        :class="{ 'opacity-50': category.archivedAt }"
      >
        <div v-if="editingId === category.id" class="flex gap-2">
          <input
            v-model="editingName"
            class="input input-sm input-bordered flex-1"
            @keyup.enter="saveRename"
          />
          <button class="btn btn-sm btn-primary" :disabled="busy" @click="saveRename">
            Save
          </button>
          <button class="btn btn-sm btn-ghost" @click="editingId = ''">Cancel</button>
        </div>

        <div v-else class="flex items-center gap-2">
          <Icon :name="category.icon || 'tabler:point'" size="20" />
          <span class="flex-1 truncate">
            {{ category.name }}
            <span v-if="category.archivedAt" class="text-xs opacity-60">(archived)</span>
          </span>

          <div class="flex items-center gap-1">
            <template v-if="!category.archivedAt">
              <button class="btn btn-ghost btn-xs btn-square" :disabled="busy" aria-label="Move up" @click="move(category, -1)">
                <Icon name="tabler:chevron-up" size="16" />
              </button>
              <button class="btn btn-ghost btn-xs btn-square" :disabled="busy" aria-label="Move down" @click="move(category, 1)">
                <Icon name="tabler:chevron-down" size="16" />
              </button>
              <button class="btn btn-ghost btn-xs btn-square" aria-label="Rename" @click="startRename(category)">
                <Icon name="tabler:pencil" size="16" />
              </button>
              <button class="btn btn-ghost btn-xs btn-square" :disabled="busy" aria-label="Archive" @click="setArchived(category, true)">
                <Icon name="tabler:archive" size="16" />
              </button>
              <button class="btn btn-ghost btn-xs btn-square text-error" :disabled="busy" aria-label="Delete" @click="removeCategory(category)">
                <Icon name="tabler:trash" size="16" />
              </button>
            </template>
            <button v-else class="btn btn-ghost btn-xs" :disabled="busy" @click="setArchived(category, false)">
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
