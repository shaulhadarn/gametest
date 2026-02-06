import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import path from 'path';

export default defineConfig({
  plugins: [glsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@models': path.resolve(__dirname, './src/models'),
      '@services': path.resolve(__dirname, './src/services'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@input': path.resolve(__dirname, './src/input'),
      '@ai': path.resolve(__dirname, './src/ai'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
