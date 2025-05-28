<template>
  <nav class="container">
    <ul>
      <li>
        <NuxtLink to="/"><h1>Tool</h1></NuxtLink>
      </li>
    </ul>
    <ul>
      <li>
        <NuxtLink :to="{ name: 'planning-poker' }">Poker</NuxtLink>
        <NuxtLink :to="{ name: 'travel-log' }">Travel Log</NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
  a, a:visited, a:hover, a:active {
  color: inherit;
  text-decoration: none;
}
</style>