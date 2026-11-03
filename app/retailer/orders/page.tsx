"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import "./orders-studio.css";
import {ClipboardList,Clock3,CheckCircle2,RefreshCw,PackageCheck,ShieldCheck,Inbox,History,AlertCircle,Check,X,Timer,Package} from "lucide-react";
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
 const [cancelId,setCancelId]=useState<string|null>(null);
 const [cancelReason,setCancelReason]=useState("");
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
 const cancelAccepted=async()=>{
   if(!supabase||!cancelId||cancelReason.trim().length<5)return;
   const id=cancelId;setBusy(id);setError("");
   const result=await supabase.rpc("cancel_accepted_pickup",{p_reservation_id:id,p_reason:cancelReason.trim()});
   if(result.error)setError("Unable to cancel accepted order: "+result.error.message);
   else {setCancelId(null);setCancelReason("");await refresh();}
   setBusy("");
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
 const pendingCount=orders.filter(o=>o.status==="requested").length;
 const acceptedCount=orders.filter(o=>o.status==="accepted").length;
 const completedCount=orders.filter(o=>o.status==="completed").length;
 const activeCount=pendingCount+acceptedCount;
 return <main className="orders-studio">
  <div className="orders-heading"><div><p className="orders-eyebrow">RETAIL OPERATIONS <span>/</span> ONLINE ORDERS</p><h1>Pickup orders<span className="orders-dot">.</span></h1><p className="orders-subtitle">From new requests to verified handovers, all in one place.</p></div><div className="orders-heading-actions"><span className="orders-live"><span/> Live updates</span><button type="button" onClick={()=>void refresh()}><RefreshCw size={16}/> Refresh</button></div></div>
  {store.loading?<p className="orders-message">Loading your shop…</p>:store.error?<p role="alert">{store.error}</p>:!store.user?<div className="orders-message">Please <Link href="/retailer/login">sign in</Link> to view orders.</div>:!store.storeId?<div className="orders-message">Please <Link href="/retailer/catalog">create your shop</Link> first.</div>:<>
  <div className="orders-stats">
   <div className="orders-stat"><span className="orders-stat-icon amber"><Inbox size={20}/></span><div><small>New requests</small><strong>{pendingCount}</strong></div></div>
   <div className="orders-stat"><span className="orders-stat-icon green"><Clock3 size={20}/></span><div><small>Awaiting pickup</small><strong>{acceptedCount}</strong></div></div>
   <div className="orders-stat"><span className="orders-stat-icon blue"><CheckCircle2 size={20}/></span><div><small>Completed pickups</small><strong>{completedCount}</strong></div></div>
   <div className="orders-stat"><span className="orders-stat-icon neutral"><ClipboardList size={20}/></span><div><small>All orders</small><strong>{orders.length}</strong></div></div>
  </div>
  <div className="orders-toolbar"><div className="orders-tabs"><button className={tab==="active"?"selected":""} onClick={()=>{setTab("active");setStatusFilter("active");}}><Inbox size={16}/> Active orders <span>{activeCount}</span></button><button className={tab==="history"?"selected":""} onClick={()=>{setTab("history");setStatusFilter("history");}}><History size={16}/> Order history <span>{orders.length-activeCount}</span></button></div><div className="orders-store"><Package size={15}/>{store.storeName}</div></div>
  <div className="orders-filters">{(["active","requested","accepted","completed","rejected","expired","all"] as const).map(status=><button key={status} type="button" className={statusFilter===status?"selected":""} onClick={()=>{setStatusFilter(status);setTab(status==="active"||status==="requested"||status==="accepted"?"active":"history");}}>{status==="active"?"Active":status==="all"?"All orders":status==="requested"?"New requests":status==="accepted"?"Awaiting pickup":status==="completed"?"Completed":status==="rejected"?"Rejected":"Expired"} <span>{status==="active"?activeCount:status==="all"?orders.length:orders.filter(o=>o.status===status).length}</span></button>)}</div>
  {error&&<div className="orders-error" role="alert"><AlertCircle size={18}/>{error}</div>}
  <div className="orders-list">{filtered.map(o=>{
   const lines=items.filter(i=>i.reservation_id===o.id);
   const remaining=o.expires_at?Math.max(0,Math.ceil((new Date(o.expires_at).getTime()-now)/1000)):null;
   const total=lines.reduce((sum,i)=>sum+Number(i.price_at_request)*i.quantity,0);
   const units=lines.reduce((sum,i)=>sum+i.quantity,0);
   const isPending=o.status==="requested";
   const isAccepted=o.status==="accepted";
   const statusText=isPending?"New request":isAccepted?"Awaiting pickup":o.status==="completed"?"Collected":o.status==="rejected"?"Rejected":"Expired";
   return <article className="orders-card" key={o.id}>
    <div className="orders-card-top"><div className="orders-order-id"><span className="orders-order-icon"><ClipboardList size={19}/></span><div><small>ORDER #{o.id.slice(0,8).toUpperCase()}</small><strong>{new Date(o.requested_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</strong></div></div><div className="orders-card-meta"><span>{units} {units===1?"item":"items"}</span><span className={"orders-status "+(isPending?"pending":isAccepted?"accepted":o.status==="completed"?"completed":"muted")}><span/>{statusText}</span></div></div>
    <div className="orders-card-body"><div className="orders-product-section"><div className="orders-section-label">ORDER ITEMS <span>{lines.length} products</span></div>{lines.map(i=>{const p=productById.get(i.product_id);const image=productImage(p);return <div className="orders-product" key={i.product_id}><div className="orders-product-img">{image?<img src={image} alt={p?.name||"Product"} loading="lazy" referrerPolicy="no-referrer"/>:<Package size={22}/>}</div><div className="orders-product-name"><strong>{p?.name||"Unknown catalogue product"}</strong><small>{p?.packSize||p?.category||"Product"} · Qty {i.quantity}</small></div><strong className="orders-line-total">{fmt(Number(i.price_at_request)*i.quantity)}</strong></div>;})}{!lines.length&&<p className="orders-empty-products">Order items are loading or unavailable.</p>}</div>
    <aside className="orders-actions"><div className="orders-section-label">ORDER SUMMARY</div><div className="orders-summary-row"><span>Items ({units})</span><strong>{fmt(total)}</strong></div><div className="orders-summary-row"><span>Pickup</span><strong className="orders-free">Free</strong></div><div className="orders-total"><span>Total amount</span><strong>{fmt(total)}</strong></div>
    {isPending&&<div className="orders-decision"><p>Check availability before accepting. Stock will be reserved on acceptance.</p><button className="orders-primary" disabled={busy===o.id} onClick={()=>void action(o.id,"accept")}><Check size={18}/>{busy===o.id?"Processing…":"Accept & reserve"}</button><button className="orders-secondary-danger" disabled={busy===o.id} onClick={()=>void action(o.id,"reject")}><X size={16}/> Reject order</button></div>}
    {isAccepted&&<div className="orders-pickup"><div className={"orders-timer"+(remaining===0?" expired":remaining!==null&&remaining<=120?" urgent":"")}><div><span><Timer size={16}/> PICKUP WINDOW</span><strong>{remaining===0?"Time elapsed":remaining===null?"—":`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`}</strong></div><Clock3 size={23}/></div>{remaining!==null&&remaining>0&&<div className="orders-verification"><label htmlFor={"code-"+o.id}>Customer pickup code</label><input id={"code-"+o.id} type="text" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Enter 6-digit code" value={codes[o.id]||""} onChange={e=>{setCodes(old=>({...old,[o.id]:e.target.value.replace(/[^0-9]/g,"").slice(0,6)}));setCodeErrors(old=>({...old,[o.id]:""}));}}/><button className="orders-primary" type="button" disabled={busy===o.id||(codes[o.id]||"").length!==6} onClick={()=>void complete(o.id)}><ShieldCheck size={17}/>{busy===o.id?"Verifying…":"Verify & complete"}</button>{codeErrors[o.id]&&<p role="alert">{codeErrors[o.id]}</p>}<small>Hand over items only after the code is verified.</small></div>}{remaining!==null&&remaining>0&&<button type="button" className="orders-cancel-link" disabled={busy===o.id} onClick={()=>{setCancelId(o.id);setCancelReason("");}}>Cancel acceptance</button>}{remaining===0&&<button className="orders-secondary-danger" disabled={busy===o.id} onClick={()=>void action(o.id,"expire")}>Expire & release stock</button>}</div>}
    {!isPending&&!isAccepted&&<div className="orders-closed"><PackageCheck size={18}/> This order is in your history.</div>}
    </aside></div>
   </article>;
  })}</div>
  {!filtered.length&&<div className="orders-empty"><span><Inbox size={29}/></span><h2>{statusFilter==="active"?"You're all caught up":statusFilter==="history"?"No order history yet":"No matching orders"}</h2><p>{statusFilter==="active"?"New pickup requests will appear here automatically.":"Try a different status filter to view other orders."}</p></div>}
  </>}
  {cancelId&&<div className="orders-modal-backdrop" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="orders-cancel-title" className="orders-modal"><span className="orders-modal-icon"><AlertCircle size={24}/></span><h2 id="orders-cancel-title">Cancel accepted order?</h2><p>This will notify the customer and return the reserved items to available stock. This action cannot be undone.</p><label htmlFor="orders-cancel-reason">Reason for cancellation</label><select id="orders-cancel-reason" value={cancelReason} onChange={e=>setCancelReason(e.target.value)}><option value="">Select a reason</option><option value="Item unavailable">Item unavailable</option><option value="Accepted by mistake">Accepted by mistake</option><option value="Store unable to fulfil">Store unable to fulfil</option><option value="Store closing early">Store closing early</option><option value="Other operational issue">Other operational issue</option></select><div className="orders-modal-actions"><button type="button" onClick={()=>{setCancelId(null);setCancelReason("");}}>Keep order</button><button type="button" disabled={busy===cancelId||cancelReason.trim().length<5} onClick={()=>void cancelAccepted()}>{busy===cancelId?"Cancelling…":"Confirm cancellation"}</button></div></section></div>}
 </main>;
}
