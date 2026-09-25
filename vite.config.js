import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` makes the production build work from any folder, so the app
// can be hosted statically or opened locally and run fully offline.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
