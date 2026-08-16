<script lang="ts" setup>
  import type { Tool } from "~/lib/tools";

  defineProps<{ tool: Tool }>();
</script>

<template>
  <NuxtLink
    :to="tool.to"
    class="card bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
  >
    <div class="card-body">
      <h2 class="card-title">
        <Icon :name="tool.icon" size="24" />
        {{ tool.name }}
      </h2>
      <p class="opacity-70">{{ tool.description }}</p>
    </div>
  </NuxtLink>
</template>
