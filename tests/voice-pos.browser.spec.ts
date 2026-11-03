// @ts-nocheck — Playwright is an isolated CI-only dependency.
import {test,expect} from "@playwright/test";

// Browser smoke coverage of the actual Next.js routes, with no Supabase credentials.
// These tests deliberately never call checkout, holds, or live inventory RPCs.
test("retailer assistant renders and accepts a transcript safely without a store",async({page})=>{
 await page.goto("/retailer/assistant");
 await expect(page.getByRole("textbox",{name:"Ask Meshlyy"})).toBeVisible();
 await page.getByRole("textbox",{name:"Ask Meshlyy"}).fill("Ek dudh Char Ande");
 await page.getByRole("button",{name:"Send command"}).click();
 await expect(page.getByText("Review your voice basket")).toBeVisible();
 await expect(page.getByRole("spinbutton",{name:"Quantity for dudh"})).toHaveValue("1");
 await expect(page.getByRole("spinbutton",{name:"Quantity for ande"})).toHaveValue("4");
 await expect(page.getByRole("button",{name:/Review all 2 items in POS/})).toBeDisabled();
 await expect(page.getByText("No stock changed.",{exact:false}).first()).toBeVisible();
});
// With no Supabase credentials, POS is intentionally unauthenticated. The error
// banner is inside the authenticated section and cannot be asserted here.
// Invalid draft decoding is covered by scripts/test-voice-pos-e2e.cjs.
test("unauthenticated POS does not expose checkout for forged draft",async({page})=>{
 const draft=encodeURIComponent(JSON.stringify([{id:"not-in-catalog",quantity:2}]));
 await page.goto("/retailer/pos?voiceDraft="+draft);
 await expect(page.getByRole("heading",{name:/Sell in store/})).toBeVisible();
 await expect(page.locator(".pos-message")).toContainText("Sign in at");
 await expect(page.getByRole("button",{name:/Complete sale/})).toHaveCount(0);
 await expect(page).toHaveURL("http://127.0.0.1:3100/retailer/pos");
});
test("unauthenticated POS does not expose checkout for fractional draft",async({page})=>{
 const draft=encodeURIComponent(JSON.stringify([{id:"not-in-catalog",quantity:1.5}]));
 await page.goto("/retailer/pos?voiceDraft="+draft);
 await expect(page.locator(".pos-message")).toContainText("Sign in at");
 await expect(page.getByRole("button",{name:/Complete sale/})).toHaveCount(0);
});
