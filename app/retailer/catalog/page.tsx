"use client";

import { useEffect, useMemo, useState } from "react";
import catalog from "../../../meshlyy-master-catalog.json";
import imageReferences from "../../../meshlyy-source-image-references.json";
import { useRetailerStore } from "./use-retailer-store";

type Product = { id: string; name: string; brand: string | null; packSize: string | null; category: string; mrpReference: number | null; imageUrl: string | null; imageStatus: string };
type InventoryItem = { productId: string; price: number; stock: number; active: boolean };
const products = catalog as Product[];
const sourceImages = imageReferences as Record<string, { url: string; source: string; packSize: string | null }>;
const imageFor = (p: Product) => sourceImages[p.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()]?.url || null;
const KEY = "meshlyy-retailer-inventory-demo-v1";
const money = (n: number | null) => n == null ? "—" : "₹" + n.toLocaleString("en-IN");

export default function RetailerCatalogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const remote = useRetailerStore();
  const inventory = remote.items;
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [register,setRegister]=useState(false);
  const [shopName,setShopName]=useState("");
  const [locality,setLocality]=useState("");
  const [notice,setNotice]=useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [tab, setTab] = useState<"catalog" | "mine">("catalog");

  const categories = useMemo(() => ["All categories", ...Array.from(new Set(products.map(p => p.category))).sort()], []);
  const found = useMemo(() => products.filter(p => (category === "All categories" || p.category === category) && [p.name,p.brand,p.packSize,p.category].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (tab === "catalog" || inventory.some(i => i.productId === p.id))).slice(0,100), [query,category,tab,inventory]);
  const edit = (p: Product) => { const existing = inventory.find(i => i.productId === p.id); setSelected(p); setPrice(existing ? String(existing.price) : p.mrpReference != null && p.mrpReference > 0 ? String(p.mrpReference) : ""); setStock(existing ? String(existing.stock) : "1"); };
  const save = async () => { if (!selected) return; const p = Number(price), s = Number(stock); if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(s) || s < 0) return; const error=await remote.save({productId:selected.id,price:p,stock:s,active:s>0}); if(error)setNotice(error);else {setNotice("Product saved to your shop.");setSelected(null);} };
  const style = { background:"#f8faf8", color:"#102e30", minHeight:"100vh", padding:"32px max(20px, calc((100vw - 1100px)/2))", fontFamily:"Arial, sans-serif" } as const;
  return <main style={style}>
    <a href="/" style={{color:"#166d64",textDecoration:"none"}}>← Meshlyy home</a>
    <p style={{letterSpacing:3,fontSize:12,marginTop:35,color:"#47736b"}}>MESHLYY · RETAILER STUDIO</p>
    <h1 style={{fontSize:"clamp(30px,5vw,52px)",margin:"10px 0"}}>Stock your neighbourhood shop.</h1>
    <p style={{color:"#53716d",maxWidth:660,lineHeight:1.6}}>Find products from the master catalogue, set your own selling price and quantity, and build your store inventory. This is a browser-local MVP preview, not a live multi-retailer database.</p>
    <section style={{padding:20,background:"#eaf3ee",borderRadius:16,margin:"24px 0"}}>
      <strong>Retailer account · {remote.user ? remote.user.email : "Sign in to save inventory"}</strong>
      {remote.loading ? <p>Loading retailer account…</p> : !remote.user ? <form onSubmit={async e=>{e.preventDefault();setNotice(await remote.signIn(email,password,register)||"Signed in successfully.");}} style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
        <input aria-label="Email" type="email" required placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} style={field}/>
        <input aria-label="Password" type="password" required minLength={6} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={field}/>
        <button type="submit" style={button(true)}>{register?"Create account":"Sign in"}</button>
        <button type="button" onClick={()=>setRegister(!register)} style={button(false)}>{register?"Already registered? Sign in":"New retailer? Register"}</button>
      </form> : !remote.storeId ? <form onSubmit={async e=>{e.preventDefault();setNotice(await remote.createStore(shopName,locality)||"Shop created.");}} style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
        <input aria-label="Shop name" required minLength={2} placeholder="Your shop name" value={shopName} onChange={e=>setShopName(e.target.value)} style={field}/>
        <input aria-label="Locality" placeholder="Locality (optional)" value={locality} onChange={e=>setLocality(e.target.value)} style={field}/>
        <button type="submit" style={button(true)}>Create my shop</button>
      </form> : <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><span>Managing: <strong>{remote.storeName}</strong> · Inventory saved in Supabase</span><button onClick={()=>void remote.signOut()} style={button(false)}>Sign out</button></div>}
      {(remote.error||notice) && <p role="status" style={{color:"#8a3025"}}>{remote.error||notice}</p>}
    </section>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"25px 0"}}>
      <button onClick={()=>setTab("catalog")} style={button(tab==="catalog")}>Master catalogue ({products.length})</button>
      <button onClick={()=>setTab("mine")} style={button(tab==="mine")}>My store ({inventory.length})</button>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}}>
      <input aria-label="Search products" placeholder="Search milk, Amul, 500 ml…" value={query} onChange={e=>setQuery(e.target.value)} style={{...field,flex:"1 1 260px"}} />
      <select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)} style={{...field,flex:"0 1 240px"}}>{categories.map(c=><option key={c}>{c}</option>)}</select>
    </div>
    <p style={{fontSize:13,color:"#647a76"}}>Showing {found.length} matches (up to 100). Catalogue reference MRP is not your selling price. Source image previews are for internal matching only; publication requires image rights.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(235px,1fr))",gap:14,marginTop:20}}>
      {found.map(p=>{ const item=inventory.find(i=>i.productId===p.id); return <article key={p.id} style={{background:"white",border:"1px solid #dce8e2",borderRadius:18,padding:20,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{height:220,background:"#edf5ef",borderRadius:12,display:"grid",placeItems:"center",color:"#6c9286",fontSize:12,overflow:"hidden"}}>{imageFor(p) ? <img src={imageFor(p)!} alt={p.name} loading="lazy" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"contain",objectPosition:"center",padding:12,boxSizing:"border-box"}} /> : "Image not available"}</div>
        <span style={{fontSize:11,color:"#538477"}}>{p.category}</span>
        <strong style={{minHeight:42,lineHeight:1.35}}>{p.name}</strong>
        <span style={{fontSize:13,color:"#668078"}}>{[p.brand,p.packSize].filter(Boolean).join(" · ") || "Pack details unavailable"}</span>
        <span style={{fontSize:13}}>Reference MRP: {money(p.mrpReference)}</span>
        {item && <span style={{fontSize:13,color:"#126a59"}}>Your price {money(item.price)} · {item.stock} in stock · {item.active?"Active":"Out of stock"}</span>}
        <button onClick={()=>edit(p)} disabled={!remote.storeId} style={{...button(true),marginTop:"auto",opacity:remote.storeId?1:0.5}}>{item?"Edit inventory":"+ Add to my store"}</button>
        {item && <button onClick={async()=>{const error=await remote.remove(p.id);if(error)setNotice(error);}} style={button(false)}>Remove from store</button>}
      </article>; })}
    </div>
    {!found.length && <p>No matching products. Try a different search or category.</p>}
    {selected && <div role="dialog" aria-modal="true" aria-label="Set store inventory" style={{position:"fixed",inset:0,background:"#071c1bcc",display:"grid",placeItems:"center",padding:16,zIndex:100}}>
      <div style={{background:"white",borderRadius:20,padding:28,width:"min(440px,100%)",boxSizing:"border-box"}}>
        <h2 style={{marginTop:0}}>{inventory.some(i=>i.productId===selected.id) ? "Edit store product" : "Add to my store"}</h2><p>{selected.name}</p>
        <label style={{display:"block",margin:"16px 0"}}>Your selling price (₹) · Pre-filled from reference MRP, editable<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} style={{...field,width:"100%",boxSizing:"border-box",marginTop:6}} /></label>
        <label style={{display:"block",margin:"16px 0"}}>Available quantity<input type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)} style={{...field,width:"100%",boxSizing:"border-box",marginTop:6}} /></label>
        <p style={{fontSize:12,color:"#607c72"}}>Zero quantity marks this product out of stock. No consumer availability is published from this preview.</p>
        <div style={{display:"flex",gap:10}}><button onClick={()=>setSelected(null)} style={button(false)}>Cancel</button><button onClick={save} disabled={!price||Number(price)<=0||!Number.isInteger(Number(stock))||Number(stock)<0} style={button(true)}>{inventory.some(i=>i.productId===selected.id) ? "Save changes" : "Add to my store"}</button></div>
      </div>
    </div>}
  </main>;
}
const field = {border:"1px solid #cbdcd4",borderRadius:11,padding:"13px 14px",fontSize:15,background:"white",color:"#102e30"};
const button = (active:boolean) => ({border:"1px solid #2a7063",background:active?"#143d38":"transparent",color:active?"white":"#143d38",borderRadius:11,padding:"12px 17px",cursor:"pointer",fontWeight:600 as const});
