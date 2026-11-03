"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import images from "../../../meshlyy-source-image-references.json";
import {supabase,useRetailerStore} from "../catalog/use-retailer-store";
type Product={id:string;name:string;category:string;packSize:string|null};
type Sale={id:string;total:number;payment_method:string;created_at:string};
const byId=new Map((catalog as Product[]).map(p=>[p.id,p]));
const refs=images as Record<string,{url:string}>;
const photo=(p?:Product)=>p?refs[p.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()]?.url:null;
const money=(v:number)=>"₹"+Number(v).toLocaleString("en-IN",{maximumFractionDigits:2});
const button:React.CSSProperties={background:"#143e38",color:"#fff",border:0,borderRadius:10,padding:"12px 16px",fontWeight:700,cursor:"pointer"};
const panel:React.CSSProperties={background:"#fff",border:"1px solid #dce9e1",borderRadius:18,padding:20};
export default function RetailerPOS(){
 const store=useRetailerStore();
 const [query,setQuery]=useState("");
 const [cart,setCart]=useState<Record<string,number>>({});
 const [holdId,setHoldId]=useState<string|null>(null);
 const [holdExpiry,setHoldExpiry]=useState<string|null>(null);
 const [now,setNow]=useState(Date.now());
 const [cartBusy,setCartBusy]=useState(false);
 const cartLock=useRef(false);
 const [method,setMethod]=useState("upi");
 const [sales,setSales]=useState<Sale[]>([]);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const loadSales=useCallback(async()=>{
   if(!supabase||!store.storeId)return;
   const {data,error}=await supabase.from("pos_sales").select("id,total,payment_method,created_at").eq("store_id",store.storeId).order("created_at",{ascending:false}).limit(30);
   if(error)setError(error.message);else setSales((data||[]) as Sale[]);
 },[store.storeId]);
 useEffect(()=>{void loadSales();},[loadSales]);
 const refreshBill=useCallback(async()=>{
  if(!supabase||!store.storeId)return;
  const {data,error}=await supabase.rpc("my_pos_bill_hold",{p_store_id:store.storeId});
  if(error){setError("Bill sync: "+error.message);return;}
  const rows=(data||[]) as {hold_id:string;product_id:string;quantity:number;expires_at:string}[];
  setHoldId(rows[0]?.hold_id||null);setHoldExpiry(rows[0]?.expires_at||null);
  const next:Record<string,number>={};for(const row of rows)next[row.product_id]=row.quantity;
  setCart(next);
 },[store.storeId]);
 useEffect(()=>{void refreshBill();},[refreshBill]);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(!store.storeId)return;const timer=window.setInterval(()=>{if(!cartLock.current)void refreshBill();},5000);return()=>window.clearInterval(timer);},[store.storeId,refreshBill]);
 const available=store.items.filter(i=>i.active&&i.stock>0);
 const matches=available.filter(i=>{const p=byId.get(i.productId);return [p?.name,p?.category,p?.packSize].join(" ").toLowerCase().includes(query.toLowerCase());}).slice(0,60);
 const lines=Object.entries(cart).map(([id,quantity])=>{const i=store.items.find(x=>x.productId===id);return i?{...i,quantity,product:byId.get(id)}:null;}).filter((x):x is NonNullable<typeof x>=>!!x&&x.quantity>0);
 const total=lines.reduce((sum,l)=>sum+l.price*l.quantity,0);
 const change=async(id:string,delta:number)=>{
  if(!supabase||!store.storeId||cartLock.current)return;
  const target=Math.max(0,Math.min(100,(cart[id]||0)+delta));
  cartLock.current=true;setCartBusy(true);setError("");
  try{
   const {error}=await supabase.rpc("set_pos_bill_quantity",{p_store_id:store.storeId,p_product_id:id,p_quantity:target});
   if(error)setError(error.message);
   await refreshBill();
  }catch(e){setError(String(e));}
  finally{cartLock.current=false;setCartBusy(false);}
 };
 const checkout=async()=>{
   if(!supabase||!store.storeId||!lines.length||saving)return;
   setSaving(true);setError("");setNotice("");
   if(!holdId||!holdExpiry||new Date(holdExpiry).getTime()<=Date.now()){setSaving(false);setError("Bill hold expired. Add the items again.");await refreshBill();return;}
   const {data,error}=await supabase.rpc("complete_pos_bill_hold",{p_hold_id:holdId,p_payment_method:method});
   setSaving(false);
   if(error){setError(error.message);return;}
   setCart({});setHoldId(null);setHoldExpiry(null);setNotice("Sale recorded successfully · Receipt #"+String(data).slice(0,8).toUpperCase());
   await loadSales();
   window.location.reload();
 };
 const secondsLeft=holdExpiry?Math.max(0,Math.ceil((new Date(holdExpiry).getTime()-now)/1000)):0;
 const releaseBill=async()=>{
  if(!supabase||!holdId||cartLock.current)return;
  cartLock.current=true;setCartBusy(true);setError("");
  const {error}=await supabase.rpc("release_pos_bill_hold",{p_hold_id:holdId});
  if(error)setError(error.message);
  await refreshBill();cartLock.current=false;setCartBusy(false);
 };
 const today=new Date().toDateString();
 const todaySales=useMemo(()=>sales.filter(s=>new Date(s.created_at).toDateString()===today),[sales,today]);
 return <main style={{minHeight:"100vh",background:"#f7faf7",color:"#14332e",fontFamily:"Arial,sans-serif",padding:"26px max(18px,calc((100vw - 1250px)/2))"}}>
  <nav style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}><Link href="/retailer/dashboard" style={{color:"#176c56"}}>← Inventory dashboard</Link><Link href="/retailer/orders" style={{color:"#176c56"}}>Pickup orders</Link><Link href="/retailer/sales" style={{color:"#176c56"}}>Sales & receipts</Link><Link href="/retailer/stock" style={{color:"#176c56"}}>Stock adjustments</Link></nav>
  <p style={{fontSize:12,letterSpacing:2.5,color:"#5a8477",margin:"34px 0 7px"}}>MESHLYY / RETAILER STUDIO</p>
  <h1 style={{fontSize:"clamp(30px,5vw,48px)",margin:"0 0 8px"}}>In-store checkout.</h1>
  <p style={{color:"#668277",lineHeight:1.6}}>Bill walk-in customers from your live inventory. Items added to this bill reserve shared stock for 60 seconds. Complete checkout before expiry; cancelled bills release stock.</p>
  {store.loading?<p>Loading store…</p>:!store.user?<p>Sign in at <Link href="/retailer/catalog">retailer catalogue</Link>.</p>:!store.storeId?<p>Create a store from the <Link href="/retailer/catalog">catalogue</Link> first.</p>:<>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12,margin:"22px 0"}}>
    {[[ "Products in stock",available.length],["Low-stock products",store.items.filter(i=>i.stock>0&&i.stock<=5).length],["Recent sales",sales.length],["Today's sales",money(todaySales.reduce((s,x)=>s+Number(x.total),0))]].map(([label,value])=><div key={label} style={panel}><div style={{fontSize:12,color:"#658577"}}>{label}</div><strong style={{display:"block",fontSize:25,marginTop:10}}>{value}</strong></div>)}
   </section>
   {error&&<p role="alert" style={{color:"#ad4034"}}>{error}</p>}{notice&&<p role="status" style={{color:"#166c50"}}>{notice}</p>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,390px),1fr))",gap:18,alignItems:"start"}}>
    <section style={panel}><h2 style={{marginTop:0}}>Find products</h2><input aria-label="Search stocked products" placeholder="Search products in your shop…" value={query} onChange={e=>setQuery(e.target.value)} style={{width:"100%",padding:13,border:"1px solid #cadfd3",borderRadius:10,boxSizing:"border-box",marginBottom:16}}/>
     <div style={{display:"grid",gap:10,maxHeight:620,overflowY:"auto"}}>
      {matches.map(i=>{const p=byId.get(i.productId);const image=photo(p);return <div key={i.productId} style={{display:"flex",alignItems:"center",gap:12,padding:10,border:"1px solid #edf1ed",borderRadius:12}}>
       <div style={{height:62,width:62,flex:"0 0 62px",background:"#f1f7f2",borderRadius:9,overflow:"hidden"}}>{image?<img src={image} alt={p?.name||"Product"} referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:null}</div>
       <div style={{flex:1,minWidth:0}}><strong style={{fontSize:13,display:"block"}}>{p?.name||i.productId}</strong><small style={{color:"#718d7f"}}>{i.stock} in stock · {money(i.price)}</small></div>
       <button style={{...button,padding:"9px 12px"}} disabled={cartBusy||secondsLeft===0&&!!holdId} onClick={()=>void change(i.productId,1)}>+ Add</button>
      </div>;})}
      {!matches.length&&<p style={{color:"#6e887c"}}>No matching stocked products.</p>}
     </div>
    </section>
    <aside style={{...panel,position:"sticky",top:15}}><h2 style={{marginTop:0}}>Current bill <span style={{fontSize:13,fontWeight:400,color:"#739083"}}>({lines.reduce((s,l)=>s+l.quantity,0)} items)</span></h2>
     {lines.length?lines.map(l=><div key={l.productId} style={{borderBottom:"1px solid #e8f0ea",padding:"13px 0",display:"flex",gap:10,alignItems:"center"}}>
      <div style={{flex:1,minWidth:0}}><strong style={{fontSize:13}}>{l.product?.name||l.productId}</strong><div style={{fontSize:12,color:"#658478"}}>{money(l.price)} each</div></div>
      <button aria-label="Decrease quantity" disabled={cartBusy} onClick={()=>void change(l.productId,-1)} style={{...button,padding:"7px 11px"}}>−</button><strong>{l.quantity}</strong><button aria-label="Increase quantity" disabled={cartBusy||secondsLeft===0} onClick={()=>void change(l.productId,1)} style={{...button,padding:"7px 11px"}}>+</button>
      <strong style={{minWidth:62,textAlign:"right"}}>{money(l.price*l.quantity)}</strong>
     </div>):<p style={{color:"#738b80"}}>Add products to start a bill.</p>}
     {holdId&&<p role="status" style={{fontSize:13,color:secondsLeft?"#176c56":"#b43e36"}}>Reserved in shared inventory · {secondsLeft}s remaining {secondsLeft===0?"· Expired":""}</p>}
     {holdId&&<button type="button" disabled={cartBusy||saving} onClick={()=>void releaseBill()} style={{...button,background:"#f0f5f1",color:"#173f35",marginBottom:12}}>Cancel bill & release stock</button>}
     <div style={{display:"flex",justifyContent:"space-between",fontSize:22,margin:"22px 0"}}><strong>Total</strong><strong>{money(total)}</strong></div>
     <label style={{fontSize:13,fontWeight:700}}>Payment method<select value={method} onChange={e=>setMethod(e.target.value)} style={{display:"block",width:"100%",padding:12,margin:"8px 0 15px",borderRadius:10,border:"1px solid #cbded3"}}><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></label>
     <button disabled={!lines.length||saving||cartBusy||secondsLeft===0} onClick={()=>void checkout()} style={{...button,width:"100%",padding:16,opacity:!lines.length||saving?.5:1}}>{saving?"Recording sale…":"Complete in-store sale"}</button>
     <p style={{fontSize:12,color:"#718b7e",lineHeight:1.5}}>Record payment only after receiving it. This does not process payments or affect reserved pickup orders.</p>
    </aside>
   </div>
   <section style={{...panel,marginTop:20}}><h2 style={{marginTop:0}}>Recent in-store sales</h2>
    {sales.length?sales.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #edf2ee",flexWrap:"wrap"}}><span>#{s.id.slice(0,8).toUpperCase()} · {new Date(s.created_at).toLocaleString("en-IN")} · {s.payment_method.toUpperCase()}</span><strong>{money(s.total)}</strong></div>):<p style={{color:"#718a7e"}}>No POS sales yet.</p>}
    {sales.length>=30&&<p style={{fontSize:12,color:"#718a7e"}}>Showing the 30 most recent sales. Today's total above is based on these records only.</p>}
   </section>
  </>}
 </main>;
}
