<script lang="ts" setup>
  import { tools } from "~/lib/tools";

  const { loggedIn } = useUserSession();
  const route = useRoute();
  const unauthorized = computed(() => route.query.error === "unauthorized");
</script>

<template>
  <div v-if="!loggedIn" class="flex flex-col justify-center items-center min-h-[60vh] gap-4">
    <div v-if="unauthorized" role="alert" class="alert alert-error max-w-sm">
      <span>That Google account isn't authorized to sign in.</span>
    </div>
    <h1 class="text-4xl font-bold">Nothing to see here</h1>
  </div>

  <div v-else class="p-4 sm:p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Tools</h1>
    <div class="grid gap-4 sm:grid-cols-2">
      <AppToolCard v-for="tool in tools" :key="tool.to" :tool="tool" />
    </div>
  </div>
</template>
