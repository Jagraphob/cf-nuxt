<script lang="ts" setup>
  const route = useRoute();

  const tabs = [
    { to: "/family-accounting", label: "Home", icon: "tabler:home", exact: true },
    { to: "/family-accounting/transactions", label: "History", icon: "tabler:list" },
    { to: "/family-accounting/new", label: "Add", icon: "tabler:circle-plus" },
    { to: "/family-accounting/analysis", label: "Analysis", icon: "tabler:chart-pie" },
    { to: "/family-accounting/categories", label: "Categories", icon: "tabler:tags" },
  ];

  function isActive(tab: (typeof tabs)[number]) {
    return tab.exact ? route.path === tab.to : route.path.startsWith(tab.to);
  }
</script>

<template>
  <!-- DaisyUI v5 `dock` already pads for env(safe-area-inset-bottom), so it sits
       clear of the iOS home indicator on its own. -->
  <div class="dock dock-sm bg-base-200 border-t border-base-300">
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      :class="{ 'dock-active': isActive(tab) }"
    >
      <Icon :name="tab.icon" size="20" />
      <span class="dock-label">{{ tab.label }}</span>
    </NuxtLink>
  </div>
</template>
