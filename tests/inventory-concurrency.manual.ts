import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Manual only: mutates a disposable Meshlyy test store; never run in CI.
test("POS and pickup compete for the last unit", async () => {
  const e = process.env;
  test.skip(e.E2E_ALLOW_CONCURRENCY !== "YES" || e.E2E_DISPOSABLE_STORE_CONFIRMED !== "YES", "Explicit opt-in required");
  const keys = ["E2E_SUPABASE_URL","E2E_SUPABASE_ANON_KEY","E2E_RETAILER_EMAIL","E2E_RETAILER_PASSWORD","E2E_CUSTOMER_EMAIL","E2E_CUSTOMER_PASSWORD","E2E_TEST_STORE_ID","E2E_TEST_PRODUCT_ID"];
  test.skip(keys.some(k => !e[k]), "Missing dedicated test configuration");
  const make = () => createClient(e.E2E_SUPABASE_URL!,e.E2E_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const pos = make(), buyer = make();
  const [a,b] = await Promise.all([
    pos.auth.signInWithPassword({email:e.E2E_RETAILER_EMAIL!,password:e.E2E_RETAILER_PASSWORD!}),
    buyer.auth.signInWithPassword({email:e.E2E_CUSTOMER_EMAIL!,password:e.E2E_CUSTOMER_PASSWORD!})
  ]);
  expect(a.error).toBeNull(); expect(b.error).toBeNull();
  expect(a.data.user?.id).not.toBe(b.data.user?.id);
  const store=e.E2E_TEST_STORE_ID!, sku=e.E2E_TEST_PRODUCT_ID!;
  const owner=await pos.from("retailer_stores").select("id").eq("id",store).eq("owner_id",a.data.user!.id).single();
  expect(owner.error).toBeNull();
  const stock=()=>pos.from("store_inventory").select("stock,active").eq("store_id",store).eq("product_id",sku).single();
  const before=await stock();
  expect(before.error).toBeNull(); expect(before.data?.active).toBe(true);
  expect(before.data?.stock,"Disposable SKU must have exactly one unit").toBe(1);
  const prior=await pos.rpc("my_pos_bill_hold",{p_store_id:store});
  expect(prior.error).toBeNull(); expect(prior.data).toHaveLength(0);
  const [p,c]=await Promise.all([
    pos.rpc("set_pos_bill_quantity",{p_store_id:store,p_product_id:sku,p_quantity:1}),
    buyer.rpc("request_pickup",{p_store_id:store,p_items:[{product_id:sku,quantity:1}]})
  ]);
  const after=await stock();
  console.log({posWon:!p.error,pickupWon:!c.error,posError:p.error?.message,pickupError:c.error?.message,hold:p.data,reservation:c.data,remaining:after.data?.stock});
  expect(after.error).toBeNull();
  expect(Number(!p.error)+Number(!c.error),"Exactly one request must succeed").toBe(1);
  expect(after.data?.stock).toBe(0);
  // Winning hold or pickup reservation requires explicit test-store cleanup.
});
