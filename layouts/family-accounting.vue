<template>
  <div class="min-h-screen bg-base-100">
    <AppNavBar />
    <!-- Bottom padding clears the fixed dock so the last row is never hidden. -->
    <main class="pb-28 max-w-3xl mx-auto">
      <slot />
    </main>
    <FamilyAccountingTabBar />
  </div>
</template>
