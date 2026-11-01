"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import {supabase,useRetailerStore} from "../catalog/use-retailer-store";
type P={id:string;name:string;packSize:string|null};
type Sale={id:string;store_id:string;total:number;payment_method:string;created_at:string};
type Line={sale_id:string;product_id:string;quantity:number;unit_price:number};
const names=new Map((catalog as P[]).map(p=>[p.id,p.name]));
const money=(v:number)=>"₹"+Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const panel:React.CSSProperties={background:"white",border:"1px solid #dce9e1",borderRadius:16,padding:20};
export default function SalesReports(){
 const store=useRetailerStore();
 const [sales,setSales]=useState<Sale[]>([]);
 const [lines,setLines]=useState<Line[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [range,setRange]=useState("7");
 useEffect(()=>{if(!supabase||!store.storeId)return;let alive=true;const client=supabase;void (async()=>{
  const r=await client.from("pos_sales").select("id,store_id,total,payment_method,created_at").eq("store_id",store.storeId).order("created_at",{ascending:false}).limit(1000);
  if(!alive)return;if(r.error){setError(r.error.message);return;}
  const rows=(r.data||[]) as Sale[];setSales(rows);
  if(rows.length){const d=await client.from("pos_sale_items").select("sale_id,product_id,quantity,unit_price").in("sale_id",rows.map(s=>s.id));if(!alive)return;if(d.error)setError(d.error.message);else setLines((d.data||[]) as Line[]);}
 })();return()=>{alive=false;};},[store.storeId]);
 const cutoff=Date.now()-Number(range)*86400000;
 const filtered=sales.filter(s=>new Date(s.created_at).getTime()>=cutoff);
 const revenue=filtered.reduce((a,s)=>a+Number(s.total),0);
 const units=lines.filter(l=>filtered.some(s=>s.id===l.sale_id)).reduce((a,l)=>a+l.quantity,0);
 const average=filtered.length?revenue/filtered.length:0;
 const breakdown=useMemo(()=>["upi","cash","card","other"].map(method=>({method,total:filtered.filter(s=>s.payment_method===method).reduce((a,s)=>a+Number(s.total),0)})),[filtered]);
 const receipt=sales.find(s=>s.id===selected);
 const receiptLines=lines.filter(l=>l.sale_id===selected);
 return <main style={{background:"#f7faf7",minHeight:"100vh",fontFamily:"Arial,sans-serif",color:"#14332e",padding:"26px max(18px,calc((100vw - 1100px)/2))"}}>
 <style>{`@media print {body *{visibility:hidden!important} #meshlyy-receipt,#meshlyy-receipt *{visibility:visible!important} #meshlyy-receipt{position:absolute!important;left:0;top:0;width:100%;border:0!important;box-shadow:none!important} .no-print{display:none!important}}`}</style>
 <nav className="no-print" style={{display:"flex",gap:18}}><Link href="/retailer/pos">← POS</Link><Link href="/retailer/dashboard">Inventory</Link></nav>
 <div className="no-print"><p style={{letterSpacing:2,fontSize:12,color:"#658478",marginTop:32}}>MESHLYY / POS REPORTING</p><h1>Sales & receipts</h1><p style={{color:"#69867a"}}>Walk-in POS transactions only. Pickup reservations are not included in these totals.</p></div>
 {!store.user?<p>Sign in from the <Link href="/retailer/catalog">retailer catalogue</Link>.</p>:!store.storeId?<p>Create your store first.</p>:<>
 <div className="no-print"><label>Reporting period <select value={range} onChange={e=>setRange(e.target.value)} style={{marginLeft:10,padding:9,borderRadius:8}}><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="3650">All available history</option></select></label>
 <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,margin:"20px 0"}}>{[["POS revenue",money(revenue)],["Transactions",filtered.length],["Units sold",units],["Average sale",money(average)]].map(([k,v])=><div key={k} style={panel}><small>{k}</small><strong style={{display:"block",fontSize:24,marginTop:9}}>{v}</strong></div>)}</section>
 <section style={panel}><h2>Payment breakdown</h2>{breakdown.map(b=><div key={b.method} style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}><span>{b.method.toUpperCase()}</span><strong>{money(b.total)}</strong></div>)}</section>
 {error&&<p role="alert" style={{color:"#a43b30"}}>{error}</p>}
 <section style={{...panel,marginTop:18}}><h2>Sale history</h2>{filtered.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,padding:"12px 0",borderBottom:"1px solid #edf2ee"}}><div><strong>#{s.id.slice(0,8).toUpperCase()}</strong><div style={{fontSize:12,color:"#6b877b"}}>{new Date(s.created_at).toLocaleString("en-IN")} · {s.payment_method.toUpperCase()}</div></div><strong>{money(s.total)}</strong><button onClick={()=>setSelected(s.id)} style={{padding:"9px 12px",background:"#143e38",color:"white",border:0,borderRadius:9,cursor:"pointer"}}>View receipt</button></div>)}{!filtered.length&&<p>No sales for this period.</p>}{sales.length>=1000&&<p>Showing the latest 1,000 sales; totals may exclude older transactions.</p>}</section></div>
 {receipt&&<section id="meshlyy-receipt" style={{...panel,maxWidth:500,margin:"24px auto",boxShadow:"0 12px 35px #143e3815"}}>
  <div style={{textAlign:"center",borderBottom:"1px dashed #b5c8be",paddingBottom:18}}><strong style={{fontSize:24}}>meshlyy</strong><h2 style={{margin:"8px 0"}}>{store.storeName}</h2><p style={{fontSize:12,color:"#668277",margin:0}}>IN-STORE SALE RECEIPT · NOT A TAX INVOICE</p></div>
  <p style={{fontSize:13}}>Receipt: #{receipt.id.slice(0,8).toUpperCase()}<br/>Date: {new Date(receipt.created_at).toLocaleString("en-IN")}<br/>Payment recorded: {receipt.payment_method.toUpperCase()}</p>
  <div style={{borderTop:"1px dashed #b5c8be",borderBottom:"1px dashed #b5c8be",padding:"12px 0"}}>{receiptLines.map(l=><div key={l.product_id} style={{display:"flex",justifyContent:"space-between",gap:10,margin:"9px 0",fontSize:13}}><span>{names.get(l.product_id)||l.product_id}<br/>{l.quantity} × {money(l.unit_price)}</span><strong>{money(l.quantity*l.unit_price)}</strong></div>)}</div>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:21,marginTop:15}}><strong>Total</strong><strong>{money(receipt.total)}</strong></div><p style={{textAlign:"center",fontSize:12,color:"#6b877b",marginTop:28}}>Thank you for shopping locally.</p>
  <div className="no-print" style={{display:"flex",gap:10}}><button onClick={()=>window.print()} style={{background:"#143e38",color:"white",border:0,borderRadius:9,padding:12,cursor:"pointer"}}>Print / Save PDF</button><button onClick={()=>setSelected(null)} style={{border:"1px solid #cadfd3",borderRadius:9,padding:12,cursor:"pointer"}}>Close</button></div>
 </section>}</>}
 </main>;
}
