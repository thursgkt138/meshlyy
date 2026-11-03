import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests",
 testMatch:"*.browser.spec.ts",
 timeout:30_000,
 expect:{timeout:10_000},
 retries:process.env.CI?1:0,
 reporter:process.env.CI?"github":"list",
 use:{baseURL:"http://127.0.0.1:3100",trace:"retain-on-failure"},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
 webServer:{
  command:"npm run dev -- -p 3100 -H 127.0.0.1",
  url:"http://127.0.0.1:3100/retailer/assistant",
  reuseExistingServer:!process.env.CI,
  timeout:120_000,
  env:{NEXT_PUBLIC_SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:""}
 }
});
