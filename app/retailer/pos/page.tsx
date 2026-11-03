"use client";
import {decodePosDraft} from "../assistant/pos-draft";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {Search,X,Plus,Minus,Package,AlertTriangle,ReceiptText,IndianRupee,Clock3,ShoppingBasket,Trash2,Smartphone,Banknote,CreditCard,Wallet,ArrowRight,ArrowUpRight,ShieldCheck} from "lucide-react";
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
 const [voiceDraft,setVoiceDraft]=useState<{id:string;quantity:number}[]>([]);
 const [voiceDraftBusy,setVoiceDraftBusy]=useState(false);
 const [autoAddVoice,setAutoAddVoice]=useState(false);
 const autoAddStarted=useRef(false);
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
  if(error){setError("Bill sync (my_pos_bill_hold): "+error.message);return;}
  const rows=(data||[]) as {hold_id:string;product_id:string;quantity:number;expires_at:string}[];
  setHoldId(rows[0]?.hold_id||null);setHoldExpiry(rows[0]?.expires_at||null);
  const next:Record<string,number>={};for(const row of rows)next[row.product_id]=row.quantity;
  setCart(next);
 },[store.storeId]);
 useEffect(()=>{void refreshBill();},[refreshBill]);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(!store.storeId)return;const timer=window.setInterval(()=>{if(!cartLock.current)void refreshBill();},5000);return()=>window.clearInterval(timer);},[store.storeId,refreshBill]);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);const raw=params.get("voiceDraft");if(!raw)return;
  setAutoAddVoice(params.get("autoAddVoice")==="1");
  try{const lines=decodePosDraft(raw,new Set(byId.keys()));
   setVoiceDraft(lines);
  }catch{setError("Voice draft was invalid. Please create the bill manually.");}
  window.history.replaceState(null,"",window.location.pathname);
 },[]);
 const addVoiceDraft=async()=>{
  if(!supabase||!store.storeId||voiceDraftBusy||cartLock.current)return;
  setVoiceDraftBusy(true);cartLock.current=true;setError("");
  try{
   const current=await supabase.rpc("my_pos_bill_hold",{p_store_id:store.storeId});
   if(current.error)throw current.error;
   const held=new Map<string,number>(((current.data||[]) as {product_id:string;quantity:number}[]).map(x=>[x.product_id,x.quantity]));
   for(const line of voiceDraft){
    const target=(held.get(line.id)||0)+line.quantity;
    if(target>100)throw Error("Maximum 100 units per item");
    const result=await supabase.rpc("set_pos_bill_quantity",{p_store_id:store.storeId,p_product_id:line.id,p_quantity:target});
    if(result.error)throw result.error;
    held.set(line.id,target);
   }
   setVoiceDraft([]);setNotice("Voice items added to the held bill. Verify all items before checkout.");
  }catch(e){setError("Could not add all voice items: "+String(e)+". Check the cart before retrying.");setVoiceDraft([]);}
  finally{await refreshBill();cartLock.current=false;setVoiceDraftBusy(false);}
 };
 useEffect(()=>{if(!autoAddVoice||!voiceDraft.length||!store.storeId||autoAddStarted.current)return;autoAddStarted.current=true;setAutoAddVoice(false);void addVoiceDraft();},[autoAddVoice,voiceDraft,store.storeId]);
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
   if(error)setError("Add/update item (set_pos_bill_quantity): "+error.message);
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
 return <main className="pos-studio">
  <div className="pos-heading"><div><div className="pos-eyebrow">RETAIL OPERATIONS <span> / </span> POINT OF SALE</div><h1>Sell in store<span className="pos-title-dot">.</span></h1><p>Fast checkout, connected to your live inventory.</p></div><div className="pos-heading-actions"><Link href="/retailer/sales">Sales history <ArrowUpRight size={16}/></Link><Link href="/retailer/stock">Manage stock <ArrowUpRight size={16}/></Link></div></div>
  {store.loading?<p className="pos-message">Loading store…</p>:!store.user?<p className="pos-message">Sign in at <Link href="/retailer/login">retailer login</Link>.</p>:!store.storeId?<p className="pos-message">Create a store from the <Link href="/retailer/catalog">catalogue</Link> first.</p>:<>
  <div className="pos-summary"><div className="pos-stat"><span className="pos-stat-icon"><Package size={19}/></span><div><small>Available products</small><strong>{available.length}</strong></div></div><div className="pos-stat"><span className="pos-stat-icon"><AlertTriangle size={19}/></span><div><small>Low stock</small><strong>{store.items.filter(i=>i.stock>0&&i.stock<=5).length}</strong></div></div><div className="pos-stat"><span className="pos-stat-icon"><ReceiptText size={19}/></span><div><small>Recent transactions</small><strong>{sales.length}</strong></div></div><div className="pos-stat"><span className="pos-stat-icon"><IndianRupee size={19}/></span><div><small>Today's POS sales</small><strong>{money(todaySales.reduce((sum,x)=>sum+Number(x.total),0))}</strong></div></div></div>
  {error&&<div className="pos-alert" role="alert">{error}</div>}{notice&&<div className="pos-success" role="status">{notice}</div>}
  {voiceDraft.length>0&&<section style={{background:"#eaf5ed",border:"1px solid #b8d9c5",padding:20,borderRadius:14,marginBottom:20}}><h2 style={{fontSize:18,margin:"0 0 10px"}}>Voice bill — review before adding</h2>{voiceDraft.map(line=><p key={line.id} style={{fontSize:13}}>{byId.get(line.id)?.name||line.id} × {line.quantity}</p>)}<div style={{display:"flex",gap:10}}><button type="button" disabled={voiceDraftBusy} onClick={()=>void addVoiceDraft()} style={button}>{voiceDraftBusy?"Adding…":"Add to POS cart"}</button><button type="button" onClick={()=>setVoiceDraft([])}>Discard</button></div><p style={{fontSize:11}}>This creates a temporary stock hold, not a completed sale. Verify the bill and payment method before checkout.</p></section>}
  <div className="pos-workspace">
   <section className="pos-products"><div className="pos-section-head"><div><span className="pos-section-kicker">PRODUCT LIBRARY</span><h2>Find a product</h2></div><span className="pos-count">{available.length} available</span></div>
    <div className="pos-search"><Search size={19}/><input aria-label="Search stocked products" placeholder="Search by product name or category" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery("")}><X size={17}/></button>}</div>
    <div className="pos-product-list">{matches.map(i=>{const p=byId.get(i.productId);const image=photo(p);return <div className="pos-product-row" key={i.productId}>
     <div className="pos-product-image">{image?<img src={image} alt={p?.name||"Product"} referrerPolicy="no-referrer"/>:<Package size={23}/>}</div>
     <div className="pos-product-details"><strong>{p?.name||i.productId}</strong><span>{p?.packSize||p?.category||"Product"} <i>·</i> {i.stock} available</span></div>
     <div className="pos-product-right"><strong>{money(i.price)}</strong>{cart[i.productId]>0?<div className="pos-inline-qty"><button aria-label={"Remove one "+(p?.name||"product")} disabled={cartBusy} onClick={()=>void change(i.productId,-1)}><Minus size={16}/></button><strong>{cart[i.productId]}</strong><button aria-label={"Add one "+(p?.name||"product")} disabled={cartBusy||secondsLeft===0} onClick={()=>void change(i.productId,1)}><Plus size={16}/></button></div>:<button className="pos-add" aria-label={"Add "+(p?.name||"product")+" to bill"} disabled={cartBusy||(secondsLeft===0&&!!holdId)} onClick={()=>void change(i.productId,1)}><Plus size={18}/><span>Add</span></button>}</div>
    </div>;})}{!matches.length&&<div className="pos-empty"><Search size={25}/><strong>No products found</strong><p>Try a different product name or category.</p></div>}</div>
    <div className="pos-list-foot">Stock is reserved when you add a product to the bill.</div>
   </section>
   <aside className="pos-bill"><div className="pos-section-head pos-bill-head"><div><span className="pos-section-kicker">CHECKOUT</span><h2>Current bill</h2></div><span className="pos-count">{lines.reduce((sum,l)=>sum+l.quantity,0)} items</span></div>
    {holdId&&<div className={"pos-hold"+(secondsLeft<=15?" pos-hold-urgent":"")} role="status"><Clock3 size={16}/><span>{secondsLeft>0?"Stock reserved for this bill":"Reservation expired"}</span><strong>{secondsLeft}s</strong></div>}
    <div className="pos-bill-lines">{lines.length?lines.map(l=><div className="pos-bill-line" key={l.productId}><div className="pos-bill-item"><strong>{l.product?.name||l.productId}</strong><small>{money(l.price)} each</small></div><div className="pos-bill-line-bottom"><div className="pos-qty"><button aria-label="Decrease quantity" disabled={cartBusy} onClick={()=>void change(l.productId,-1)}><Minus size={15}/></button><span>{l.quantity}</span><button aria-label="Increase quantity" disabled={cartBusy||secondsLeft===0} onClick={()=>void change(l.productId,1)}><Plus size={15}/></button></div><strong>{money(l.price*l.quantity)}</strong></div></div>):<div className="pos-bill-empty"><span><ShoppingBasket size={30} strokeWidth={1.5}/></span><strong>Your bill is empty</strong><p>Add products from the list to start a new sale.</p></div>}</div>
    {holdId&&<button type="button" className="pos-cancel" disabled={cartBusy||saving} onClick={()=>void releaseBill()}><Trash2 size={15}/> Cancel bill & release stock</button>}
    <div className="pos-checkout"><div className="pos-total"><span>Total payable</span><strong>{money(total)}</strong></div><span className="pos-pay-label">PAYMENT METHOD</span><div className="pos-pay-options">{[["upi","UPI",Smartphone],["cash","Cash",Banknote],["card","Card",CreditCard],["other","Other",Wallet]].map(([value,label,Icon])=>{const PaymentIcon=Icon as typeof Smartphone;return <button type="button" key={value as string} className={method===value?"selected":""} aria-pressed={method===value} onClick={()=>setMethod(value as string)}><PaymentIcon size={17}/>{label as string}</button>;})}</div>
    <button className="pos-checkout-button" disabled={!lines.length||saving||cartBusy||secondsLeft===0} onClick={()=>void checkout()}>{saving?"Recording sale…":<>Complete sale <ArrowRight size={18}/></>}</button><p className="pos-checkout-note"><ShieldCheck size={14}/> Record the sale only after receiving payment.</p></div>
   </aside>
  </div>
  <section className="pos-history"><div className="pos-section-head"><div><span className="pos-section-kicker">ACTIVITY</span><h2>Recent sales</h2></div><Link href="/retailer/sales">View all <ArrowUpRight size={16}/></Link></div><div className="pos-history-list">{sales.length?sales.slice(0,6).map(s=><div className="pos-history-row" key={s.id}><div className="pos-history-icon"><ReceiptText size={17}/></div><div><strong>Sale #{s.id.slice(0,8).toUpperCase()}</strong><small>{new Date(s.created_at).toLocaleString("en-IN")} · {s.payment_method.toUpperCase()}</small></div><strong>{money(s.total)}</strong></div>):<p className="pos-history-empty">No sales recorded yet.</p>}</div></section>
  </>}
  <style jsx global>{`
.pos-studio{max-width:1510px;margin:auto;padding:32px 34px 70px!important;min-height:calc(100vh - 72px)!important;background:#f8faf9!important;color:#1c3029!important;font-family:var(--sans,"DM Sans",Arial,sans-serif)!important}
.pos-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap;margin-bottom:27px}.pos-eyebrow,.pos-section-kicker{font-size:10px;font-weight:750;letter-spacing:1.45px;color:#82978a}.pos-eyebrow span{padding:0 7px;color:#b9c6bd}.pos-heading h1{font-size:clamp(29px,3vw,39px);letter-spacing:-1.6px;line-height:1.2;font-weight:750;margin:10px 0 8px}.pos-title-dot{color:#34a978}.pos-heading p{font-size:13px;color:#84928a;margin:0}.pos-heading-actions{display:flex;gap:9px}.pos-heading-actions a,.pos-history .pos-section-head a{display:inline-flex;align-items:center;gap:6px;padding:10px 12px;border:1px solid #e5ece7;background:#fff;border-radius:9px;color:#426552;font-size:12px;font-weight:650;text-decoration:none}
.pos-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:22px}.pos-stat{display:flex;align-items:center;gap:14px;padding:18px 19px;border:1px solid #e7ede9;border-radius:14px;background:#fff;min-width:0}.pos-stat-icon{width:39px;height:39px;flex:none;display:grid;place-items:center;background:#f0f6f1;color:#2e7757;border-radius:11px}.pos-stat small{display:block;font-size:11px;color:#829087;margin-bottom:6px}.pos-stat strong{font-size:23px;font-weight:750;letter-spacing:-.7px}.pos-alert,.pos-success{border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px}.pos-alert{background:#fff1ed;color:#9a3c2c}.pos-success{background:#e9f8ee;color:#176544}
.pos-workspace{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(340px,1fr);gap:18px;align-items:start}.pos-products,.pos-bill,.pos-history{background:#fff;border:1px solid #e6ede8;border-radius:17px;overflow:hidden;box-shadow:0 4px 18px #1c423006}.pos-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:23px 24px 18px}.pos-section-head h2{font-size:18px;font-weight:750;letter-spacing:-.45px;margin:7px 0 0}.pos-count{padding:7px 10px;border-radius:8px;background:#f3f7f4;color:#658375;font-size:11px;font-weight:700;white-space:nowrap}
.pos-search{display:flex;align-items:center;gap:11px;margin:0 24px 15px;padding:0 13px;height:47px;border:1px solid #e2eae4;background:#f9fbf9;border-radius:11px;color:#8a9c8f}.pos-search:focus-within{border-color:#69a98c;background:#fff}.pos-search input{background:transparent;outline:none;border:0;width:100%;min-width:0;font-size:13px;color:#1b372a}.pos-search input::placeholder{color:#9ba8a0}.pos-search button{border:0;background:transparent;color:#8b9d90;display:grid;place-items:center}
.pos-product-list{max-height:610px;overflow-y:auto;padding:0 15px 12px}.pos-product-row{display:flex;align-items:center;gap:14px;padding:12px 9px;border-bottom:1px solid #f0f3f0}.pos-product-row:last-child{border-bottom:0}.pos-product-row:hover{background:#fafcfb;border-radius:10px}.pos-product-image{width:62px;height:62px;flex:0 0 62px;display:grid;place-items:center;background:#f4f7f3;border-radius:10px;overflow:hidden;color:#a0b3a5}.pos-product-image img{width:100%;height:100%;object-fit:contain;padding:4px}.pos-product-details{flex:1;min-width:0}.pos-product-details strong{display:block;font-size:12.5px;font-weight:700;line-height:1.45}.pos-product-details span{display:block;margin-top:6px;font-size:11px;color:#86988c}.pos-product-details i{font-style:normal;margin:0 3px}.pos-product-right{display:flex;align-items:center;gap:15px}.pos-product-right>strong{font-size:13px;white-space:nowrap}.pos-add{display:flex;align-items:center;gap:5px;background:#edf6ef;border:1px solid #dcece1;color:#226a48;border-radius:9px;padding:9px 11px;font-size:11px;font-weight:750}.pos-inline-qty{display:flex;align-items:center;border:1px solid #b8ddc5;border-radius:9px;background:#edf8f0;overflow:hidden;color:#1c6944}.pos-inline-qty button{border:0;background:transparent;color:#206d47;width:31px;height:35px;display:grid;place-items:center;cursor:pointer}.pos-inline-qty button:disabled{opacity:.35;cursor:not-allowed}.pos-inline-qty strong{min-width:22px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums}.pos-add:hover{background:#dff0e4}.pos-add:disabled{opacity:.5}.pos-list-foot{border-top:1px solid #edf1ed;padding:14px 24px;font-size:11px;color:#9ba99f}
.pos-bill{position:sticky;top:88px}.pos-bill-head{border-bottom:1px solid #f0f2f0}.pos-hold{display:flex;align-items:center;gap:9px;margin:16px 22px 0;padding:10px 12px;background:#eff7f0;color:#327554;border-radius:9px;font-size:11px}.pos-hold strong{margin-left:auto;font-size:14px;font-variant-numeric:tabular-nums}.pos-hold-urgent{background:#fff0eb;color:#af4a2e}.pos-bill-lines{padding:0 23px;max-height:340px;overflow-y:auto}.pos-bill-line{padding:16px 0;border-bottom:1px solid #edf2ee}.pos-bill-item strong{display:block;font-size:12px;font-weight:700;line-height:1.4}.pos-bill-item small{display:block;font-size:11px;color:#8b9b8f;margin-top:4px}.pos-bill-line-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:10px}.pos-bill-line-bottom>strong{font-size:13px}.pos-qty{display:flex;align-items:center;border:1px solid #e1e9e3;border-radius:9px;overflow:hidden}.pos-qty button{background:#f8faf8;border:0;display:grid;place-items:center;width:31px;height:30px;color:#46755a}.pos-qty span{min-width:30px;text-align:center;font-size:12px;font-weight:750}.pos-bill-empty{display:grid;justify-items:center;text-align:center;padding:44px 16px;color:#8b9b90}.pos-bill-empty>span{display:grid;place-items:center;width:66px;height:66px;border-radius:20px;background:#f4f8f5;color:#86a58f;margin-bottom:14px}.pos-bill-empty strong{font-size:13px;color:#4e6b58}.pos-bill-empty p{max-width:190px;font-size:11px;line-height:1.7;margin-top:7px}.pos-cancel{display:flex;align-items:center;gap:8px;background:transparent;color:#9c6259;border:0;padding:13px 23px;font-size:11px;font-weight:650}.pos-checkout{padding:22px 23px 20px;background:#fbfcfb;border-top:1px solid #edf1ed}.pos-total{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:22px}.pos-total span{font-size:12px;color:#728477}.pos-total strong{font-size:27px;letter-spacing:-1px;font-weight:800}.pos-pay-label{font-size:10px;letter-spacing:1.1px;font-weight:750;color:#8c9c91}.pos-pay-options{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0 19px}.pos-pay-options button{display:grid;justify-items:center;gap:7px;padding:12px 2px;border:1px solid #e5ebe6;background:#fff;border-radius:10px;color:#85948a;font-size:10px;font-weight:650}.pos-pay-options button.selected{background:#eaf6ee;border-color:#70b68e;color:#176542}.pos-checkout-button{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:15px;background:#174d3b;color:#fff;border:0;border-radius:10px;font-size:13px;font-weight:750}.pos-checkout-button:hover{background:#0e3d2c}.pos-checkout-button:disabled{opacity:.45}.pos-checkout-note{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;color:#9ba99e;margin:12px 0 0}
.pos-history{margin-top:19px}.pos-history .pos-section-head{border-bottom:1px solid #eef2ee}.pos-history-list{padding:0 24px}.pos-history-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #eff2ef}.pos-history-row:last-child{border:0}.pos-history-icon{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:9px;background:#f2f7f3;color:#5a8568}.pos-history-row>div:nth-child(2){flex:1;min-width:0}.pos-history-row strong{font-size:12px;font-weight:700}.pos-history-row small{display:block;margin-top:5px;font-size:10px;color:#90a093}.pos-history-empty{padding:22px 0;font-size:12px;color:#90a093}
@media(max-width:1100px){.pos-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pos-workspace{grid-template-columns:minmax(0,1fr) minmax(310px,.85fr)}}@media(max-width:850px){.pos-studio{padding:23px 15px 95px!important}.pos-workspace{grid-template-columns:minmax(0,1fr)}.pos-bill{position:static}.pos-heading-actions{display:none}.pos-product-list{max-height:420px}}@media(max-width:500px){.pos-summary{gap:8px}.pos-stat{padding:13px 10px;gap:8px}.pos-stat-icon{width:32px;height:32px}.pos-stat strong{font-size:18px}.pos-section-head{padding:19px 17px 15px}.pos-search{margin:0 17px 12px}.pos-product-list{padding:0 9px 10px}.pos-product-image{width:49px;height:49px;flex-basis:49px}.pos-product-right{gap:7px;flex-direction:column;align-items:flex-end}.pos-add{padding:7px}.pos-add span{display:none}}
`}</style>
 </main>;
}
