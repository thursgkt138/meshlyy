"use client";
import { useEffect, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type StoreInventory = { productId: string; price: number; stock: number; active: boolean };
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export function useRetailerStore() {
  const [user,setUser] = useState<User|null>(null);
  const [storeId,setStoreId] = useState<string|null>(null);
  const [storeName,setStoreName] = useState("");
  const [items,setItems] = useState<StoreInventory[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(()=>{
    if(!supabase){setError("Supabase environment variables are missing. Restart the dev server after setting .env.local.");setLoading(false);return;}
    let alive=true;
    const load = async (u:User|null) => {
      if(!alive)return;
      setLoading(true);setError("");setUser(u);setStoreId(null);setItems([]);
      if(!u){setLoading(false);return;}
      const {data:stores,error:e}=await supabase!.from("retailer_stores").select("id,name").eq("owner_id",u.id).order("created_at",{ascending:true}).limit(1);
      if(!alive)return;
      if(e){setError(e.message);setLoading(false);return;}
      const store=stores?.[0];
      if(store){
        setStoreId(store.id);setStoreName(store.name);
        const {data:rows,error:ie}=await supabase!.from("store_inventory").select("product_id,price,stock,active").eq("store_id",store.id);
        if(!alive)return;
        if(ie)setError(ie.message);
        else setItems((rows||[]).map(r=>({productId:r.product_id,price:Number(r.price),stock:r.stock,active:r.active})));
      }
      setLoading(false);
    };
    supabase.auth.getUser().then(({data})=>load(data.user)).catch(e=>{if(alive){setError(String(e));setLoading(false);}});
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{void load(session?.user||null);});
    return ()=>{alive=false;listener.subscription.unsubscribe();};
  },[]);
  const signIn=async(email:string,password:string,register:boolean)=>{
    if(!supabase)return "Supabase is not configured";
    const r=register?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});
    if(r.error)return r.error.message;
    return register&&!r.data.session?"Check your email for the confirmation link, then sign in.":"";
  };
  const createStore=async(name:string,locality:string)=>{
    if(!supabase||!user)return "Sign in first";
    const {data,error:e}=await supabase.from("retailer_stores").insert({owner_id:user.id,name:name.trim(),locality:locality.trim()||null}).select("id,name").single();
    if(e)return e.message;
    setStoreId(data.id);setStoreName(data.name);setItems([]);return "";
  };
  const save=async(item:StoreInventory)=>{
    if(!supabase||!storeId)return "Create a store first";
    const {error:e}=await supabase.from("store_inventory").upsert({store_id:storeId,product_id:item.productId,price:item.price,stock:item.stock,active:item.active,updated_at:new Date().toISOString()},{onConflict:"store_id,product_id"});
    if(e)return e.message;
    setItems(old=>[...old.filter(x=>x.productId!==item.productId),item]);return "";
  };
  const remove=async(productId:string)=>{
    if(!supabase||!storeId)return "Create a store first";
    const {error:e}=await supabase.from("store_inventory").delete().eq("store_id",storeId).eq("product_id",productId);
    if(e)return e.message;
    setItems(old=>old.filter(x=>x.productId!==productId));return "";
  };
  return {user,storeId,storeName,items,loading,error,signIn,createStore,save,remove,signOut:()=>supabase?.auth.signOut()};
}
