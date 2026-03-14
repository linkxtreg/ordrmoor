/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ command }) => ({
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      '@supabase/supabase-js',
      'sonner',
      'lucide-react',
      'react-helmet-async',
      'clsx',
      'tailwind-merge',
    ],
    holdUntilCrawlEnd: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '/utils': path.resolve(__dirname, './utils'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: command === 'serve' ? {
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/app/App.tsx',
        './src/app/components/TenantLayout.tsx',
        './src/app/pages/CustomerMenuPage.tsx',
        './src/app/components/CustomerMenu.tsx',
      ],
    },
  } : undefined,
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (
            id.includes('node_modules/@radix-ui/') ||
            id.includes('node_modules/motion') ||
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/@emotion/') ||
            id.includes('node_modules/@mui/')
          ) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    process.env.ANALYZE === '1' && visualizer({ open: false, gzipSize: true, filename: 'dist/stats.html' }),
  ].filter(Boolean),
}))
