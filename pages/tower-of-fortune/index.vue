<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="max-w-2xl w-full">
      <div class="text-center mb-10">
        <h1 class="text-5xl font-bold mb-3">🗼 Tower of Fortune</h1>
        <p class="text-base-content/60 text-lg">
          Pick cards, climb the tower, and know when to walk away.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Quick Play -->
        <NuxtLink to="/tower-of-fortune/play" class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer border border-base-300 hover:border-primary">
          <div class="card-body items-center text-center">
            <Icon name="tabler:bolt" class="text-5xl text-primary mb-2" />
            <h2 class="card-title text-2xl">Quick Play</h2>
            <p class="text-base-content/60">
              Jump in anonymously. No limits, no pressure. Just pure luck.
            </p>
            <div class="badge badge-primary badge-outline mt-2">Unlimited plays</div>
          </div>
        </NuxtLink>

        <!-- Competitive (Phase 2) -->
        <div class="card bg-base-200 border border-base-300 opacity-50 cursor-not-allowed">
          <div class="card-body items-center text-center">
            <Icon name="tabler:trophy" class="text-5xl text-warning mb-2" />
            <h2 class="card-title text-2xl">Competitive</h2>
            <p class="text-base-content/60">
              Sign in with Google, play once a day, and climb the seasonal leaderboard.
            </p>
            <div class="badge badge-ghost mt-2">Coming soon</div>
          </div>
        </div>
      </div>

      <!-- Rules -->
      <div class="mt-10 card bg-base-200 border border-base-300">
        <div class="card-body">
          <h3 class="card-title text-lg mb-2">How to Play</h3>
          <ul class="list-disc list-inside space-y-1 text-base-content/70 text-sm">
            <li>Each round has 5 face-down cards: three <span class="text-green-500 font-semibold">+1</span>, one <span class="text-yellow-500 font-semibold">+2</span>, and one <span class="text-red-500 font-semibold">💀 skull</span></li>
            <li>Pick one card per round</li>
            <li>After round 1, you can cash out anytime to keep your score</li>
            <li>Hit the skull and you lose <em>everything</em></li>
            <li>How high will you climb?</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
