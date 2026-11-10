import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project from /game/.
  // Keep the root path when running the local development server.
  base: process.env.GITHUB_ACTIONS ? '/game/' : '/',
  server: {
    host: '0.0.0.0'
  }
});
