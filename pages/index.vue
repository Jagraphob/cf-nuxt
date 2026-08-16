<script lang="ts" setup>
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
</template>
