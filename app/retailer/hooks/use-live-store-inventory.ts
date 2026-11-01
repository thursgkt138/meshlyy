"use client";
import {useEffect} from "react";
import {supabase} from "../catalog/use-retailer-store";
/** Subscribe to inventory invalidations. Always refetch authoritative rows on notification. */
export function useLiveStoreInventory(storeId:string|null,refresh:()=>void){
 useEffect(()=>{
  if(!supabase||!storeId)return;
  const channel=supabase.channel("meshlyy-inventory-"+storeId)
   .on("postgres_changes",{event:"*",schema:"public",table:"store_inventory",filter:"store_id=eq."+storeId},()=>refresh()).subscribe();
  const onFocus=()=>refresh();
  const onVisible=()=>{if(document.visibilityState==="visible")refresh();};
  window.addEventListener("focus",onFocus);
  document.addEventListener("visibilitychange",onVisible);
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")refresh();},15000);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onVisible);void supabase!.removeChannel(channel);};
 },[storeId,refresh]);
}
