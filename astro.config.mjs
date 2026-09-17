// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  server: {
    host: "fruitbowlforums.test.kiwiandoesthings.place",
    port: 4321
  },
  output: "server"
});