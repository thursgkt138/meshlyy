"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useRetailerStore,supabase} from "../catalog/use-retailer-store";
type Reservation={id:string;store_id:string;status:string;requested_at:string;accepted_at:string|null;expires_at:string|null;pickup_minutes:number};
type Item={reservation_id:string;product_id:string;quantity:number;price_at_request:number};
const card:React.CSSProperties={border:"1px solid #d9e8e1",background:"#fff",borderRadius:18,padding:22};
const btn:React.CSSProperties={border:0,background:"#143e38",color:"#fff",padding:"11px 18px",borderRadius:10,cursor:"pointer",fontWeight:700};
const fmt=(n:number)=>"₹"+n.toLocaleString("en-IN",{maximumFractionDigits:2});
export default function RetailerOrders(){
 const store=useRetailerStore();
 const [orders,setOrders]=useState<Reservation[]>([]);
 const [items,setItems]=useState<Item[]>([]);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [now,setNow]=useState(Date.now());
 const [tab,setTab]=useState<"active"|"history">("active");
 const refresh=useCallback(async()=>{
   if(!supabase||!store.storeId)return;
   const result=await supabase.from("pickup_reservations").select("id,store_id,status,requested_at,accepted_at,expires_at,pickup_minutes").eq("store_id",store.storeId).order("requested_at",{ascending:false}).limit(100);
   if(result.error){setError(result.error.message);return;}
   const list=(result.data||[]) as Reservation[];
   setOrders(list);
   if(!list.length){setItems([]);return;}
   const lines=await supabase.from("pickup_reservation_items").select("reservation_id,product_id,quantity,price_at_request").in("reservation_id",list.map(o=>o.id));
   if(lines.error)setError(lines.error.message);else setItems((lines.data||[]) as Item[]);
 },[store.storeId]);
 useEffect(()=>{void refresh();},[refresh]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(t);},[]);
 const action=async(id:string,type:"accept"|"reject"|"expire")=>{
   if(!supabase)return;
   setBusy(id);setError("");
   const r=await supabase.rpc("retailer_reservation_action",{p_reservation_id:id,p_action:type});
   if(r.error)setError(r.error.message);
   await refresh();setBusy("");
 };
 const filtered=orders.filter(o=>tab==="active"?["requested","accepted"].includes(o.status):!["requested","accepted"].includes(o.status));
 return <main style={{background:"#f7faf7",minHeight:"100vh",color:"#102f30",fontFamily:"Arial,sans-serif",padding:"30px max(20px,calc((100vw - 1120px)/2))"}}>
   <nav style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><Link href="/retailer/dashboard" style={{color:"#146858"}}>← Dashboard</Link><Link href="/retailer/catalog" style={{color:"#146858"}}>Master catalogue</Link></nav>
   <p style={{fontSize:12,letterSpacing:3,color:"#54877a",marginTop:38}}>MESHLYY / RETAILER STUDIO</p>
   <h1 style={{fontSize:"clamp(32px,5vw,50px)",margin:"8px 0"}}>Pickup reservations.</h1>
   <p style={{color:"#587a70",lineHeight:1.6}}>Review requests, reserve stock on acceptance and manage collection windows. Pickup only — no delivery.</p>
   <div style={{...card,margin:"22px 0",background:"#edf6f0"}}><strong>Reservation system preview</strong><p style={{marginBottom:0,color:"#53776b"}}>Consumer checkout and verified pickup completion are not connected yet. Orders appear here only when created by a future authorized consumer flow. Expiry currently requires retailer action; automated server-side expiry is required before launch.</p></div>
   {store.loading?<p>Loading your shop…</p>:store.error?<p role="alert">{store.error}</p>:!store.user?<div style={card}>Please <Link href="/retailer/catalog">sign in</Link> to view your shop reservations.</div>:!store.storeId?<div style={card}>Please <Link href="/retailer/catalog">create your shop</Link> first.</div>:<>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:20}}><strong>{store.storeName}</strong><button style={btn} onClick={()=>void refresh()}>Refresh orders</button></div>
     <div style={{display:"flex",gap:10,marginBottom:20}}><button style={{...btn,background:tab==="active"?"#143e38":"#e6f0e9",color:tab==="active"?"#fff":"#143e38"}} onClick={()=>setTab("active")}>Open requests ({orders.filter(o=>["requested","accepted"].includes(o.status)).length})</button><button style={{...btn,background:tab==="history"?"#143e38":"#e6f0e9",color:tab==="history"?"#fff":"#143e38"}} onClick={()=>setTab("history")}>History ({orders.filter(o=>!["requested","accepted"].includes(o.status)).length})</button></div>
     {error&&<p role="alert" style={{color:"#b33b31"}}>{error}</p>}
     <div style={{display:"grid",gap:14}}>{filtered.map(o=>{
       const lines=items.filter(i=>i.reservation_id===o.id);
       const remaining=o.expires_at?Math.max(0,Math.ceil((new Date(o.expires_at).getTime()-now)/1000)):null;
       return <article key={o.id} style={card}>
         <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:12,flexWrap:"wrap"}}><div><strong>Reservation #{o.id.slice(0,8).toUpperCase()}</strong><p style={{fontSize:12,color:"#6c827a",margin:"7px 0"}}>{new Date(o.requested_at).toLocaleString("en-IN")}</p></div><strong style={{color:o.status==="accepted"?"#187a5b":"#8b6c27",textTransform:"capitalize"}}>{o.status}</strong></div>
         <div style={{margin:"15px 0",borderTop:"1px solid #e3eee8",paddingTop:10}}>{lines.map(i=><p key={i.product_id} style={{margin:"8px 0"}}>{i.product_id} · Qty {i.quantity} · {fmt(Number(i.price_at_request)*i.quantity)}</p>)}<strong>Order value: {fmt(lines.reduce((s,i)=>s+Number(i.price_at_request)*i.quantity,0))}</strong></div>
         {o.status==="requested"&&<div style={{display:"flex",gap:10}}><button disabled={busy===o.id} onClick={()=>void action(o.id,"accept")} style={btn}>Accept & reserve stock</button><button disabled={busy===o.id} onClick={()=>void action(o.id,"reject")} style={{...btn,background:"#f1e7e4",color:"#873d32"}}>Reject</button></div>}
         {o.status==="accepted"&&<div><p style={{fontWeight:700,color:remaining===0?"#ad3d31":"#126a56"}}>{remaining===0?"Collection window ended":`Pickup time left: ${Math.floor((remaining||0)/60)}m ${String((remaining||0)%60).padStart(2,"0")}s`}</p>{remaining===0&&<button disabled={busy===o.id} onClick={()=>void action(o.id,"expire")} style={btn}>Expire & release stock</button>}</div>}
       </article>;
     })}</div>
     {!filtered.length&&<div style={{...card,textAlign:"center",padding:45,color:"#678479"}}>{tab==="active"?"No pickup requests yet.":"No reservation history yet."}</div>}
   </>}
 </main>;
}
