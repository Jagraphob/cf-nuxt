<script lang="ts" setup>
  /** Emits a {from, to} range; `undefined` on either side means unbounded. */
  const model = defineModel<{ from?: string; to?: string }>({ required: true });

  const { presets } = useDateRanges();
  const active = ref<string>("this-month");
  const custom = ref(false);

  function choose(key: string) {
    active.value = key;
    custom.value = false;
    const preset = presets.find((p) => p.key === key);
    if (preset) model.value = preset.range();
  }

  function openCustom() {
    active.value = "custom";
    custom.value = true;
  }
</script>

<template>
  <div class="px-4 py-3 space-y-3">
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="preset in presets"
        :key="preset.key"
        class="btn btn-sm shrink-0"
        :class="active === preset.key ? 'btn-primary' : 'btn-ghost bg-base-200'"
        @click="choose(preset.key)"
      >
        {{ preset.label }}
      </button>
      <button
        class="btn btn-sm shrink-0"
        :class="active === 'custom' ? 'btn-primary' : 'btn-ghost bg-base-200'"
        @click="openCustom"
      >
        Custom
      </button>
    </div>

    <div v-if="custom" class="flex items-center gap-2">
      <input
        v-model="model.from"
        type="date"
        class="input input-sm input-bordered flex-1"
        aria-label="From date"
      />
      <span class="opacity-60 text-sm">to</span>
      <input
        v-model="model.to"
        type="date"
        class="input input-sm input-bordered flex-1"
        aria-label="To date"
      />
    </div>
  </div>
</template>
