import {precacheShell} from "./scripts/precache-shell";
import { defineConfig } from "vite";
import { localTts } from "./scripts/local-tts-plugin";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  resolve:{alias:process.env.CHAMELEON_PROFILE === "1"?{"react-dom/client":"react-dom/profiling"}:{}},
  server: { watch: { ignored: ["**/public/audio/**", "**/data/**", "**/.venv/**"] }, proxy: { "/api/tts": "http://127.0.0.1:8791" } },
  preview: { proxy: { "/api/tts": "http://127.0.0.1:8791" } },
  build: {
    manifest:true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "motion-vendor": ["motion/react"],
          "learning-vendor": ["dexie", "ts-fsrs"],
        },
      },
    },
  },
  plugins: [
    react(),
    localTts(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "CHAMELEON BG — Language Academy",
        short_name: "Chameleon BG",
        description: "Академия болгарского языка",
        lang: "ru",
        start_url: "/",
        display: "standalone",
        background_color: "#101014",
        theme_color: "#101014",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,webp,woff2,ttf}"],
        globIgnores: ["audio/**", "content/**", "images/**"],
        manifestTransforms:[precacheShell],
        runtimeCaching: [
          {urlPattern:/\/assets\/.*\.(?:js|css)$/,handler:"CacheFirst",options:{cacheName:"chameleon-code-v1",expiration:{maxEntries:100},cacheableResponse:{statuses:[200]}}},
          { urlPattern: /\/grammar\/.*\.json$/, handler: "StaleWhileRevalidate", options: { cacheName: "chameleon-grammar", expiration: {maxEntries:240}, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /\/images\/.*\.(?:jpg|png|webp)$/, handler: "CacheFirst", options: { cacheName: "chameleon-photos-runtime-v2", expiration: { maxEntries: 160, maxAgeSeconds: 60*60*24*30 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /\/audio\/lookup\/.*\.json$/, handler: "NetworkFirst", options: { cacheName: "chameleon-audio-lookup-v2", networkTimeoutSeconds: 2, expiration: {maxEntries:32,maxAgeSeconds:60*60*24*30}, cacheableResponse: { statuses: [200] } } },
          {
            urlPattern: /\/content\/manifest\.json$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "chameleon-catalog",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /\/content\/.*\.json(?:\?.*)?$/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "chameleon-audio-playback-v2",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 256, maxAgeSeconds: 60*60*24*30 },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
      },
    }),
  ],
});
