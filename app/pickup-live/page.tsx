"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import catalog from "../../meshlyy-master-catalog.json";
import images from "../../meshlyy-source-image-references.json";
import {supabase} from "../retailer/catalog/use-retailer-store";
type Product={id:string;name:string;category:string;packSize:string|null};
type Listing={store_id:string;store_name:string;locality:string|null;product_id:string;price:number;stock:number};
type Reservation={id:string;store_id:string;status:string;requested_at:string;expires_at:string|null};
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
 const [orders,setOrders]=useState<Reservation[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [now,setNow]=useState(Date.now());
 const load=useCallback(async()=>{
   if(!supabase){setMessage("Supabase configuration is missing.");setLoading(false);return;}
   const {data,error}=await supabase.rpc("discover_pickup_products",{p_query:"",p_locality:locality.trim(),p_limit:100});
   if(error)setMessage(error.message);else setListings((data||[]) as Listing[]);
   setLoading(false);
 },[locality]);
 const loadOrders=useCallback(async()=>{
   if(!supabase||!user)return;
   const {data,error}=await supabase.from("pickup_reservations").select("id,store_id,status,requested_at,expires_at").order("requested_at",{ascending:false}).limit(20);
   if(!error)setOrders((data||[]) as Reservation[]);
 },[user]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
   if(!supabase)return;
   supabase.auth.getUser().then(({data})=>setUser(data.user?.id||null));
   const {data}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user?.id||null));
   return ()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{void loadOrders();},[loadOrders]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(id);},[]);
 const filtered=listings.filter(l=>[products.get(l.product_id)?.name,products.get(l.product_id)?.category,l.store_name,l.locality].join(" ").toLowerCase().includes(query.toLowerCase()));
 const stores=useMemo(()=>new Map(listings.map(l=>[l.store_id,l.store_name])),[listings]);
 const selected=Object.entries(basket).filter(([,q])=>q>0).map(([key,q])=>{const l=listings.find(x=>x.store_id+":"+x.product_id===key);return l?{...l,quantity:q}:null;}).filter((x):x is Listing&{quantity:number}=>!!x);
 const groups=Array.from(new Set(selected.map(x=>x.store_id))).map(id=>({id,name:stores.get(id)||"Shop",lines:selected.filter(x=>x.store_id===id)}));
 const change=(l:Listing,delta:number)=>{const key=l.store_id+":"+l.product_id;setBasket(old=>{const next={...old};const q=Math.min(l.stock,Math.max(0,(old[key]||0)+delta));if(q)next[key]=q;else delete next[key];return next;});};
 const login=async()=>{if(!supabase)return;setBusy(true);setMessage("");const r=register?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);setMessage(r.error?.message||(!r.data.session?"Check your email to confirm your account.":"Signed in."));};
 const reserve=async(group:typeof groups[number])=>{
   if(!supabase)return;
   if(!user){setMessage("Please sign in to send a pickup request.");return;}
   setBusy(true);setMessage("");
   const r=await supabase.rpc("request_pickup",{p_store_id:group.id,p_items:group.lines.map(x=>({product_id:x.product_id,quantity:x.quantity}))});
   setBusy(false);
   if(r.error){setMessage(r.error.message);return;}
   setMessage("Pickup request sent to "+group.name+". Wait for retailer acceptance before visiting.");
   setBasket(old=>{const next={...old};for(const x of group.lines)delete next[x.store_id+":"+x.product_id];return next;});
   await loadOrders();await load();
 };
 return <main style={{background:"#f7faf7",minHeight:"100vh",fontFamily:"Arial,sans-serif",color:"#112f2e",padding:"28px max(20px,calc((100vw - 1200px)/2))"}}>
  <nav style={{display:"flex",justifyContent:"space-between",gap:15,flexWrap:"wrap"}}><Link href="/" style={{color:"#116d5a",fontWeight:700,textDecoration:"none"}}>◈ meshlyy home</Link><Link href="/retailer/dashboard" style={{color:"#116d5a"}}>Retailer studio</Link></nav>
  <p style={{letterSpacing:3,fontSize:12,color:"#53877a",marginTop:38}}>MESHLYY / NEIGHBOURHOOD PICKUP</p>
  <h1 style={{fontSize:"clamp(34px,5vw,58px)",margin:"8px 0"}}>Find it nearby. Pick it up.</h1>
  <p style={{color:"#597b71",lineHeight:1.6}}>Live shop listings from retailer inventory. Reserve at the shop's selling price, then collect in person once accepted.</p>
  <section style={{display:"flex",gap:10,flexWrap:"wrap",margin:"26px 0"}}><input aria-label="Search products" placeholder="Search products or shops…" style={{...input,flex:"2 1 260px"}} value={query} onChange={e=>setQuery(e.target.value)}/><input aria-label="Locality" placeholder="Filter by locality…" style={{...input,flex:"1 1 180px"}} value={locality} onChange={e=>setLocality(e.target.value)}/><button onClick={()=>void load()} style={button}>Refresh</button></section>
  {message&&<p role="status" style={{background:"#e7f1ea",borderRadius:10,padding:14}}>{message}</p>}
  <section style={{border:"1px solid #d8e6dd",background:"white",padding:20,borderRadius:18,marginBottom:24}}>
    {user?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}><strong>Signed in for pickup requests</strong><button style={{...button,background:"#e7f1ea",color:"#143e38"}} onClick={()=>void supabase?.auth.signOut()}>Sign out</button></div>:<><strong>Customer account</strong><p style={{fontSize:13,color:"#5f7d72"}}>Sign in or register to send a reservation. You can browse without an account.</p><div style={{display:"flex",gap:9,flexWrap:"wrap"}}><input type="email" aria-label="Email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={input}/><input type="password" aria-label="Password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={input}/><button disabled={busy} style={button} onClick={()=>void login()}>{register?"Register":"Sign in"}</button><button style={{...button,background:"#e7f1ea",color:"#143e38"}} onClick={()=>setRegister(!register)}>{register?"Have an account?":"New customer?"}</button></div></>}
  </section>
  <h2>Available near you <span style={{fontSize:14,fontWeight:400,color:"#688277"}}>({filtered.length} listings)</span></h2>
  {loading?<p>Loading inventory…</p>:!filtered.length?<p>No matching in-stock products. Try another locality or search.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,225px),1fr))",gap:16}}>
    {filtered.map(l=>{const p=products.get(l.product_id);const image=imageFor(p);const qty=basket[l.store_id+":"+l.product_id]||0;return <article key={l.store_id+":"+l.product_id} style={{border:"1px solid #dce9e2",borderRadius:20,padding:14,background:"white",display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden",gap:0}}>
      <div style={{height:210,width:"100%",background:"#eef5f0",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative"}}>{image?<img src={image} alt={p?.name||"Product"} referrerPolicy="no-referrer" loading="lazy" style={{display:"block",width:"100%",height:"100%",maxWidth:"100%",maxHeight:"100%",objectFit:"contain",objectPosition:"center",padding:12,boxSizing:"border-box",flex:"none"}}/>:<span style={{fontSize:12,color:"#6d8d80"}}>Image unavailable</span>}</div>
      <p style={{fontSize:12,color:"#387a68",margin:"12px 0 6px",overflowWrap:"anywhere"}}>{l.store_name} · {l.locality||"Local shop"}</p><strong style={{lineHeight:1.4,minHeight:0,overflowWrap:"anywhere"}}>{p?.name||l.product_id}</strong><p style={{fontSize:12,color:"#66857b",margin:"7px 0 4px"}}>{p?.packSize||p?.category||""}</p>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"10px",alignItems:"center",padding:"10px 0 14px"}}><strong style={{fontSize:22}}>{money(l.price)}</strong><span style={{fontSize:12,color:"#658477"}}>{l.stock} available</span></div>
      {qty?<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><button style={button} onClick={()=>change(l,-1)}>−</button><strong>{qty}</strong><button style={button} onClick={()=>change(l,1)}>+</button></div>:<button style={button} onClick={()=>change(l,1)}>+ Add to basket</button>}
    </article>;})}
  </div>}
  <section id="pickup-baskets" style={{marginTop:48,scrollMarginTop:30}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:16,flexWrap:"wrap",marginBottom:22}}>
      <div><p style={{letterSpacing:2,fontSize:11,fontWeight:700,color:"#41806e",margin:"0 0 8px"}}>YOUR NEIGHBOURHOOD ORDER</p><h2 style={{fontSize:"clamp(28px,3vw,38px)",margin:"0 0 8px"}}>Your pickup baskets <span style={{fontSize:17,fontWeight:400,color:"#729087"}}>({selected.reduce((n,x)=>n+x.quantity,0)} items)</span></h2><p style={{color:"#66847a",fontSize:14,margin:0}}>One pickup request per shop. You only visit after the shop accepts.</p></div>
      <span style={{background:"#e5f4ed",color:"#17664f",padding:"9px 13px",borderRadius:99,fontWeight:700,fontSize:12}}>● Pickup only · No delivery</span>
    </div>
    {!groups.length?<div style={{border:"1px solid #d9e8e0",borderRadius:18,padding:"40px 25px",background:"white",textAlign:"center"}}><div style={{fontSize:32,marginBottom:10}}>◈</div><strong style={{fontSize:20}}>Your basket is waiting for something good.</strong><p style={{color:"#67877d"}}>Browse nearby products and add your favourites.</p><a href="#" style={{color:"#116b57",fontWeight:700}}>Explore products ↑</a></div>:groups.map(g=>{
      const total=g.lines.reduce((sum,l)=>sum+Number(l.price)*l.quantity,0);
      const count=g.lines.reduce((sum,l)=>sum+l.quantity,0);
      const localityName=g.lines[0]?.locality;
      return <div key={g.id} style={{marginBottom:24,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:18,alignItems:"start"}}>
        <div style={{background:"white",border:"1px solid #d9e8e0",borderRadius:20,overflow:"hidden",minWidth:0}}>
          <div style={{padding:"20px 22px",borderBottom:"1px solid #e7efea",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div><div style={{fontSize:11,letterSpacing:1.5,color:"#568579",fontWeight:700,marginBottom:6}}>PICKUP FROM</div><strong style={{fontSize:21}}>{g.name}</strong>{localityName&&<div style={{fontSize:13,color:"#708b80",marginTop:4}}>{localityName}</div>}</div>
            <span style={{fontSize:12,color:"#2c715e",background:"#ecf6ef",padding:"8px 11px",borderRadius:99}}>{count} {count===1?"item":"items"}</span>
          </div>
          {g.lines.map((l,index)=>{const p=products.get(l.product_id);const photo=imageFor(p);return <div key={l.product_id} style={{display:"flex",gap:16,padding:"20px 22px",borderBottom:index===g.lines.length-1?"none":"1px solid #edf2ee",alignItems:"start"}}>
            <div style={{width:96,height:100,flex:"0 0 96px",borderRadius:13,background:"#f0f6f1",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
              {photo?<img src={photo} alt={p?.name||"Product"} loading="lazy" referrerPolicy="no-referrer" style={{display:"block",width:"100%",height:"100%",objectFit:"contain",padding:8,boxSizing:"border-box"}}/>:<span style={{fontSize:11,color:"#729185",textAlign:"center"}}>Image unavailable</span>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <strong style={{fontSize:15,lineHeight:1.45,display:"block",overflowWrap:"anywhere"}}>{p?.name||l.product_id}</strong>
              <p style={{fontSize:12,color:"#729085",margin:"5px 0 10px"}}>{p?.packSize||p?.category||"Product"}</p>
              <strong style={{fontSize:18}}>{money(l.price)}</strong><span style={{fontSize:12,color:"#779187",marginLeft:7}}>each</span>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:12}}>
                <div style={{display:"inline-flex",alignItems:"center",border:"1px solid #c9ded3",borderRadius:10,overflow:"hidden"}}>
                  <button aria-label={"Decrease quantity of "+(p?.name||l.product_id)} onClick={()=>change(l,-1)} style={{border:0,background:"#f2f8f3",padding:"8px 13px",cursor:"pointer",fontWeight:700,color:"#145745"}}>−</button>
                  <span style={{minWidth:32,textAlign:"center",fontWeight:700,fontSize:13}}>{l.quantity}</span>
                  <button aria-label={"Increase quantity of "+(p?.name||l.product_id)} disabled={l.quantity>=l.stock} onClick={()=>change(l,1)} style={{border:0,background:"#f2f8f3",padding:"8px 13px",cursor:"pointer",fontWeight:700,color:"#145745",opacity:l.quantity>=l.stock?.4:1}}>+</button>
                </div>
                <button onClick={()=>setBasket(old=>{const next={...old};delete next[l.store_id+":"+l.product_id];return next;})} style={{border:0,background:"none",color:"#6d857b",fontSize:12,textDecoration:"underline",cursor:"pointer"}}>Remove</button>
              </div>
            </div>
            <strong style={{fontSize:16,whiteSpace:"nowrap"}}>{money(l.price*l.quantity)}</strong>
          </div>;})}
          <div style={{padding:"14px 22px",background:"#fafcf9",fontSize:12,color:"#6b877b"}}>✓ Shop prices confirmed at request time · Stock reserved only after acceptance</div>
        </div>
        <aside style={{background:"white",border:"1px solid #d9e8e0",borderRadius:20,padding:24,boxShadow:"0 10px 28px rgba(20,65,50,.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:20}}><h3 style={{fontSize:21,margin:0}}>Order summary</h3><span style={{fontSize:12,color:"#628378"}}>{count} items</span></div>
          <div style={{display:"grid",gap:13,fontSize:14}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#6a867b"}}>Items subtotal</span><strong>{money(total)}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#6a867b"}}>Pickup</span><strong style={{color:"#167253"}}>Free</strong></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#6a867b"}}>Online payment</span><span>Not required</span></div>
          </div>
          <div style={{borderTop:"1px dashed #cfdfd5",margin:"21px 0",paddingTop:18,display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong style={{fontSize:16}}>Estimated total</strong><strong style={{fontSize:28}}>{money(total)}</strong></div>
          <button disabled={busy} onClick={()=>void reserve(g)} style={{...button,width:"100%",fontSize:15,padding:"16px 12px",opacity:busy?.6:1}}>{busy?"Sending request…":"Request pickup →"}</button>
          <p style={{fontSize:12,color:"#69877b",lineHeight:1.6,margin:"14px 0 0",textAlign:"center"}}>Pay at the shop. Your reservation is pending until the retailer accepts it.</p>
          <div style={{background:"#f1f7f2",borderRadius:12,padding:"13px 15px",marginTop:20}}><strong style={{fontSize:13}}>How pickup works</strong><div style={{fontSize:12,color:"#55776a",lineHeight:1.8,marginTop:6}}>1. Send your request<br />2. Shop confirms availability<br />3. Collect during your pickup window</div></div>
        </aside>
      </div>;
    })}
  </section>
  {user&&<section style={{marginTop:32}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2>Your reservations</h2><button style={{...button,background:"#e6f0e9",color:"#143e38"}} onClick={()=>void loadOrders()}>Refresh status</button></div>{orders.length===0?<p>No reservations yet.</p>:orders.map(o=>{const remaining=o.expires_at?Math.max(0,Math.ceil((new Date(o.expires_at).getTime()-now)/1000)):null;return <div key={o.id} style={{border:"1px solid #d9e8e0",borderRadius:14,padding:18,background:"white",marginBottom:10}}><strong>#{o.id.slice(0,8).toUpperCase()} · {stores.get(o.store_id)||"Shop"}</strong><p style={{textTransform:"capitalize"}}>{o.status}</p>{o.status==="accepted"&&remaining!==null&&<p style={{color:"#14634f",fontWeight:700}}>{remaining>0?`Collect within ${Math.floor(remaining/60)}m ${String(remaining%60).padStart(2,"0")}s`:"Collection window ended; awaiting server confirmation"}</p>}</div>;})}</section>}
  <p style={{marginTop:30,fontSize:12,color:"#6e877d"}}>Internal test preview. Source images require publication rights. No delivery, online payment or pickup OTP verification is enabled.</p>
 </main>;
}
