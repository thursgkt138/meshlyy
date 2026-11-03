// @ts-nocheck — manual, destructive E2E against an explicitly dedicated test store.
// Never add this file to the push-triggered browser-smoke suite.
import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";

const required=["E2E_SUPABASE_URL","E2E_SUPABASE_ANON_KEY","E2E_RETAILER_EMAIL","E2E_RETAILER_PASSWORD","E2E_TEST_STORE_ID","E2E_TEST_PRODUCT_ID"];
const missing=required.filter(k=>!process.env[k]);
test.skip(missing.length>0,"Missing local E2E configuration: "+missing.join(", "));
const url=process.env.E2E_SUPABASE_URL||"";
const key=process.env.E2E_SUPABASE_ANON_KEY||"";
const storeId=process.env.E2E_TEST_STORE_ID||"";
const sku=process.env.E2E_TEST_PRODUCT_ID||"";
const email=process.env.E2E_RETAILER_EMAIL||"";
const password=process.env.E2E_RETAILER_PASSWORD||"";
test.describe.configure({mode:"serial"});
test("dedicated retailer: voice draft, atomic hold, and sale",async({page})=>{
  test.setTimeout(90000);
  if(process.env.E2E_ALLOW_SALES!=="YES")test.skip(true,"Explicit E2E_ALLOW_SALES=YES is required");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await client.auth.signInWithPassword({email,password});
  expect(login.error,"Test retailer sign-in").toBeNull();
  const owner=login.data.user?.id;
  expect(owner).toBeTruthy();
  const owned=await client.from("retailer_stores").select("id").eq("id",storeId).eq("owner_id",owner).single();
  expect(owned.error,"Store must belong to the dedicated test retailer").toBeNull();
  // The current retailer hook selects the oldest store for this account.
  const first=await client.from("retailer_stores").select("id").eq("owner_id",owner).order("created_at",{ascending:true}).limit(1).single();
  expect(first.data?.id,"Dedicated store must be the first store for this account").toBe(storeId);
  const initial=await client.from("store_inventory").select("stock,price,active").eq("store_id",storeId).eq("product_id",sku).single();
  expect(initial.error).toBeNull();
  expect(initial.data?.active).toBe(true);
  expect(initial.data?.stock).toBeGreaterThanOrEqual(1);
  const before=initial.data.stock;
  const salesBefore=await client.from("pos_sales").select("id").eq("store_id",storeId);
  expect(salesBefore.error).toBeNull();
  // Use real login UI; no auth bypass or privileged key.
  await page.goto("/retailer/login");
  await page.getByRole("textbox",{name:"Email"}).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button",{name:/Sign in/}).click();
  await expect(page).toHaveURL(/\/retailer\/onboarding/,{timeout:20000});
  const draft=encodeURIComponent(JSON.stringify([{id:sku,quantity:1}]));
  await page.goto("/retailer/pos?voiceDraft="+draft);
  await expect(page.getByRole("heading",{name:/Sell in store/})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Voice bill — review before adding"})).toBeVisible();
  await page.getByRole("button",{name:"Add to POS cart"}).click();
  await expect(page.getByText("Voice items added to the held bill.",{exact:false})).toBeVisible();
  await expect(page.getByRole("button",{name:/Complete sale/})).toBeEnabled();
  const held=await client.from("store_inventory").select("stock").eq("store_id",storeId).eq("product_id",sku).single();
  expect(held.error).toBeNull();
  expect(held.data?.stock).toBe(before-1);
  await page.getByRole("button",{name:/Complete sale/}).click();
  await expect.poll(async()=>{
    const r=await client.from("pos_sales").select("id").eq("store_id",storeId);
    if(r.error)throw r.error;
    return r.data?.length||0;
  },{timeout:20000}).toBe((salesBefore.data?.length||0)+1);
  const after=await client.from("store_inventory").select("stock").eq("store_id",storeId).eq("product_id",sku).single();
  expect(after.error).toBeNull();
  expect(after.data?.stock).toBe(before-1);
  await client.auth.signOut();
});
