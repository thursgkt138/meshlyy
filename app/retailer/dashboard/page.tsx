"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import catalog from "../../meshlyy-master-catalog.json";
import { useRetailerStore } from "../catalog/use-retailer-store";

type Product = {id:string;name:string;category:string;packSize:string|null;mrpReference:number|null};
const products=catalog as Product[];
const byId=new Map(products.map(p=>[p.id,p]));
const currency=(n:number)=>"₹"+n.toLocaleString("en-IN",{maximumFractionDigits:2});
const field:React.CSSProperties={border:"1px solid #c8dcd4",borderRadius:10,padding:"11px 12px",background:"#fff",color:"#143e38",width:"100%",boxSizing:"border-box"};
const button:React.CSSProperties={background:"#143e38",color:"white",border:0,borderRadius:10,padding:"12px 18px",cursor:"pointer",fontWeight:700};
export default function RetailerDashboard(){
  const r=useRetailerStore();
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const [editing,setEditing]=useState<string|null>(null);
  const [price,setPrice]=useState("");
  const [stock,setStock]=useState("");
  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);
  const stats=useMemo(()=>({
    total:r.items.length,
    active:r.items.filter(i=>i.active&&i.stock>0).length,
    low:r.items.filter(i=>i.stock>0&&i.stock<=5).length,
    out:r.items.filter(i=>i.stock===0).length,
    value:r.items.reduce((sum,i)=>sum+i.price*i.stock,0)
  }),[r.items]);
  const rows=r.items.filter(i=>{
    const p=byId.get(i.productId);
    if(filter==="low"&&!(i.stock>0&&i.stock<=5))return false;
    if(filter==="out"&&i.stock!==0)return false;
    if(filter==="active"&&!(i.active&&i.stock>0))return false;
    return [p?.name,p?.category,p?.packSize,i.productId].join(" ").toLowerCase().includes(query.toLowerCase());
  }).sort((a,b)=>(byId.get(a.productId)?.name||a.productId).localeCompare(byId.get(b.productId)?.name||b.productId));
  const startEdit=(i:typeof r.items[number])=>{setEditing(i.productId);setPrice(String(i.price));setStock(String(i.stock));setNotice("");};
  const save=async()=>{
    const p=Number(price),s=Number(stock);
    if(!editing||!Number.isFinite(p)||p<=0||!Number.isInteger(s)||s<0){setNotice("Enter a positive price and a whole-number quantity of zero or more.");return;}
    const original=r.items.find(i=>i.productId===editing);
    if(!original)return;
    setSaving(true);
    const error=await r.save({...original,price:p,stock:s,active:s>0});
    setSaving(false);
    if(error)setNotice(error);else{setEditing(null);setNotice("Inventory saved in Supabase.");}
  };
  return <main style={{minHeight:"100vh",background:"#f7faf7",color:"#102f30",padding:"28px max(20px,calc((100vw - 1150px)/2))",fontFamily:"Arial,sans-serif"}}>
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <Link href="/" style={{color:"#126c5b",textDecoration:"none",fontWeight:700}}>◈ meshlyy</Link>
      <Link href="/retailer/catalog" style={{color:"#126c5b"}}>Master catalogue →</Link>
    </nav>
    <p style={{letterSpacing:3,fontSize:12,color:"#477b70",marginTop:38}}>RETAILER STUDIO / DASHBOARD</p>
    <h1 style={{fontSize:"clamp(30px,5vw,50px)",margin:"8px 0 10px"}}>Your shop, at a glance.</h1>
    <p style={{color:"#5b7770",lineHeight:1.6}}>Manage real inventory in your Meshlyy store. Pickup reservations will appear here once the order system is connected.</p>
    {r.loading?<p>Loading your store…</p>:r.error?<p role="alert" style={{color:"#a33b30"}}>{r.error}</p>:!r.user?<section style={panel}><h2>Sign in to continue</h2><p>Use the retailer account you created in the catalogue.</p><Link href="/retailer/catalog">Go to retailer sign in →</Link></section>:!r.storeId?<section style={panel}><h2>Set up your shop</h2><p>Create your store from the retailer catalogue first.</p><Link href="/retailer/catalog">Create my shop →</Link></section>:<>
      <section style={{...panel,marginTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><p style={{margin:"0 0 4px",fontSize:12,color:"#537e73"}}>YOUR STORE</p><strong style={{fontSize:23}}>{r.storeName}</strong><p style={{margin:"6px 0 0",fontSize:13,color:"#537e73"}}>Inventory synced with Supabase</p></div>
        <Link href="/retailer/catalog" style={{...button,textDecoration:"none"}}>+ Add products</Link>
      </section>
      <section aria-label="Inventory overview" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,margin:"20px 0"}}>
        {[["Listed products",stats.total],["Available now",stats.active],["Low stock (1–5)",stats.low],["Out of stock",stats.out],["Stock value",currency(stats.value)]].map(([label,value])=><div key={label} style={panel}><p style={{fontSize:12,color:"#5e8177",margin:"0 0 12px"}}>{label}</p><strong style={{fontSize:27}}>{value}</strong></div>)}
      </section>
      <section style={panel}>
        <h2 style={{marginTop:0}}>Inventory</h2>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
          <input aria-label="Search your inventory" placeholder="Search your products…" value={query} onChange={e=>setQuery(e.target.value)} style={{...field,flex:"1 1 260px",width:"auto"}}/>
          <select aria-label="Stock filter" value={filter} onChange={e=>setFilter(e.target.value)} style={{...field,width:"auto"}}><option value="all">All products</option><option value="active">Available</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
        </div>
        {notice&&<p role="status" style={{color:"#126b5a"}}>{notice}</p>}
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",minWidth:570}}>
          <thead><tr>{["Product","Price","Quantity","Status","Action"].map(h=><th key={h} style={{padding:"12px 8px",borderBottom:"1px solid #d8e6df",fontSize:12,color:"#648077"}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(i=>{const p=byId.get(i.productId);return <tr key={i.productId}>
            <td style={cell}><strong>{p?.name||i.productId}</strong><div style={{fontSize:12,color:"#668077",marginTop:5}}>{[p?.category,p?.packSize].filter(Boolean).join(" · ")}</div></td>
            <td style={cell}>{currency(i.price)}</td><td style={cell}>{i.stock}</td>
            <td style={cell}>{i.stock===0?"Out of stock":i.active?(i.stock<=5?"Low stock":"Available"):"Inactive"}</td>
            <td style={cell}><button onClick={()=>startEdit(i)} style={{...button,padding:"8px 12px"}}>Edit</button></td>
          </tr>;})}</tbody>
        </table></div>
        {!rows.length&&<p style={{color:"#6b827b"}}>{r.items.length?"No products match these filters.":"Your shop has no products yet. Add products from the master catalogue."}</p>}
      </section>
      <section style={{...panel,marginTop:18}}>
        <h2 style={{marginTop:0}}>Pickup reservations</h2>
        <p style={{color:"#617c74"}}>Not connected yet. No live order counts or customer reservations are displayed.</p>
        <p style={{fontSize:13,color:"#617c74"}}>Planned: accept or reject requests, 15–25 minute reservation timer, OTP/QR pickup confirmation and expiry history.</p>
      </section>
    </>}
    {editing&&<div role="dialog" aria-modal="true" aria-label="Edit inventory" style={{position:"fixed",inset:0,background:"#071d1bba",display:"grid",placeItems:"center",padding:16,zIndex:100}}>
      <div style={{...panel,width:"min(440px,100%)",boxSizing:"border-box"}}>
        <h2 style={{marginTop:0}}>Edit inventory</h2><p>{byId.get(editing)?.name||editing}</p>
        <label style={{display:"block",marginBottom:14}}>Selling price (₹)<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} style={{...field,marginTop:6}}/></label>
        <label style={{display:"block",marginBottom:14}}>Quantity<input type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)} style={{...field,marginTop:6}}/></label>
        {notice&&<p role="alert">{notice}</p>}
        <div style={{display:"flex",gap:10}}><button disabled={saving} onClick={()=>setEditing(null)} style={{...button,background:"#e4efea",color:"#143e38"}}>Cancel</button><button disabled={saving} onClick={save} style={button}>{saving?"Saving…":"Save changes"}</button></div>
      </div>
    </div>}
  </main>;
}
const panel:React.CSSProperties={background:"white",border:"1px solid #d9e7df",borderRadius:18,padding:22};
const cell:React.CSSProperties={padding:"15px 8px",borderBottom:"1px solid #e7eee9",fontSize:14};
