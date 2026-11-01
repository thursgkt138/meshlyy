"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import {supabase,useRetailerStore} from "../catalog/use-retailer-store";
type P={id:string;name:string;category:string};
type Adjustment={id:string;product_id:string;previous_stock:number;new_stock:number;delta:number;reason:string;note:string|null;created_at:string};
const names=new Map((catalog as P[]).map(p=>[p.id,p.name]));
const field:React.CSSProperties={width:"100%",padding:12,borderRadius:9,border:"1px solid #cadfd3",boxSizing:"border-box"};
const btn:React.CSSProperties={background:"#143e38",color:"white",border:0,borderRadius:10,padding:"12px 16px",fontWeight:700,cursor:"pointer"};
export default function StockAdjustments(){
 const store=useRetailerStore();
 const [product,setProduct]=useState("");
 const [direction,setDirection]=useState("add");
 const [quantity,setQuantity]=useState("1");
 const [reason,setReason]=useState("restock");
 const [note,setNote]=useState("");
 const [history,setHistory]=useState<Adjustment[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const reload=async()=>{if(!supabase||!store.storeId)return;const r=await supabase.from("stock_adjustments").select("id,product_id,previous_stock,new_stock,delta,reason,note,created_at").eq("store_id",store.storeId).order("created_at",{ascending:false}).limit(100);if(r.error)setMessage(r.error.message);else setHistory((r.data||[]) as Adjustment[]);};
 useEffect(()=>{void reload();},[store.storeId]);
 const submit=async()=>{
   const n=Number(quantity);
   if(!supabase||!store.storeId||!product||!Number.isInteger(n)||n<1||n>100000){setMessage("Select a product and enter a valid whole-number quantity.");return;}
   setBusy(true);setMessage("");
   const r=await supabase.rpc("adjust_store_stock",{p_store_id:store.storeId,p_product_id:product,p_delta:direction==="add"?n:-n,p_reason:reason,p_note:note});
   setBusy(false);
   if(r.error){setMessage(r.error.message);return;}
   setMessage("Stock updated successfully. New quantity: "+r.data);
   setQuantity("1");setNote("");await reload();
 };
 return <main style={{background:"#f7faf7",minHeight:"100vh",fontFamily:"Arial,sans-serif",color:"#14332e",padding:"28px max(18px,calc((100vw - 1100px)/2))"}}>
 <nav style={{display:"flex",gap:20,flexWrap:"wrap"}}><Link href="/retailer/dashboard">← Inventory</Link><Link href="/retailer/pos">POS checkout</Link></nav>
 <p style={{letterSpacing:2,fontSize:12,color:"#658478",marginTop:35}}>MESHLYY / INVENTORY CONTROL</p><h1>Stock adjustments</h1>
 <p style={{color:"#668277"}}>Record restocks, damaged goods, returns and physical stock-count corrections. Every adjustment is saved with its before and after quantities.</p>
 {!store.user?<p>Sign in from the <Link href="/retailer/catalog">retailer catalogue</Link>.</p>:!store.storeId?<p>Create a store first.</p>:<>
 <section style={{background:"white",border:"1px solid #dce9e1",borderRadius:18,padding:22,maxWidth:650,display:"grid",gap:15}}>
 <label>Product<select value={product} onChange={e=>setProduct(e.target.value)} style={{...field,marginTop:7}}><option value="">Choose stocked product</option>{store.items.slice().sort((a,b)=>(names.get(a.productId)||"").localeCompare(names.get(b.productId)||"")).map(i=><option key={i.productId} value={i.productId}>{names.get(i.productId)||i.productId} · {i.stock} available</option>)}</select></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}><label>Change<select value={direction} onChange={e=>setDirection(e.target.value)} style={{...field,marginTop:7}}><option value="add">Add stock (+)</option><option value="remove">Remove stock (−)</option></select></label><label>Quantity<input type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{...field,marginTop:7}}/></label></div>
 <label>Reason<select value={reason} onChange={e=>setReason(e.target.value)} style={{...field,marginTop:7}}><option value="restock">New stock received</option><option value="damage">Damaged / lost</option><option value="count_correction">Physical count correction</option><option value="return_to_stock">Customer return to stock</option><option value="other">Other</option></select></label>
 <label>Note (optional)<input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Supplier, reference, or reason…" style={{...field,marginTop:7}}/></label>
 <button style={btn} disabled={busy} onClick={()=>void submit()}>{busy?"Saving…":"Save stock adjustment"}</button>
 {message&&<p role="status">{message}</p>}
 </section>
 <section style={{marginTop:28,background:"white",border:"1px solid #dce9e1",borderRadius:18,padding:22}}><h2>Adjustment history</h2>
 {history.map(h=><div key={h.id} style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",padding:"14px 0",borderBottom:"1px solid #edf1ed"}}><div><strong>{names.get(h.product_id)||h.product_id}</strong><div style={{fontSize:12,color:"#668277",marginTop:5}}>{new Date(h.created_at).toLocaleString("en-IN")} · {h.reason.replaceAll("_"," ")}{h.note?" · "+h.note:""}</div></div><strong style={{color:h.delta>0?"#176a50":"#a14c3a"}}>{h.delta>0?"+":""}{h.delta} · {h.previous_stock} → {h.new_stock}</strong></div>)}
 {!history.length&&<p>No adjustments recorded yet.</p>}
 </section></>}
 </main>;
}
