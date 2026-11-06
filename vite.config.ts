import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isVercel =
  typeof globalThis !== 'undefined' &&
  Boolean(
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VERCEL,
  );

export default defineConfig({
  plugins: [react()],
  base: isVercel ? '/' : './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
