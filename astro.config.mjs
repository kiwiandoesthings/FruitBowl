// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone'
  }),
  server: {
	host: "fruitbowlforums.test.kiwiandoesthings.place",
	port: 4321
  },
  output: "server"
});