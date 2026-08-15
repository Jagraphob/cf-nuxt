<script lang="ts" setup>
  const { loggedIn, user, clear } = useUserSession();

  async function logout() {
    await clear();
    await navigateTo("/");
  }
</script>

<template>
  <a v-if="!loggedIn" href="/auth/google" class="btn btn-primary btn-sm mx-2">
    <Icon name="tabler:brand-google" size="18" />
    Sign in
  </a>
  <div v-else class="dropdown dropdown-end mx-2">
    <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
      <div class="w-10 rounded-full">
        <img v-if="user?.avatar" :src="user.avatar" :alt="user?.name" />
        <div v-else class="bg-neutral text-neutral-content flex items-center justify-center w-full h-full">
          {{ user?.name?.[0] }}
        </div>
      </div>
    </div>
    <ul tabindex="0" class="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
      <li><NuxtLink to="/profile">Profile</NuxtLink></li>
      <div class="divider my-0"></div>
      <li><a @click="logout">Logout</a></li>
    </ul>
  </div>
</template>
