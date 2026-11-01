"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import imageReferences from "../../../meshlyy-source-image-references.json";
import { useRetailerStore } from "../catalog/use-retailer-store";

type Product = {id:string;name:string;category:string;packSize:string|null;mrpReference:number|null};
const products=catalog as Product[];
const byId=new Map(products.map(p=>[p.id,p]));
const sourceImages=imageReferences as Record<string,{url:string;source:string;packSize:string|null}>;
const imageFor=(p:Product)=>sourceImages[p.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()]?.url||null;
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
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}><Link href="/retailer/pos" style={{color:"#126c5b",fontWeight:700}}>Open POS →</Link><Link href="/retailer/orders" style={{color:"#126c5b"}}>Pickup orders</Link><Link href="/retailer/catalog" style={{color:"#126c5b"}}>Master catalogue →</Link></div>
    </nav>
    <p style={{letterSpacing:3,fontSize:12,color:"#477b70",marginTop:38}}>RETAILER STUDIO / DASHBOARD</p>
    <h1 style={{fontSize:"clamp(30px,5vw,50px)",margin:"8px 0 10px"}}>Your shop, at a glance.</h1>
    <p style={{color:"#5b7770",lineHeight:1.6}}>Manage live inventory, check low-stock products, and open the POS to bill walk-in customers.</p>
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
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,225px),1fr))",gap:18}}>
          {rows.map(i=>{const p=byId.get(i.productId);const image=p?imageFor(p):null;const status=i.stock===0?"Out of stock":!i.active?"Inactive":i.stock<=5?"Low stock":"Available";return <article key={i.productId} style={{border:"1px solid #dce9e2",borderRadius:20,background:"#fff",padding:14,display:"flex",flexDirection:"column",minWidth:0,boxShadow:"0 4px 16px rgba(17,60,51,.035)"}}>
            <div style={{height:215,background:"#eef5f0",borderRadius:14,display:"grid",placeItems:"center",overflow:"hidden",position:"relative"}}>
              {image?<img src={image} alt={p?.name||"Product"} loading="lazy" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"contain",objectPosition:"center",padding:14,boxSizing:"border-box"}}/>:<span style={{fontSize:13,color:"#64887b"}}>Image unavailable</span>}
              <span style={{position:"absolute",top:10,left:10,padding:"6px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:i.stock===0?"#fff0ec":i.stock<=5?"#fff3d9":"#e4f4eb",color:i.stock===0?"#a33e2d":i.stock<=5?"#90620a":"#14634d"}}>{status}</span>
            </div>
            <div style={{padding:"14px 3px 0",display:"flex",flexDirection:"column",flex:1}}>
              <span style={{fontSize:12,color:"#548277",marginBottom:7}}>{p?.category||"Catalogue product"}{p?.packSize?" · "+p.packSize:""}</span>
              <h3 style={{fontSize:16,lineHeight:1.4,margin:"0 0 14px",minHeight:44}}>{p?.name||i.productId}</h3>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:8,marginTop:"auto",paddingBottom:15}}>
                <div><div style={{fontSize:11,color:"#65877e"}}>Your price</div><strong style={{fontSize:23}}>{currency(i.price)}</strong></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#65877e"}}>In stock</div><strong style={{fontSize:19}}>{i.stock}</strong></div>
              </div>
              <button onClick={()=>startEdit(i)} style={{...button,width:"100%",padding:"12px 14px"}}>Edit price & stock</button>
            </div>
          </article>;})}
        </div>
        {!rows.length&&<p style={{color:"#6b827b"}}>{r.items.length?"No products match these filters.":"Your shop has no products yet. Add products from the master catalogue."}</p>}
      </section>
      <section style={{...panel,marginTop:18}}>
        <h2 style={{marginTop:0}}>Pickup reservations</h2>
        <p style={{color:"#617c74"}}>Pickup requests and verified collections are managed from the live orders page.</p>
        <p style={{fontSize:13,color:"#617c74"}}><Link href="/retailer/orders" style={{color:"#126c5b",fontWeight:700}}>Manage pickup reservations →</Link></p>
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

