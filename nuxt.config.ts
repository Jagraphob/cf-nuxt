import tailwindcss from "@tailwindcss/vite";
import "./lib/env";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: "cloudflare_module",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  modules: [
    "nitro-cloudflare-dev",
    "@nuxt/icon",
    "@nuxtjs/color-mode"
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  colorMode: {
    dataValue: "theme"
  }
})