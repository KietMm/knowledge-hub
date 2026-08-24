import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // tsconfigPaths cho phép test import bằng alias "@/lib/..." giống code app.
  plugins: [tsconfigPaths()],
  test: {
    // Tầng dữ liệu chạy trên Node (fs), không cần jsdom.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
