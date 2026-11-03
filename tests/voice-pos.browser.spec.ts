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
test("POS rejects forged or invalid voice draft in browser",async({page})=>{
 const draft=encodeURIComponent(JSON.stringify([{id:"not-in-catalog",quantity:2}]));
 await page.goto("/retailer/pos?voiceDraft="+draft);
 await expect(page.getByText("Voice draft was invalid. Please create the bill manually.")).toBeVisible();
 await expect(page).toHaveURL(/\/retailer\/pos$/);
});
test("POS rejects noninteger quantities in browser",async({page})=>{
 const draft=encodeURIComponent(JSON.stringify([{id:"not-in-catalog",quantity:1.5}]));
 await page.goto("/retailer/pos?voiceDraft="+draft);
 await expect(page.getByText("Voice draft was invalid. Please create the bill manually.")).toBeVisible();
});
