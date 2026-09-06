import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svelteTesting()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'zrender',
              test: /node_modules[\\/]zrender[\\/]/,
              priority: 20
            },
            {
              name: 'echarts',
              test: /node_modules[\\/]echarts[\\/]/,
              priority: 10
            }
          ]
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.test.{ts,svelte.ts}']
  }
});
