<script lang="ts" setup>
  const colorMode = useColorMode();
  const isDark = computed({
    get() {
      return colorMode.value === "dark";
    },
    set(value:string) {
      colorMode.preference = value ? "dark" : "light";
    }
  });
</script>

<template>
  <label class="swap swap-rotate mx-4">
    <!-- this hidden checkbox controls the state -->
    <input v-model="isDark" type="checkbox" />

    <!-- sun icon -->
    <Icon name="tabler:sun" size="24" class="swap-on"/>

    <!-- moon icon -->
    <Icon name="tabler:moon" size="24" class="swap-off"/>
  </label>
</template>