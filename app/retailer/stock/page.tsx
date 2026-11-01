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
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get("product");if(id)setProduct(id);},[]);
 const [direction,setDirection]=useState("add");
 const [quantity,setQuantity]=useState("1");
 const [reason,setReason]=useState("restock");
 const [note,setNote]=useState("");
 const [history,setHistory]=useState<Adjustment[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [historyQuery,setHistoryQuery]=useState("");
 const [historyFilter,setHistoryFilter]=useState("all");
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
 const chosen=store.items.find(i=>i.productId===product);
 const low=store.items.filter(i=>i.stock>0&&i.stock<=5).length;
 const out=store.items.filter(i=>i.stock===0).length;
 const filteredHistory=history.filter(h=>(historyFilter==="all"||(historyFilter==="add"?h.delta>0:h.delta<0))&&(names.get(h.product_id)||h.product_id).toLowerCase().includes(historyQuery.toLowerCase()));
 return <main style={{background:"#f3f6f3",minHeight:"100vh",fontFamily:"Arial,sans-serif",color:"#14332e",padding:"28px max(18px,calc((100vw - 1250px)/2))"}}>
 <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap"}}><Link href="/retailer/dashboard" style={{fontWeight:800,color:"#143e38",textDecoration:"none"}}>◈ meshlyy / Retail studio</Link><div style={{display:"flex",gap:18,flexWrap:"wrap"}}><Link href="/retailer/dashboard">Dashboard</Link><Link href="/retailer/pos">POS checkout</Link><Link href="/retailer/sales">Sales & reports</Link></div></nav>
 <p style={{letterSpacing:2,fontSize:12,color:"#658478",marginTop:40}}>OPERATIONS / INVENTORY CONTROL</p><h1 style={{fontSize:"clamp(36px,5vw,54px)",letterSpacing:"-2px",margin:"10px 0"}}>Stock control centre</h1>
 <p style={{color:"#668277"}}>Record restocks, damaged goods, returns and physical stock-count corrections. Every adjustment is saved with its before and after quantities.</p>
 <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,margin:"26px 0"}}>{[["Products tracked",store.items.length],["Low-stock alerts",low],["Out of stock",out],["Adjustments recorded",history.length]].map(([k,v])=><div key={k} style={{background:"white",padding:23,borderRadius:18,border:"1px solid #dce8df",boxShadow:"0 8px 30px #163b2c08"}}><small style={{color:"#668277"}}>{k}</small><strong style={{fontSize:30,display:"block",marginTop:10}}>{v}</strong></div>)}</section>
 {!store.user?<p>Sign in from the <Link href="/retailer/catalog">retailer catalogue</Link>.</p>:!store.storeId?<p>Create a store first.</p>:<>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))",gap:20,alignItems:"start"}}><section style={{background:"white",border:"1px solid #dce9e1",borderRadius:22,padding:28,display:"grid",gap:17,boxShadow:"0 14px 38px #163b2c08"}}><div><p style={{fontSize:12,color:"#6c9081",letterSpacing:2,margin:0}}>RECORD MOVEMENT</p><h2 style={{fontSize:25,margin:"8px 0 0"}}>New stock adjustment</h2></div>
 <label>Product<select value={product} onChange={e=>setProduct(e.target.value)} style={{...field,marginTop:7}}><option value="">Choose stocked product</option>{store.items.slice().sort((a,b)=>(names.get(a.productId)||"").localeCompare(names.get(b.productId)||"")).map(i=><option key={i.productId} value={i.productId}>{names.get(i.productId)||i.productId} · {i.stock} available</option>)}</select></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}><label>Change<select value={direction} onChange={e=>setDirection(e.target.value)} style={{...field,marginTop:7}}><option value="add">Add stock (+)</option><option value="remove">Remove stock (−)</option></select></label><label>Quantity<input type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} style={{...field,marginTop:7}}/></label></div>
 <label>Reason<select value={reason} onChange={e=>setReason(e.target.value)} style={{...field,marginTop:7}}><option value="restock">New stock received</option><option value="damage">Damaged / lost</option><option value="count_correction">Physical count correction</option><option value="return_to_stock">Customer return to stock</option><option value="other">Other</option></select></label>
 <label>Note (optional)<input value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Supplier, reference, or reason…" style={{...field,marginTop:7}}/></label>
 {chosen&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#eff7f1",padding:16,borderRadius:14}}><span>Current stock</span><strong style={{fontSize:23}}>{chosen.stock} units</strong></div>}
 <button style={{...btn,padding:17,fontSize:15}} disabled={busy} onClick={()=>void submit()}>{busy?"Saving…":"Confirm stock movement →"}</button>
 {message&&<p role="status">{message}</p>}
 </section><aside style={{background:"#143e38",color:"white",borderRadius:22,padding:28,minHeight:340}}><p style={{fontSize:12,letterSpacing:2,color:"#a8d8c4"}}>INVENTORY INTELLIGENCE</p><h2 style={{fontSize:29,margin:"12px 0"}}>Keep your shelves ready.</h2><p style={{color:"#c9dfd6",lineHeight:1.7}}>Use real-time inventory signals to spot potential stockouts. Recommendations are rules-based and use your store data.</p><div style={{display:"grid",gap:12,marginTop:25}}><div style={{background:"#ffffff14",borderRadius:15,padding:18}}><strong>{out} products unavailable</strong><p style={{fontSize:13,color:"#c9dfd6"}}>Review products with zero stock before shoppers search for them.</p></div><div style={{background:"#ffffff14",borderRadius:15,padding:18}}><strong>{low} products running low</strong><p style={{fontSize:13,color:"#c9dfd6"}}>Items with 1–5 units are flagged for review.</p></div><div style={{background:"#ffffff14",borderRadius:15,padding:18}}><strong>Audit trail enabled</strong><p style={{fontSize:13,color:"#c9dfd6"}}>Each adjustment records the reason and before/after quantity.</p></div></div><Link href="/retailer/dashboard" style={{display:"inline-block",marginTop:25,color:"#b8f2d7",fontWeight:700}}>Return to dashboard →</Link></aside></div>
 <section style={{marginTop:28,background:"white",border:"1px solid #dce9e1",borderRadius:22,padding:28}}><div style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap",alignItems:"center"}}><div><p style={{fontSize:12,letterSpacing:2,color:"#63887c"}}>AUDIT LOG</p><h2 style={{fontSize:26,margin:"4px 0 18px"}}>Movement history</h2></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input aria-label="Search adjustment history" value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)} placeholder="Search products…" style={{...field,width:190}}/><select aria-label="Movement type" value={historyFilter} onChange={e=>setHistoryFilter(e.target.value)} style={{...field,width:140}}><option value="all">All movements</option><option value="add">Added</option><option value="remove">Removed</option></select></div></div>
 {filteredHistory.map(h=><div key={h.id} style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",padding:"14px 0",borderBottom:"1px solid #edf1ed"}}><div><strong>{names.get(h.product_id)||h.product_id}</strong><div style={{fontSize:12,color:"#668277",marginTop:5}}>{new Date(h.created_at).toLocaleString("en-IN")} · {h.reason.replaceAll("_"," ")}{h.note?" · "+h.note:""}</div></div><strong style={{color:h.delta>0?"#176a50":"#a14c3a"}}>{h.delta>0?"+":""}{h.delta} · {h.previous_stock} → {h.new_stock}</strong></div>)}
 {!filteredHistory.length&&<p>{history.length?"No matching movements.":"No adjustments recorded yet."}</p>}
 </section></>}
 </main>;
}
