"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import "./pickup-live.css";
import {ShoppingBasket,Plus,Minus,ArrowRight,Store} from "lucide-react";
import catalog from "../../meshlyy-master-catalog.json";
import images from "../../meshlyy-source-image-references.json";
import {supabase} from "../retailer/catalog/use-retailer-store";
type Product={id:string;name:string;category:string;packSize:string|null};
type Listing={store_id:string;store_name:string;locality:string|null;product_id:string;price:number;stock:number};
type Reservation={id:string;store_id:string;status:string;requested_at:string;expires_at:string|null};
type ReservationLine={reservation_id:string;product_id:string;quantity:number;price_at_request:number};
type CartHold={hold_id:string;store_id:string;product_id:string;quantity:number;price_at_hold:number;expires_at:string};
const products=new Map((catalog as Product[]).map(p=>[p.id,p]));
const refs=images as Record<string,{url:string}>;
const imageFor=(p?:Product)=>p?refs[p.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()]?.url:null;
const money=(v:number)=>"₹"+Number(v).toLocaleString("en-IN",{maximumFractionDigits:2});
const button:React.CSSProperties={border:0,borderRadius:11,padding:"12px 17px",background:"#143e38",color:"#fff",cursor:"pointer",fontWeight:700};
const input:React.CSSProperties={border:"1px solid #cdded5",borderRadius:11,padding:"13px 15px",background:"white",fontSize:15,minWidth:0};
export default function LivePickup(){
 const [user,setUser]=useState<string|null>(null);
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [register,setRegister]=useState(false);
 const [query,setQuery]=useState("");const [locality,setLocality]=useState("");
 const [listings,setListings]=useState<Listing[]>([]);
 const [basket,setBasket]=useState<Record<string,number>>({});
 const [holds,setHolds]=useState<CartHold[]>([]);
 const [cartBusy,setCartBusy]=useState(false);
 const cartLock=useRef(false);
 const [orders,setOrders]=useState<Reservation[]>([]);
 const [orderLines,setOrderLines]=useState<ReservationLine[]>([]);
 const [pickupCodes,setPickupCodes]=useState<Record<string,string>>({});
 const [cancelReasons,setCancelReasons]=useState<Record<string,string>>({});
 const [codeBusy,setCodeBusy]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [now,setNow]=useState(Date.now());
 const lastTrackedSearch=useRef("");
 const [viewed,setViewed]=useState<string|null>(null);
 const [showReservations,setShowReservations]=useState(false);
 const [orderTab,setOrderTab]=useState<"active"|"history">("active");
 const [expandedOrder,setExpandedOrder]=useState<string|null>(null);
 const [showMobileCart,setShowMobileCart]=useState(false);
 const [cancelOrderId,setCancelOrderId]=useState<string|null>(null);
 const [cancelOrderReason,setCancelOrderReason]=useState("");
 const [cancelOrderBusy,setCancelOrderBusy]=useState(false);
 const load=useCallback(async()=>{
   if(!supabase){setMessage("Supabase configuration is missing.");setLoading(false);return;}
   const {data,error}=await supabase.rpc("discover_pickup_products",{p_query:"",p_locality:locality.trim(),p_limit:100});
   if(error)setMessage(error.message);else setListings((data||[]) as Listing[]);
   setLoading(false);
 },[locality]);
 const loadOrders=useCallback(async()=>{
   if(!supabase||!user)return;
   const {data,error}=await supabase.from("pickup_reservations").select("id,store_id,status,requested_at,expires_at").order("requested_at",{ascending:false}).limit(20);
   if(error){setMessage(error.message);return;}
   const rows=(data||[]) as Reservation[];
   setOrders(rows);
   void supabase.rpc("my_pickup_cancellation_reasons").then(({data,error:reasonError})=>{if(reasonError)return;const next:Record<string,string>={};for(const entry of (data||[]) as {reservation_id:string;reason:string}[])next[entry.reservation_id]=entry.reason;setCancelReasons(next);});
   if(!rows.length){setOrderLines([]);return;}
   const details=await supabase.from("pickup_reservation_items").select("reservation_id,product_id,quantity,price_at_request").in("reservation_id",rows.map(o=>o.id));
   if(details.error)setMessage(details.error.message);
   else setOrderLines((details.data||[]) as ReservationLine[]);
 },[user]);
 useEffect(()=>{void load();},[load]);
 // Consumer inventory invalidation: realtime events plus a bounded fallback poll.
 // Refetch the authoritative discovery RPC rather than trusting event payloads.
 useEffect(()=>{
  if(!supabase)return;
  const client=supabase;
  let pending=false;
  const refresh=()=>{
   if(pending||document.visibilityState!=="visible")return;
   pending=true;
   void load().finally(()=>{pending=false;});
  };
  const channel=client.channel("consumer-live-inventory")
   .on("postgres_changes",{event:"*",schema:"public",table:"store_inventory"},refresh)
   .subscribe();
  const onFocus=()=>refresh();
  const onVisibility=()=>{if(document.visibilityState==="visible")refresh();};
  window.addEventListener("focus",onFocus);
  document.addEventListener("visibilitychange",onVisibility);
  const timer=window.setInterval(refresh,10000);
  return()=>{
   window.clearInterval(timer);
   window.removeEventListener("focus",onFocus);
   document.removeEventListener("visibilitychange",onVisibility);
   void client.removeChannel(channel);
  };
 },[load]);
 useEffect(()=>{
   if(!supabase)return;
   supabase.auth.getUser().then(({data})=>setUser(data.user?.id||null));
   const {data}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user?.id||null));
   return ()=>data.subscription.unsubscribe();
 },[]);
 const loadHolds=useCallback(async()=>{
   if(!supabase||!user){setHolds([]);setBasket({});return;}
   const {data,error}=await supabase.rpc("my_cart_holds");
   if(error){setMessage("Cart sync: "+error.message);return;}
   const rows=(data||[]) as CartHold[];
   setHolds(rows);
   const next:Record<string,number>={};
   for(const h of rows)next[h.store_id+":"+h.product_id]=h.quantity;
   setBasket(next);
 },[user]);
 useEffect(()=>{void loadHolds();},[loadHolds]);
 useEffect(()=>{void loadOrders();},[loadOrders]);
 useEffect(()=>{if(!user)return;const id=setInterval(()=>{if(!cartLock.current)void loadHolds();},15000);return ()=>clearInterval(id);},[user,loadHolds]);
 useEffect(()=>{if(!user)return;const timer=setInterval(()=>{void loadOrders();},10000);return ()=>clearInterval(timer);},[user,loadOrders]);
 useEffect(()=>{
   if(!supabase||!user)return;
   const client=supabase;
   const channel=client.channel("consumer-orders-"+user).on("postgres_changes",{event:"*",schema:"public",table:"pickup_reservations",filter:"customer_id=eq."+user},()=>{void loadOrders();}).subscribe();
   return ()=>{void client.removeChannel(channel);};
 },[user,loadOrders]);
 // Codes are issued by the database when the retailer accepts. Retrieve automatically.
 const acceptedIds=orders.filter(o=>o.status==="accepted"&&o.expires_at&&new Date(o.expires_at).getTime()>now).map(o=>o.id).join(",");
 useEffect(()=>{
   if(!supabase||!user||!acceptedIds)return;
   let cancelled=false;
   for(const id of acceptedIds.split(",")){
     if(pickupCodes[id])continue;
     void supabase.rpc("customer_pickup_code",{p_reservation_id:id}).then(({data,error})=>{
       if(cancelled)return;
       if(error){setMessage("Pickup code: "+error.message);return;}
       if(data)setPickupCodes(old=>({...old,[id]:String(data)}));
     });
   }
   return ()=>{cancelled=true;};
 // Run only when the set of accepted reservations changes, not every countdown tick.
 },[acceptedIds,user]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(id);},[]);
 const filtered=listings.filter(l=>[products.get(l.product_id)?.name,products.get(l.product_id)?.category,l.store_name,l.locality].join(" ").toLowerCase().includes(query.toLowerCase()));
 // Track settled searches for signed-in users only; current listings are capped at 100.
 useEffect(()=>{
   const term=query.trim().toLowerCase().replace(/\s+/g," ");
   if(!supabase||!user||loading||term.length<2||term.length>120)return;
   const key=user+"|"+locality.trim().toLowerCase()+"|"+term;
   if(key===lastTrackedSearch.current)return;
   const timer=setTimeout(()=>{
     if(!supabase)return;
     const count=listings.filter(l=>[products.get(l.product_id)?.name,products.get(l.product_id)?.category,l.store_name,l.locality].join(" ").toLowerCase().includes(term)).length;
     lastTrackedSearch.current=key;
     void supabase.rpc("record_consumer_search",{p_query:term,p_result_count:count}).then(({error})=>{
       if(error){lastTrackedSearch.current="";console.warn("Search analytics unavailable:",error.message);}
     });
   },1200);
   return ()=>clearTimeout(timer);
 },[query,user,locality,loading,listings]);
 const stores=useMemo(()=>new Map(listings.map(l=>[l.store_id,l.store_name])),[listings]);
 const selected=Object.entries(basket).filter(([,q])=>q>0).map(([key,q])=>{const l=listings.find(x=>x.store_id+":"+x.product_id===key);return l?{...l,quantity:q}:null;}).filter((x):x is Listing&{quantity:number}=>!!x);
 const groups=Array.from(new Set(selected.map(x=>x.store_id))).map(id=>({id,name:stores.get(id)||"Shop",lines:selected.filter(x=>x.store_id===id)}));
 const track=(l:Listing,eventType:"view"|"basket_add"|"pickup_requested")=>{if(!supabase||!user)return;void supabase.rpc("record_consumer_product_event",{p_store_id:l.store_id,p_product_id:l.product_id,p_event_type:eventType,p_locality:l.locality}).then(({error})=>{if(error)console.warn("Product analytics unavailable:",error.message);});};
 const change=async(l:Listing,delta:number,remove=false)=>{
   if(!supabase||cartLock.current)return;
   if(!user){setMessage("Sign in to reserve products in your cart.");return;}
   const key=l.store_id+":"+l.product_id;
   const target=remove?0:Math.max(0,Math.min(20,(basket[key]||0)+delta));
   cartLock.current=true;setCartBusy(true);setMessage("");
   const {error}=await supabase.rpc("set_cart_hold_quantity",{p_store_id:l.store_id,p_product_id:l.product_id,p_quantity:target});
   if(error)setMessage(error.message);
   else {if(delta>0)track(l,"basket_add");await loadHolds();await load();}
   cartLock.current=false;setCartBusy(false);
 };
 const login=async()=>{if(!supabase)return;setBusy(true);setMessage("");const r=register?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);setMessage(r.error?.message||(!r.data.session?"Check your email to confirm your account.":"Signed in."));};
 const generateCode=async(id:string)=>{
   if(!supabase)return;
   setCodeBusy(id);setMessage("");
   const result=await supabase.rpc("customer_pickup_code",{p_reservation_id:id});
   if(result.error)setMessage(result.error.message);
   else setPickupCodes(old=>({...old,[id]:String(result.data)}));
   setCodeBusy(null);
 };
 const reserve=async(group:typeof groups[number])=>{
   if(!supabase)return;
   if(!user){setMessage("Please sign in to send a pickup request.");return;}
   setBusy(true);setMessage("");
   const hold=holds.find(h=>h.store_id===group.id);
   if(!hold){setBusy(false);setMessage("Cart hold not found. Add products again.");await loadHolds();return;}
   if(new Date(hold.expires_at).getTime()<=Date.now()){setBusy(false);setMessage("Your 60-second cart hold expired. Add products again.");await loadHolds();return;}
   const r=await supabase.rpc("confirm_cart_hold",{p_hold_id:hold.hold_id});
   setBusy(false);
   if(r.error){setMessage(r.error.message);return;}
   setMessage("Pickup request sent to "+group.name+". Wait for retailer acceptance before visiting.");
   for(const item of group.lines)track(item,"pickup_requested");
   await loadHolds();await loadOrders();await load();
 };
 const cancelMyOrder=async()=>{
  if(!supabase||!cancelOrderId||cancelOrderReason.trim().length<5)return;
  setCancelOrderBusy(true);setMessage("");
  const {error}=await supabase.rpc("cancel_my_pickup",{p_reservation_id:cancelOrderId,p_reason:cancelOrderReason.trim()});
  if(error)setMessage("Cancellation failed: "+error.message);
  else {setCancelOrderId(null);setCancelOrderReason("");setMessage("Your pickup order has been cancelled.");await loadOrders();await load();}
  setCancelOrderBusy(false);
 };
 const cartCount=selected.reduce((sum,l)=>sum+l.quantity,0);
 const cartTotal=selected.reduce((sum,l)=>sum+l.quantity*Number(l.price),0);
 return <main className="pickup-shop" style={{background:"#f7faf7",minHeight:"100vh",fontFamily:"Arial,sans-serif",color:"#112f2e",padding:"28px max(20px,calc((100vw - 1200px)/2))"}}>
  <nav style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><Link href="/" style={{color:"#116d5a",fontWeight:700,textDecoration:"none"}}>◈ meshlyy home</Link><Link href="/retailer/dashboard" style={{color:"#116d5a"}}>Retailer studio</Link></nav>
  <p style={{letterSpacing:3,fontSize:12,color:"#53877a",marginTop:38}}>MESHLYY / NEIGHBOURHOOD PICKUP</p>
  <h1 style={{fontSize:"clamp(34px,5vw,58px)",margin:"8px 0"}}>Find it nearby. Pick it up.</h1>
  <p style={{color:"#597b71",lineHeight:1.6}}>Live shop listings from retailer inventory. Reserve at the shop's selling price, then collect in person once accepted.</p>
  <p style={{fontSize:12,color:"#658477"}}>Signed-in searches contribute to aggregated marketplace analytics. Individual search histories are not shown to retailers.</p>
  <div className="pickup-top-actions">{user&&<button type="button" onClick={()=>setShowReservations(true)}>My orders <span>{orders.filter(o=>o.status==="requested"||o.status==="accepted").length} active</span></button>}<button type="button" className="pickup-basket-shortcut" onClick={()=>setShowMobileCart(true)}>Basket · {cartCount} items</button></div>
  <section style={{display:"flex",gap:10,flexWrap:"wrap",margin:"26px 0"}}><input aria-label="Search products" placeholder="Search products or shops…" style={{...input,flex:"2 1 260px"}} value={query} onChange={e=>setQuery(e.target.value)}/><input aria-label="Locality" placeholder="Filter by locality…" style={{...input,flex:"1 1 180px"}} value={locality} onChange={e=>setLocality(e.target.value)}/><button onClick={()=>void load()} style={button}>Refresh</button></section>
  {message&&<p role="status" style={{background:"#e7f1ea",borderRadius:10,padding:14}}>{message}</p>}
  <section style={{border:"1px solid #d8e6dd",background:"white",padding:20,borderRadius:18,marginBottom:24}}>
    {user?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}><strong>Signed in for pickup requests</strong><button style={{...button,background:"#e7f1ea",color:"#143e38"}} onClick={()=>void supabase?.auth.signOut()}>Sign out</button></div>:<><strong>Customer account</strong><p style={{fontSize:13,color:"#5f7d72"}}>Sign in or register to send a reservation. You can browse without an account.</p><div style={{display:"flex",gap:9,flexWrap:"wrap"}}><input type="email" aria-label="Email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={input}/><input type="password" aria-label="Password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={input}/><button disabled={busy} style={button} onClick={()=>void login()}>{register?"Register":"Sign in"}</button><button style={{...button,background:"#e7f1ea",color:"#143e38"}} onClick={()=>setRegister(!register)}>{register?"Have an account?":"New customer?"}</button></div></>}
  </section>
  <aside className="pickup-cart-rail" aria-label="Your pickup basket"><div className="pickup-cart-head"><span><ShoppingBasket size={19}/> Your basket</span><strong>{cartCount} items</strong></div>{!selected.length?<div className="pickup-cart-empty"><ShoppingBasket size={30}/><strong>Your basket is empty</strong><p>Add products to see your pickup order here.</p></div>:<><div className="pickup-cart-scroll">{groups.map(g=><div className="pickup-cart-group" key={g.id}><div className="pickup-cart-store"><Store size={15}/><strong>{g.name}</strong></div>{g.lines.map(l=>{const p=products.get(l.product_id);const photo=imageFor(p);return <div className="pickup-cart-item" key={l.product_id}><div className="pickup-cart-photo">{photo?<img src={photo} alt={p?.name||"Product"}/>:<ShoppingBasket size={18}/>}</div><div className="pickup-cart-info"><strong>{p?.name||l.product_id}</strong><small>{money(l.price)} each</small><div className="pickup-cart-stepper"><button aria-label="Decrease quantity" disabled={cartBusy||busy} onClick={()=>void change(l,-1)}><Minus size={14}/></button><span>{l.quantity}</span><button aria-label="Increase quantity" disabled={cartBusy||busy||l.quantity>=20} onClick={()=>void change(l,1)}><Plus size={14}/></button></div></div><strong className="pickup-cart-price">{money(l.price*l.quantity)}</strong></div>;})}<div className="pickup-cart-group-footer"><span>{g.lines.reduce((n,l)=>n+l.quantity,0)} items · {money(g.lines.reduce((n,l)=>n+l.price*l.quantity,0))}</span><button disabled={busy||cartBusy||!holds.some(h=>h.store_id===g.id&&new Date(h.expires_at).getTime()>now)} onClick={()=>void reserve(g)}>Request pickup <ArrowRight size={15}/></button></div></div>)}</div><div className="pickup-cart-total"><span>Total across stores</span><strong>{money(cartTotal)}</strong></div><p className="pickup-cart-note">Holds last 60 seconds · Pickup only · Pay at shop.</p></>}</aside>
  {cartCount>0&&<button type="button" className="pickup-mobile-cart" onClick={()=>setShowMobileCart(true)}><ShoppingBasket size={19}/><span><strong>{cartCount} items · {money(cartTotal)}</strong><small>View basket & request pickup</small></span><ArrowRight size={19}/></button>}
  <div className="pickup-products-area"><h2>Available near you <span style={{fontSize:14,fontWeight:400,color:"#688277"}}>({filtered.length} listings)</span></h2>
  {loading?<p>Loading inventory…</p>:!filtered.length?<p>No matching in-stock products. Try another locality or search.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,225px),1fr))",gap:16}}>
    {filtered.map(l=>{const p=products.get(l.product_id);const image=imageFor(p);const qty=basket[l.store_id+":"+l.product_id]||0;return <article key={l.store_id+":"+l.product_id} style={{border:"1px solid #dce9e2",borderRadius:20,padding:14,background:"white",display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden",gap:0}}>
      <div style={{height:210,width:"100%",background:"#eef5f0",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative"}}>{image?<img src={image} alt={p?.name||"Product"} referrerPolicy="no-referrer" loading="lazy" style={{display:"block",width:"100%",height:"100%",maxWidth:"100%",maxHeight:"100%",objectFit:"contain",objectPosition:"center",padding:12,boxSizing:"border-box",flex:"none"}}/>:<span style={{fontSize:12,color:"#6d8d80"}}>Image unavailable</span>}</div>
      <button type="button" onClick={()=>{setViewed(l.store_id+":"+l.product_id);track(l,"view");}} style={{border:0,background:"transparent",padding:0,textAlign:"left",color:"#286b5a",fontSize:12,cursor:"pointer",marginTop:12}}>View product details</button>
      <p style={{fontSize:12,color:"#387a68",margin:"12px 0 6px",overflowWrap:"anywhere"}}>{l.store_name} · {l.locality||"Local shop"}</p><strong style={{lineHeight:1.4,minHeight:0,overflowWrap:"anywhere"}}>{p?.name||l.product_id}</strong><p style={{fontSize:12,color:"#66857b",margin:"7px 0 4px"}}>{p?.packSize||p?.category||""}</p>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"10px",alignItems:"center",padding:"10px 0 14px"}}><strong style={{fontSize:22}}>{money(l.price)}</strong><span style={{fontSize:12,color:"#658477"}}>{l.stock} available</span></div>
      {qty?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><button style={button} disabled={cartBusy||busy} onClick={()=>void change(l,-1)}>−</button><strong>{qty}</strong><button style={button} disabled={cartBusy||busy} onClick={()=>void change(l,1)}>+</button></div>:<button style={button} disabled={cartBusy||busy||!user} onClick={()=>void change(l,1)}>+ Add to basket</button>}
    </article>;})}
  </div>}
  </div>
  {viewed&&(()=>{const listing=listings.find(l=>l.store_id+":"+l.product_id===viewed);if(!listing)return null;const p=products.get(listing.product_id);return <div role="dialog" aria-modal="true" aria-label="Product details" style={{position:"fixed",inset:0,zIndex:100,background:"rgba(16,43,37,.75)",display:"grid",placeItems:"center",padding:20}}><section style={{background:"white",padding:25,borderRadius:20,maxWidth:440,width:"100%"}}><button onClick={()=>setViewed(null)} style={{float:"right",border:0,background:"transparent",cursor:"pointer"}} aria-label="Close details">Close</button><h2 style={{marginTop:8}}>{p?.name||listing.product_id}</h2><p>{p?.category} · {p?.packSize}</p><p>{listing.store_name} · {listing.locality||"Local shop"}</p><strong style={{fontSize:24}}>{money(listing.price)}</strong><p>{listing.stock} units available</p><button style={button} disabled={cartBusy||busy} onClick={()=>{void change(listing,1);setViewed(null);}}>Add to pickup basket</button></section></div>;})()}
  {showReservations&&<div className="pickup-drawer-overlay" onClick={()=>setShowReservations(false)}><div className="pickup-drawer pickup-orders-drawer" role="dialog" aria-modal="true" aria-label="Your reservations" onClick={e=>e.stopPropagation()}><div className="pickup-drawer-top"><strong>My pickup orders</strong><button type="button" onClick={()=>setShowReservations(false)}>Close ×</button></div>  {user&&<section className="pickup-reservations-panel">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:20}}>
      <div><p style={{letterSpacing:2,fontSize:11,fontWeight:700,color:"#41806e",margin:"0 0 7px"}}>YOUR ORDER JOURNEY</p><h2 style={{fontSize:"clamp(28px,3vw,38px)",margin:0}}>Your reservations <span style={{fontSize:16,color:"#759187",fontWeight:400}}>({orders.length})</span></h2></div>
      <button style={{...button,background:"#e6f0e9",color:"#143e38"}} onClick={()=>void loadOrders()}>↻ Refresh status</button>
    </div>
    <div className="pickup-order-tabs"><button type="button" className={orderTab==="active"?"selected":""} onClick={()=>setOrderTab("active")}>Active ({orders.filter(o=>["requested","accepted"].includes(o.status)).length})</button><button type="button" className={orderTab==="history"?"selected":""} onClick={()=>setOrderTab("history")}>History ({orders.filter(o=>!["requested","accepted"].includes(o.status)).length})</button></div>
    {!orders.length?<div style={{border:"1px solid #d9e8e0",background:"white",borderRadius:18,padding:28,color:"#6c867a"}}>No reservations yet. Your pickup requests will appear here.</div>:<div style={{display:"grid",gap:18}}>
      {orders.filter(o=>orderTab==="active"?["requested","accepted"].includes(o.status):!["requested","accepted"].includes(o.status)).map(o=>{
        const remaining=o.expires_at?Math.max(0,Math.ceil((new Date(o.expires_at).getTime()-now)/1000)):null;
        const accepted=o.status==="accepted",requested=o.status==="requested",rejected=o.status==="rejected";
        const lines=orderLines.filter(i=>i.reservation_id===o.id);
        const total=lines.reduce((sum,i)=>sum+Number(i.price_at_request)*i.quantity,0);
        const count=lines.reduce((sum,i)=>sum+i.quantity,0);
        const statusText=requested?"Awaiting shop confirmation":accepted?"Ready for pickup":rejected?"Shop couldn't accept":o.status==="expired"?"Pickup window expired":o.status==="completed"?"Collected":o.status.charAt(0).toUpperCase()+o.status.slice(1);
        const statusColor=accepted?"#166a52":requested?"#94661e":rejected?"#a24b3c":"#687f75";
        const statusBg=accepted?"#e5f5eb":requested?"#fff4de":rejected?"#f9ebe7":"#eef3ef";
        return <article key={o.id} style={{background:"white",border:"1px solid #dce8e0",borderRadius:20,overflow:"hidden",boxShadow:"0 10px 30px rgba(18,60,45,.035)"}}>
          <div style={{padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",borderBottom:"1px solid #e8f0ea",background:"#fcfdfb"}}>
            <div><div style={{fontSize:11,color:"#698a7d",letterSpacing:1.4,fontWeight:700,marginBottom:6}}>PICKUP RESERVATION</div><strong style={{fontSize:20}}>#{o.id.slice(0,8).toUpperCase()}</strong><p style={{fontSize:12,color:"#748d82",margin:"6px 0 0"}}>{new Date(o.requested_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</p></div>
            <span style={{background:statusBg,color:statusColor,borderRadius:99,padding:"10px 14px",fontSize:12,fontWeight:700}}>● {statusText}</span>
          </div>
          <div className="pickup-order-summary"><div className="pickup-order-timeline"><span className="done">Requested</span><span className={accepted||o.status==="completed"?"done":""}>Accepted</span><span className={o.status==="completed"?"done":""}>Collected</span></div>{accepted&&<div className="pickup-order-quick"><span>Pickup code <strong>{pickupCodes[o.id]||"Loading…"}</strong></span><span>Time remaining <strong>{remaining===null?"—":remaining===0?"Expired":Math.floor(remaining/60)+":"+String(remaining%60).padStart(2,"0")}</strong></span></div>}{requested&&<p>Waiting for the shop to accept your request.</p>}<div className="pickup-order-quick-actions"><button type="button" onClick={()=>setExpandedOrder(expandedOrder===o.id?null:o.id)}>{expandedOrder===o.id?"Hide details −":"View details +"}</button>{(requested||(accepted&&remaining!==null&&remaining>0))&&<button type="button" onClick={()=>{setCancelOrderId(o.id);setCancelOrderReason("");}}>Cancel order</button>}</div></div>
          <div className="pickup-order-details" style={{display:expandedOrder===o.id?"grid":"none",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))"}}>
            <div style={{padding:"22px 24px",minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><div style={{width:38,height:38,borderRadius:11,background:"#eaf5ed",display:"grid",placeItems:"center",fontSize:20}}>⌂</div><div><div style={{fontSize:11,color:"#789085"}}>PICKUP SHOP</div><strong style={{fontSize:17}}>{stores.get(o.store_id)||"Your neighbourhood shop"}</strong></div></div>
              {lines.length?lines.map((i,index)=>{const p=products.get(i.product_id);const photo=imageFor(p);return <div key={i.product_id} style={{display:"flex",gap:13,alignItems:"center",padding:"12px 0",borderTop:"1px solid #edf2ee"}}>
                <div style={{height:68,width:68,flex:"0 0 68px",background:"#f0f6f1",borderRadius:11,overflow:"hidden",display:"grid",placeItems:"center"}}>{photo?<img src={photo} alt={p?.name||"Product"} referrerPolicy="no-referrer" loading="lazy" style={{width:"100%",height:"100%",objectFit:"contain",padding:6,boxSizing:"border-box"}}/>:<span style={{fontSize:10,color:"#769083"}}>No image</span>}</div>
                <div style={{flex:1,minWidth:0}}><strong style={{fontSize:13,lineHeight:1.4,display:"block",overflowWrap:"anywhere"}}>{p?.name||"Catalogue product"}</strong><span style={{fontSize:12,color:"#789084"}}>{p?.packSize||p?.category||"Product"} · Qty {i.quantity}</span></div><strong style={{fontSize:14,whiteSpace:"nowrap"}}>{money(Number(i.price_at_request)*i.quantity)}</strong>
              </div>; }):<p style={{color:"#738d81",fontSize:13}}>Product details unavailable.</p>}
              {lines.length>0&&<div style={{display:"flex",justifyContent:"space-between",borderTop:"1px dashed #d4e3d9",paddingTop:15,marginTop:8,alignItems:"center"}}><span style={{fontSize:13,color:"#6b8579"}}>{count} items · Pay at shop</span><strong style={{fontSize:21}}>{money(total)}</strong></div>}
            </div>
            <aside style={{background:"#f4faf5",borderLeft:"1px solid #e4eee7",padding:"24px",display:"flex",flexDirection:"column",justifyContent:"center",gap:16}}>
              <div><div style={{fontSize:11,letterSpacing:1.4,color:"#6d8a7c",fontWeight:700}}>ORDER PROGRESS</div>
                <div style={{display:"flex",gap:8,marginTop:15}}>{[0,1,2].map((step)=><div key={step} style={{height:6,flex:1,borderRadius:99,background:(step===0||step===1&&(accepted||o.status==="completed")||step===2&&o.status==="completed")?"#23765c":"#d7e6da"}}/>)}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#678579",marginTop:9}}><span>Requested</span><span>Accepted</span><span>Collected</span></div>
              </div>
              {accepted&&remaining!==null&&remaining>0&&<div style={{background:"#fff",border:"1px solid #d6e8dc",borderRadius:13,padding:17}}><strong style={{fontSize:13}}>Your secure pickup code</strong><p style={{fontSize:12,color:"#69877b",lineHeight:1.5,margin:"7px 0 12px"}}>Automatically issued when the shop accepts. Share only with shop staff at collection.</p>{pickupCodes[o.id]?<div aria-label="Six digit pickup code" style={{fontSize:30,letterSpacing:7,fontWeight:800,fontVariantNumeric:"tabular-nums",color:"#165c47",textAlign:"center"}}>{pickupCodes[o.id]}</div>:<p role="status" style={{fontSize:13,color:"#69877b"}}>Loading your pickup code…</p>}</div>}
              {accepted&&<div style={{background:"#e3f4e9",padding:20,borderRadius:15}}><div style={{fontSize:12,color:"#377963",fontWeight:700}}>YOUR PICKUP WINDOW</div><strong style={{display:"block",fontSize:34,margin:"6px 0",fontVariantNumeric:"tabular-nums",color:remaining===0?"#a14b3c":"#155b47"}}>{remaining===null?"Awaiting time":remaining===0?"Time elapsed":`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`}</strong><p style={{fontSize:12,lineHeight:1.6,color:"#577d6b",margin:0}}>{remaining===0?"The displayed timer has ended. Wait for the shop to confirm status.":"Visit the shop before this countdown ends. Bring your reservation number."}</p></div>}
              {requested&&<div style={{padding:17,borderRadius:13,background:"#fff6e6",color:"#8c6426",fontSize:13,lineHeight:1.65}}>Your request has been sent. Please wait for the retailer to accept before travelling to the shop.</div>}
              {rejected&&<div style={{padding:17,borderRadius:13,background:"#f9eeea",color:"#8f4d40",fontSize:13,lineHeight:1.65}}>This shop couldn't fulfil the request. No stock was reserved. You can browse and request again.</div>}
              {!requested&&!accepted&&!rejected&&<div style={{fontSize:13,color:"#678579",lineHeight:1.6}}>{o.status==="completed"?"✓ Pickup completed successfully. Your order has been collected.":o.status==="expired"?"Pickup window expired. You can request again.":"This reservation is no longer active. Check the status before visiting the shop."}</div>}
              {(requested||(accepted&&remaining!==null&&remaining>0))&&<button type="button" className="pickup-cancel-order" onClick={()=>{setCancelOrderId(o.id);setCancelOrderReason("");}}>Cancel this order</button>}
              <div style={{fontSize:12,color:"#6d877a",borderTop:"1px solid #dce9df",paddingTop:13}}>Pickup only · Pay in store · No delivery</div>
            </aside>
          </div>
        </article>;
      })}
    </div>}
  </section>}
</div></div>}
  {cancelOrderId&&<div className="pickup-cancel-overlay" onClick={()=>{if(!cancelOrderBusy)setCancelOrderId(null);}}><section role="dialog" aria-modal="true" aria-labelledby="pickup-cancel-title" className="pickup-cancel-modal" onClick={e=>e.stopPropagation()}><h2 id="pickup-cancel-title">Cancel pickup order?</h2><p>Your shop will be notified. If items were reserved, they will return to available inventory. This cannot be undone.</p><label htmlFor="pickup-cancel-reason">Why are you cancelling?</label><select id="pickup-cancel-reason" value={cancelOrderReason} onChange={e=>setCancelOrderReason(e.target.value)}><option value="">Choose a reason</option><option value="Changed my mind">Changed my mind</option><option value="Ordered by mistake">Ordered by mistake</option><option value="Cannot collect in time">Cannot collect in time</option><option value="Found the product elsewhere">Found the product elsewhere</option><option value="Other personal reason">Other personal reason</option></select><div className="pickup-cancel-actions"><button type="button" disabled={cancelOrderBusy} onClick={()=>setCancelOrderId(null)}>Keep my order</button><button type="button" disabled={cancelOrderBusy||cancelOrderReason.trim().length<5} onClick={()=>void cancelMyOrder()}>{cancelOrderBusy?"Cancelling…":"Confirm cancellation"}</button></div></section></div>}
  {showMobileCart&&<div className="pickup-drawer-overlay" onClick={()=>setShowMobileCart(false)}><div className="pickup-drawer pickup-mobile-drawer" role="dialog" aria-modal="true" aria-label="Your basket" onClick={e=>e.stopPropagation()}><div className="pickup-drawer-top"><strong>Your pickup basket</strong><button type="button" onClick={()=>setShowMobileCart(false)}>Close ×</button></div><div className="pickup-mobile-cart-content">{groups.map(g=><div className="pickup-mobile-group" key={g.id}><h3>{g.name}</h3>{g.lines.map(l=>{const p=products.get(l.product_id);return <div className="pickup-mobile-line" key={l.product_id}><span>{p?.name||l.product_id}</span><div><button disabled={cartBusy||busy} onClick={()=>void change(l,-1)}>−</button><strong>{l.quantity}</strong><button disabled={cartBusy||busy} onClick={()=>void change(l,1)}>+</button></div><strong>{money(l.price*l.quantity)}</strong></div>;})}<button className="pickup-mobile-checkout" disabled={busy||cartBusy||!holds.some(h=>h.store_id===g.id&&new Date(h.expires_at).getTime()>now)} onClick={()=>void reserve(g)}>Request pickup · {money(g.lines.reduce((n,l)=>n+l.price*l.quantity,0))}</button></div>)}</div></div></div>}

 </main>;
}
