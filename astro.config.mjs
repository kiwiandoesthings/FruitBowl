// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import basicSsl from '@vitejs/plugin-basic-ssl';

import preact from '@astrojs/preact';

const isDev = process.env.NODE_ENV === 'development';

// https://astro.build/config
export default defineConfig({
  adapter: isDev ? node({ mode: 'standalone' }) : cloudflare(),
  server: {
    host: "fruitbowl.test.kiwiandoesthings.place",
    port: 4321
  },
  output: "server",
  vite: {
    server: {
      hmr: {
        protocol: 'wss',
        host: 'fruitbowl.test.kiwiandoesthings.place',
        port: 4321,
      },
    },
    plugins: [
      basicSsl()
    ]
  },
  integrations: [preact()]
});