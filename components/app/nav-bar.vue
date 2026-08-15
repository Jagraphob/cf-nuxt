<template>
  <div class="navbar bg-base-300">
    <div class="navbar-start">
      <NuxtLink to="/" class="btn btn-ghost text-xl">
        Tools <Icon name="tabler:hammer" />
      </NuxtLink>
    </div>
    <div class="navbar-end">
      <AppThemeToggle />
      <AppAuthButton />
    </div>
  </div>
</template>
