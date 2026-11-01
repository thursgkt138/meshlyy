"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import imageReferences from "../../../meshlyy-source-image-references.json";
import {useRetailerStore,supabase} from "../catalog/use-retailer-store";
type Reservation={id:string;store_id:string;status:string;requested_at:string;accepted_at:string|null;expires_at:string|null;pickup_minutes:number};
type Item={reservation_id:string;product_id:string;quantity:number;price_at_request:number};
type Product={id:string;name:string;category:string;packSize:string|null};
const productById=new Map((catalog as Product[]).map(p=>[p.id,p]));
const sourceImages=imageReferences as Record<string,{url:string}>;
const productImage=(p?:Product)=>p?sourceImages[p.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()]?.url:null;
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
 const [statusFilter,setStatusFilter]=useState("active");
 useEffect(()=>{const status=new URLSearchParams(window.location.search).get("status");if(status&&["all","requested","accepted","completed","rejected","expired"].includes(status)){setStatusFilter(status);setTab(status==="requested"||status==="accepted"?"active":"history");}},[]);
 const [codes,setCodes]=useState<Record<string,string>>({});
 const [codeErrors,setCodeErrors]=useState<Record<string,string>>({});
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
 useEffect(()=>{if(!store.storeId)return;const timer=setInterval(()=>{void refresh();},10000);return ()=>clearInterval(timer);},[store.storeId,refresh]);
 useEffect(()=>{
   if(!supabase||!store.storeId)return;
   const client=supabase;
   const channel=client.channel("retailer-orders-"+store.storeId).on("postgres_changes",{event:"*",schema:"public",table:"pickup_reservations",filter:"store_id=eq."+store.storeId},()=>{void refresh();}).subscribe();
   return ()=>{void client.removeChannel(channel);};
 },[store.storeId,refresh]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(t);},[]);
 const action=async(id:string,type:"accept"|"reject"|"expire")=>{
   if(!supabase)return;
   setBusy(id);setError("");
   const r=await supabase.rpc("retailer_reservation_action",{p_reservation_id:id,p_action:type});
   if(r.error)setError(r.error.message);
   await refresh();setBusy("");
 };
 const complete=async(id:string)=>{
   if(!supabase)return;
   const code=(codes[id]||"").trim();
   if(!/^[0-9]{6}$/.test(code)){setError("Enter the customer's six-digit pickup code.");return;}
   setBusy(id);setError("");setCodeErrors(old=>({...old,[id]:""}));
   const result=await supabase.rpc("complete_pickup",{p_reservation_id:id,p_code:code});
   if(result.error)setCodeErrors(old=>({...old,[id]:result.error.message}));
   else if(result.data!=="completed")setCodeErrors(old=>({...old,[id]:result.data==="incorrect_code"?"Incorrect code. Please verify with the customer.":"Unable to complete pickup."}));
   else{setCodes(old=>({...old,[id]:""}));await refresh();}
   setBusy("");
 };
 const filtered=orders.filter(o=>statusFilter==="all"?true:statusFilter==="active"?["requested","accepted"].includes(o.status):statusFilter==="history"?!["requested","accepted"].includes(o.status):o.status===statusFilter);
 return <main style={{background:"#f7faf7",minHeight:"100vh",color:"#102f30",fontFamily:"Arial,sans-serif",padding:"30px max(20px,calc((100vw - 1120px)/2))"}}>
   <nav style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}><Link href="/retailer/dashboard" style={{color:"#146858"}}>← Dashboard</Link><Link href="/retailer/catalog" style={{color:"#146858"}}>Master catalogue</Link></nav>
   <p style={{fontSize:12,letterSpacing:3,color:"#54877a",marginTop:38}}>MESHLYY / RETAILER STUDIO</p>
   <h1 style={{fontSize:"clamp(32px,5vw,50px)",margin:"8px 0"}}>Pickup reservations.</h1>
   <p style={{color:"#587a70",lineHeight:1.6}}>Review requests, reserve stock on acceptance and manage collection windows. Pickup only — no delivery.</p>
   <div style={{...card,margin:"22px 0",background:"#edf6f0"}}><strong>Reservation system preview</strong><p style={{marginBottom:0,color:"#53776b"}}>Consumer pickup requests are now connected. Verified pickup completion and automated server-side expiry are still required before launch.</p></div>
   {store.loading?<p>Loading your shop…</p>:store.error?<p role="alert">{store.error}</p>:!store.user?<div style={card}>Please <Link href="/retailer/catalog">sign in</Link> to view your shop reservations.</div>:!store.storeId?<div style={card}>Please <Link href="/retailer/catalog">create your shop</Link> first.</div>:<>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:20}}><strong>{store.storeName}</strong><button style={btn} onClick={()=>void refresh()}>Refresh orders</button></div>
     <div style={{display:"flex",gap:10,marginBottom:20}}><button style={{...btn,background:tab==="active"?"#143e38":"#e6f0e9",color:tab==="active"?"#fff":"#143e38"}} onClick={()=>{setTab("active");setStatusFilter("active");}}>Open requests ({orders.filter(o=>["requested","accepted"].includes(o.status)).length})</button><button style={{...btn,background:tab==="history"?"#143e38":"#e6f0e9",color:tab==="history"?"#fff":"#143e38"}} onClick={()=>{setTab("history");setStatusFilter("history");}}>History ({orders.filter(o=>!["requested","accepted"].includes(o.status)).length})</button></div>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>{(["all","requested","accepted","completed","rejected","expired"] as const).map(status=><button key={status} type="button" onClick={()=>{setStatusFilter(status);setTab(status==="requested"||status==="accepted"?"active":"history");}} style={{...btn,padding:"8px 12px",fontSize:12,background:statusFilter===status?"#143e38":"#e6f0e9",color:statusFilter===status?"white":"#143e38",textTransform:"capitalize"}}>{status==="all"?"All orders":status} ({status==="all"?orders.length:orders.filter(o=>o.status===status).length})</button>)}</div>
     {error&&<p role="alert" style={{color:"#b33b31"}}>{error}</p>}
     <div style={{display:"grid",gap:18}}>{filtered.map(o=>{
       const lines=items.filter(i=>i.reservation_id===o.id);
       const remaining=o.expires_at?Math.max(0,Math.ceil((new Date(o.expires_at).getTime()-now)/1000)):null;
       const total=lines.reduce((sum,i)=>sum+Number(i.price_at_request)*i.quantity,0);
       const units=lines.reduce((sum,i)=>sum+i.quantity,0);
       const isPending=o.status==="requested";
       const isAccepted=o.status==="accepted";
       const statusColor=isPending?"#94621d":isAccepted?"#166d54":"#677c72";
       return <article key={o.id} style={{...card,padding:0,overflow:"hidden",boxShadow:"0 10px 28px rgba(21,65,50,.035)"}}>
         <div style={{padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",borderBottom:"1px solid #e7efea",background:"#fcfdfb"}}>
           <div><div style={{fontSize:11,color:"#628a7c",fontWeight:700,letterSpacing:1.5,marginBottom:7}}>PICKUP ORDER</div><strong style={{fontSize:21}}>#{o.id.slice(0,8).toUpperCase()}</strong><div style={{fontSize:12,color:"#6e887c",marginTop:5}}>{new Date(o.requested_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})} · {units} {units===1?"item":"items"}</div></div>
           <span style={{fontSize:12,fontWeight:700,borderRadius:99,padding:"9px 13px",color:statusColor,background:isPending?"#fff4df":isAccepted?"#e7f6ed":"#eff3f0",textTransform:"capitalize"}}>● {o.status}</span>
         </div>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,310px),1fr))",gap:0}}>
           <div style={{padding:"6px 24px 14px",minWidth:0}}>
             {lines.map((i,index)=>{const p=productById.get(i.product_id);const image=productImage(p);return <div key={i.product_id} style={{display:"flex",gap:14,alignItems:"center",padding:"15px 0",borderBottom:index===lines.length-1?"none":"1px solid #edf2ee"}}>
               <div style={{width:76,height:80,flex:"0 0 76px",borderRadius:11,background:"#f0f6f1",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{image?<img src={image} alt={p?.name||"Product"} loading="lazy" referrerPolicy="no-referrer" style={{display:"block",width:"100%",height:"100%",objectFit:"contain",padding:6,boxSizing:"border-box"}}/>:<span style={{fontSize:10,color:"#749084",textAlign:"center"}}>No image</span>}</div>
               <div style={{flex:1,minWidth:0}}><strong style={{display:"block",fontSize:14,lineHeight:1.4,overflowWrap:"anywhere"}}>{p?.name||"Unknown catalogue product"}</strong><div style={{fontSize:12,color:"#6d887c",marginTop:5}}>{p?.packSize||p?.category||"Product"} · Qty {i.quantity}</div><div style={{fontSize:12,color:"#70887d",marginTop:5}}>{fmt(Number(i.price_at_request))} each</div></div>
               <strong style={{fontSize:15,whiteSpace:"nowrap"}}>{fmt(Number(i.price_at_request)*i.quantity)}</strong>
             </div>;})}
           </div>
           <aside style={{background:"#f5faf6",borderLeft:"1px solid #e5eee7",padding:24,display:"flex",flexDirection:"column",gap:16}}>
             <div><div style={{fontSize:11,letterSpacing:1.4,color:"#618577",fontWeight:700}}>ORDER SUMMARY</div><div style={{display:"flex",justifyContent:"space-between",marginTop:16,fontSize:14}}><span style={{color:"#688277"}}>Items ({units})</span><strong>{fmt(total)}</strong></div><div style={{display:"flex",justifyContent:"space-between",marginTop:11,fontSize:14}}><span style={{color:"#688277"}}>Pickup</span><strong style={{color:"#197354"}}>Free</strong></div><div style={{borderTop:"1px dashed #cbded1",paddingTop:16,marginTop:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong>Total</strong><strong style={{fontSize:25}}>{fmt(total)}</strong></div></div>
             {isPending&&<><p style={{fontSize:12,color:"#6b867a",lineHeight:1.6,margin:0}}>Accept only if every item is available. Stock is reserved when you accept.</p><button disabled={busy===o.id} onClick={()=>void action(o.id,"accept")} style={{...btn,padding:"15px 14px",width:"100%",opacity:busy===o.id?.6:1}}>{busy===o.id?"Processing…":"✓ Accept & reserve stock"}</button><button disabled={busy===o.id} onClick={()=>void action(o.id,"reject")} style={{...btn,background:"#f3e9e6",color:"#904536",width:"100%"}}>Reject request</button></>}
             {isAccepted&&<><div style={{background:"#e4f4e9",borderRadius:12,padding:15}}><div style={{fontSize:12,color:"#3d7965",fontWeight:700}}>PICKUP WINDOW</div><strong style={{fontSize:25,color:remaining===0?"#ad3d31":"#155d48",display:"block",marginTop:6}}>{remaining===0?"Time elapsed":`${Math.floor((remaining||0)/60)}:${String((remaining||0)%60).padStart(2,"0")}`}</strong><p style={{fontSize:12,color:"#618273",margin:"7px 0 0"}}>Awaiting verified collection workflow</p></div>{remaining!==null&&remaining>0&&<div style={{background:"white",border:"1px solid #d4e6da",borderRadius:12,padding:15}}><label htmlFor={"code-"+o.id} style={{fontSize:12,fontWeight:700,display:"block",marginBottom:9}}>Customer pickup code</label><input id={"code-"+o.id} type="text" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="6-digit code" value={codes[o.id]||""} onChange={e=>{setCodes(old=>({...old,[o.id]:e.target.value.replace(/[^0-9]/g,"").slice(0,6)}));setCodeErrors(old=>({...old,[o.id]:""}));}} style={{width:"100%",padding:"12px",border:"1px solid #cbded2",borderRadius:9,fontSize:18,letterSpacing:3,boxSizing:"border-box"}}/><button type="button" disabled={busy===o.id} onClick={()=>void complete(o.id)} style={{...btn,width:"100%",marginTop:10,opacity:busy===o.id?.6:1}}>{busy===o.id?"Verifying…":"Verify & complete pickup"}</button>{codeErrors[o.id]&&<p role="alert" style={{fontSize:12,color:"#b33b31",margin:"9px 0 0"}}>{codeErrors[o.id]}</p>}<p style={{fontSize:11,color:"#718b7f",lineHeight:1.5}}>Enter the six digits shown on the customer’s accepted reservation. Only hand over items after successful verification.</p></div>}{remaining===0&&<button disabled={busy===o.id} onClick={()=>void action(o.id,"expire")} style={btn}>Expire & release stock</button>}</>}
             {!isPending&&!isAccepted&&<p style={{fontSize:13,color:"#6a8579",margin:0}}>This reservation is in your order history.</p>}
           </aside>
         </div>
       </article>;
     })}</div>
     {!filtered.length&&<div style={{...card,textAlign:"center",padding:45,color:"#678479"}}>{tab==="active"?"No pickup requests yet.":"No reservation history yet."}</div>}
   </>}
 </main>;
}
