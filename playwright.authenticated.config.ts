// @ts-nocheck — opt-in only; never used by push-triggered CI.
import {defineConfig,devices} from "@playwright/test";
const url=process.env.E2E_SUPABASE_URL||"";
const key=process.env.E2E_SUPABASE_ANON_KEY||"";
export default defineConfig({
 testDir:"./tests",testMatch:"authenticated-pos.manual.ts",
 workers:1,retries:0,timeout:90000,reporter:"list",
 use:{baseURL:"http://127.0.0.1:3101",trace:"retain-on-failure"},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
 webServer:{command:"npm run dev -- -p 3101 -H 127.0.0.1",
 url:"http://127.0.0.1:3101/retailer/login",reuseExistingServer:false,timeout:120000,
 env:{NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key}}
});
