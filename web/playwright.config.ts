import { defineConfig, devices } from '@playwright/test'

// Core flows in demo mode (no sign-in or Supabase), so they run anywhere without secrets.
// Locally this uses the installed Edge, so no browser download; CI installs Playwright's Chromium.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://localhost:5180', ...devices['Pixel 7'], ...(process.env.CI ? {} : { channel: 'msedge' }) },
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
    // Env already set wins over .env files in Vite, so blanking these forces demo mode.
    env: { VITE_SUPABASE_URL: '', VITE_WEB3AUTH_CLIENT_ID: '' },
  },
})
