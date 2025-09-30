<template>
  <div class="navbar bg-base-300">
    <div class="navbar-start">
      <NuxtLink to="/" class="btn btn-ghost text-xl">
        Tools <Icon name="tabler:hammer" />
      </NuxtLink>
    </div>
    <div class="navbar-end">
      <ul class="menu menu-horizontal px-1">
        <li>
          <details>
            <summary>Pages</summary>
            <ul class="bg-base-100 rounded-t-none p-2">
              <NuxtLink to="/travel-log">Travel Log</NuxtLink>
            </ul>
          </details>
        </li>
      </ul>
    </div>
  </div>
</template>
