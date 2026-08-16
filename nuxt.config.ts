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
    "@nuxtjs/color-mode",
    "nuxt-auth-utils"
  ],
  vite: {
    plugins: [
      tailwindcss()
    ]
  },
  colorMode: {
    dataValue: "theme"
  },
  runtimeConfig: {
    session: { password: '' },
    oauth: { google: { clientId: '', clientSecret: '' } }
  },
  app: {
    head: {
      // Installable as a home-screen app. No service worker — offline entry was
      // explicitly out of scope, so there is no cache to go stale.
      link: [
        { rel: "manifest", href: "/manifest.webmanifest" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "icon", type: "image/svg+xml", href: "/icon.svg" }
      ],
      meta: [
        { name: "theme-color", content: "#4f46e5" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        { name: "apple-mobile-web-app-title", content: "Tools" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }
      ]
    }
  }
})