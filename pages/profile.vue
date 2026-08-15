<script lang="ts" setup>
  definePageMeta({ middleware: ["auth"] });

  const { user } = useUserSession();
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-8">
    <div class="w-24 rounded-full overflow-hidden">
      <img v-if="user?.avatar" :src="user.avatar" :alt="user?.name" />
    </div>
    <h1 class="text-2xl font-bold">{{ user?.name }}</h1>
    <p class="opacity-70">{{ user?.email }}</p>
  </div>
</template>
