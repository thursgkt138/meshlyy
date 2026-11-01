"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import catalog from "../../../meshlyy-master-catalog.json";
import imageReferences from "../../../meshlyy-source-image-references.json";
import { supabase, useRetailerStore } from "../catalog/use-retailer-store";

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

  const [notice,setNotice]=useState("");
  const [saving,setSaving]=useState(false);
  const [posSales,setPosSales]=useState<{total:number;created_at:string}[]>([]);
  const [pickup,setPickup]=useState<{id:string;status:string;requested_at:string;expires_at:string|null}[]>([]);
  const [orderBusy,setOrderBusy]=useState<string|null>(null);
  const [orderNotice,setOrderNotice]=useState("");
  const [metricsError,setMetricsError]=useState("");
  const [recentSales,setRecentSales]=useState<{total:number;created_at:string}[]>([]);
  const [salesRange,setSalesRange]=useState<7|30>(7);
  const [productSales,setProductSales]=useState<{product_id:string;quantity:number;unit_price:number}[]>([]);
  const [productSalesError,setProductSalesError]=useState("");
  const [selectedDay,setSelectedDay]=useState<string|null>(null);
  const [searchDemand,setSearchDemand]=useState<{search_term:string;searches:number;unique_consumers:number;zero_result_searches:number}[]>([]);
  const [searchDemandError,setSearchDemandError]=useState("");
  const [productEngagement,setProductEngagement]=useState<{product_id:string;unique_consumers:number;product_views:number;basket_adds:number;pickup_requests:number}[]>([]);
  const [engagementError,setEngagementError]=useState("");
  const [pickupFunnel,setPickupFunnel]=useState<{status:string}[]>([]);
  const [funnelError,setFunnelError]=useState("");
  const [metricsLoading,setMetricsLoading]=useState(true);
  useEffect(()=>{
    if(!supabase||!r.storeId){setMetricsLoading(false);return;}
    const client=supabase;let active=true;
    const load=async()=>{
      const start=new Date();start.setHours(0,0,0,0);
      const [sales,orders,recent]=await Promise.all([
        client.from("pos_sales").select("total,created_at").eq("store_id",r.storeId).gte("created_at",start.toISOString()).limit(1000),
        client.from("pickup_reservations").select("id,status,requested_at,expires_at").eq("store_id",r.storeId).in("status",["requested","accepted"]).order("requested_at",{ascending:false}).limit(100),
        client.from("pos_sales").select("total,created_at").eq("store_id",r.storeId).gte("created_at",new Date(Date.now()-30*86400000).toISOString()).order("created_at",{ascending:false}).limit(1000)
      ]);
      if(!active)return;
      setMetricsError([sales.error?.message,orders.error?.message].filter(Boolean).join(" · "));
      if(!sales.error)setPosSales((sales.data||[]) as {total:number;created_at:string}[]);
      if(!recent.error)setRecentSales((recent.data||[]) as {total:number;created_at:string}[]);
      if(!orders.error)setPickup((orders.data||[]) as {id:string;status:string;requested_at:string;expires_at:string|null}[]);
      setMetricsLoading(false);
    };
    const loadDemand=async()=>{const result=await client.rpc("get_store_search_demand",{p_store_id:r.storeId,p_days:30});if(!active)return;if(result.error)setSearchDemandError(result.error.message);else{setSearchDemandError("");setSearchDemand((result.data||[]) as {search_term:string;searches:number;unique_consumers:number;zero_result_searches:number}[]);}};
    const loadEngagement=async()=>{const result=await client.rpc("get_store_product_engagement",{p_store_id:r.storeId,p_days:30});if(!active)return;if(result.error)setEngagementError(result.error.message);else{setEngagementError("");setProductEngagement((result.data||[]) as {product_id:string;unique_consumers:number;product_views:number;basket_adds:number;pickup_requests:number}[]);}};
    const loadFunnel=async()=>{
      const since=new Date(Date.now()-30*86400000).toISOString();
      const result=await client.from("pickup_reservations").select("status").eq("store_id",r.storeId).gte("requested_at",since).limit(1000);
      if(!active)return;
      if(result.error)setFunnelError(result.error.message);
      else{setFunnelError("");setPickupFunnel((result.data||[]) as {status:string}[]);}
    };
    const loadProductSales=async()=>{
      const sales=await client.from("pos_sales").select("id").eq("store_id",r.storeId).gte("created_at",new Date(Date.now()-30*86400000).toISOString()).order("created_at",{ascending:false}).limit(200);
      if(!active)return;
      if(sales.error){setProductSalesError(sales.error.message);return;}
      const ids=(sales.data||[]).map(s=>s.id);
      if(!ids.length){setProductSales([]);setProductSalesError("");return;}
      const lines=await client.from("pos_sale_items").select("product_id,quantity,unit_price").in("sale_id",ids).limit(2000);
      if(!active)return;
      if(lines.error)setProductSalesError(lines.error.message);
      else{setProductSalesError("");setProductSales((lines.data||[]) as {product_id:string;quantity:number;unit_price:number}[]);}
    };
    void loadProductSales();
    void load();void loadDemand();void loadEngagement();void loadFunnel();
    const timer=setInterval(()=>{void load();void loadFunnel();},30000);
    return()=>{active=false;clearInterval(timer);};
  },[r.storeId]);
  const decidePickup=async(id:string,action:"accept"|"reject")=>{
    if(!supabase||orderBusy)return;
    if(!window.confirm(action==="accept"?"Accept this request and reserve stock?":"Reject this pickup request?"))return;
    setOrderBusy(id);setOrderNotice("");
    const result=await supabase.rpc("retailer_reservation_action",{p_reservation_id:id,p_action:action});
    if(result.error)setOrderNotice(result.error.message);
    else{
      setOrderNotice(action==="accept"?"Pickup accepted. Ask the customer to collect within the pickup window.":"Pickup rejected.");
      if(r.storeId){
        const refreshed=await supabase.from("pickup_reservations").select("id,status,requested_at,expires_at").eq("store_id",r.storeId).in("status",["requested","accepted"]).order("requested_at",{ascending:false}).limit(100);
        if(!refreshed.error)setPickup((refreshed.data||[]) as {id:string;status:string;requested_at:string;expires_at:string|null}[]);
      }
    }
    setOrderBusy(null);
  };
  const stats=useMemo(()=>({
    total:r.items.length,
    active:r.items.filter(i=>i.active&&i.stock>0).length,
    low:r.items.filter(i=>i.stock>0&&i.stock<=5).length,
    out:r.items.filter(i=>i.stock===0).length,
    value:r.items.reduce((sum,i)=>sum+i.price*i.stock,0)
  }),[r.items]);
  const dailySales=Array.from({length:salesRange},(_,idx)=>{
    const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-(salesRange-1-idx));
    const next=new Date(d);next.setDate(d.getDate()+1);
    const value=recentSales.filter(s=>{const t=new Date(s.created_at).getTime();return t>=d.getTime()&&t<next.getTime();}).reduce((sum,s)=>sum+Number(s.total),0);
    return {key:d.toISOString().slice(0,10),label:d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),value};
  });
  const maxDay=Math.max(1,...dailySales.map(d=>d.value));
  const selectedSalesDay=dailySales.find(d=>d.key===selectedDay);
  const rangeSales=dailySales.reduce((sum,d)=>sum+d.value,0);
  const rankedProducts=Array.from(productSales.reduce((map,line)=>{
    const old=map.get(line.product_id)||{productId:line.product_id,units:0,revenue:0};
    old.units+=Number(line.quantity);old.revenue+=Number(line.quantity)*Number(line.unit_price);
    map.set(line.product_id,old);return map;
  },new Map<string,{productId:string;units:number;revenue:number}>()).values()).sort((a,b)=>b.revenue-a.revenue).slice(0,8);
  const maxProductRevenue=Math.max(1,...rankedProducts.map(p=>p.revenue));
  const topRisk=r.items.filter(i=>i.active&&i.stock<=5).sort((a,b)=>a.stock-b.stock).slice(0,5);
  const avgTicket=posSales.length?posSales.reduce((sum,s)=>sum+Number(s.total),0)/posSales.length:0;
  const rows=r.items.filter(i=>{
    const p=byId.get(i.productId);
    if(filter==="low"&&!(i.stock>0&&i.stock<=5))return false;
    if(filter==="out"&&i.stock!==0)return false;
    if(filter==="active"&&!(i.active&&i.stock>0))return false;
    return [p?.name,p?.category,p?.packSize,i.productId].join(" ").toLowerCase().includes(query.toLowerCase());
  }).sort((a,b)=>(byId.get(a.productId)?.name||a.productId).localeCompare(byId.get(b.productId)?.name||b.productId));
  const startEdit=(i:typeof r.items[number])=>{setEditing(i.productId);setPrice(String(i.price));setNotice("");};
  const save=async()=>{
    const p=Number(price);
    if(!editing||!Number.isFinite(p)||p<=0){setNotice("Enter a valid positive price.");return;}
    const original=r.items.find(i=>i.productId===editing);
    if(!original)return;
    setSaving(true);
    const error=await r.save({...original,price:p});
    setSaving(false);
    if(error)setNotice(error);else{setEditing(null);setNotice("Inventory saved in Supabase.");}
  };
  return <main style={{minHeight:"100vh",background:"#f4f6f3",color:"#102f30",padding:"28px max(20px,calc((100vw - 1280px)/2))",fontFamily:"Arial,sans-serif"}}>
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <Link href="/" style={{color:"#126c5b",textDecoration:"none",fontWeight:700}}>◈ meshlyy</Link>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}><Link href="/retailer/pos" style={{color:"#126c5b",fontWeight:700}}>Open POS →</Link><Link href="/retailer/sales" style={{color:"#126c5b"}}>Sales & receipts</Link><Link href="/retailer/stock" style={{color:"#126c5b"}}>Stock adjustments</Link><Link href="/retailer/orders" style={{color:"#126c5b"}}>Pickup orders</Link><Link href="/retailer/catalog" style={{color:"#126c5b"}}>Master catalogue →</Link></div>
    </nav>
    <p style={{letterSpacing:3,fontSize:12,color:"#477b70",marginTop:38}}>MESHLYY / RETAIL OPERATIONS</p>
    <h1 style={{fontSize:"clamp(34px,5vw,56px)",letterSpacing:"-2px",margin:"8px 0 10px"}}>Your retail command centre.</h1>
    <p style={{color:"#5b7770",lineHeight:1.6}}>Manage live inventory, check low-stock products, and open the POS to bill walk-in customers.</p>
    {r.loading?<p>Loading your store…</p>:r.error?<p role="alert" style={{color:"#a33b30"}}>{r.error}</p>:!r.user?<section style={panel}><h2>Sign in to continue</h2><p>Use the retailer account you created in the catalogue.</p><Link href="/retailer/catalog">Go to retailer sign in →</Link></section>:!r.storeId?<section style={panel}><h2>Set up your shop</h2><p>Create your store from the retailer catalogue first.</p><Link href="/retailer/catalog">Create my shop →</Link></section>:<>
      <section style={{...panel,marginTop:24,background:"linear-gradient(110deg,#143e38,#236859)",color:"white",padding:30,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><p style={{margin:"0 0 4px",fontSize:12,color:"#537e73"}}>YOUR STORE</p><strong style={{fontSize:23}}>{r.storeName}</strong><p style={{margin:"6px 0 0",fontSize:13,color:"#537e73"}}>Inventory synced with Supabase</p></div>
        <Link href="/retailer/catalog" style={{...button,textDecoration:"none"}}>+ Add products</Link>
      </section>
      <section aria-label="Business pulse" style={{margin:"22px 0"}}>
        <h2>Today's business pulse</h2>
        {metricsError&&<p role="alert" style={{color:"#a33b30"}}>{metricsError}</p>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}>
        {([
          ["Walk-in revenue",metricsLoading?"Loading…":currency(posSales.reduce((a,s)=>a+Number(s.total),0)),"/retailer/sales"],
          ["Walk-in transactions",metricsLoading?"Loading…":posSales.length,"/retailer/sales"],
          ["New pickup requests",metricsLoading?"Loading…":pickup.filter(x=>x.status==="requested").length,"/retailer/orders?status=requested"],
          ["Awaiting collection",metricsLoading?"Loading…":pickup.filter(x=>x.status==="accepted").length,"/retailer/orders?status=accepted"]
        ] as [string,string|number,string][]).map(([label,value,href])=><Link key={label} href={href} style={{...panel,textDecoration:"none",color:"#102f30",display:"block",cursor:"pointer",transition:"transform .15s,box-shadow .15s"}} title={"Open "+label.toLowerCase()}><p style={{fontSize:12,color:"#5e8177"}}>{label}</p><strong style={{fontSize:27}}>{value}</strong><p style={{fontSize:12,color:"#116d5a",marginBottom:0}}>View details →</p></Link>)}
        </div>
        <p style={{fontSize:12,color:"#668277"}}>Updates every 30 seconds. POS revenue excludes pickup orders. Counts are limited to the most recent 1,000 POS sales and 100 open pickup orders.</p>
      </section>
      <nav aria-label="Dashboard sections" style={{display:"flex",gap:9,flexWrap:"wrap",margin:"12px 0 20px"}}>
        {([["#live-orders","Orders"],["#sales-insights","Sales"],["#product-insights","Products"],["#stock-health","Stock"],["#inventory-management","Inventory"]] as [string,string][]).map(([href,label])=><a key={href} href={href} style={{...button,textDecoration:"none",background:"#e5f1ea",color:"#143e38",padding:"10px 15px"}}>{label} ↓</a>)}
      </nav>
      <section id="live-orders" style={{...panel,marginBottom:20,borderColor:pickup.some(o=>o.status==="requested")?"#c9dfce":"#dce9e2"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div><p style={{fontSize:11,letterSpacing:2,color:"#397e67",fontWeight:700,margin:"0 0 6px"}}>LIVE ORDER INBOX</p><h2 style={{margin:0}}>Pickup requests <span style={{fontSize:16,color:"#5e8177"}}>({pickup.filter(o=>o.status==="requested").length} new)</span></h2></div>
          <Link href="/retailer/orders?status=all" style={{...button,textDecoration:"none",background:"#e5f1ea",color:"#143e38"}}>All orders →</Link>
        </div>
        <p style={{fontSize:13,color:"#648378"}}>Act on new requests here. Open an accepted order to verify its pickup code.</p>
        {orderNotice&&<p role="status" style={{fontSize:13,color:"#9a572a"}}>{orderNotice}</p>}
        <div style={{display:"grid",gap:9}}>
          {pickup.slice(0,5).map(o=><div key={o.id} style={{background:"#f5f9f6",padding:"12px 14px",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><strong>#{o.id.slice(0,8).toUpperCase()}</strong><p style={{fontSize:12,color:"#648378",margin:"5px 0 0"}}>{new Date(o.requested_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})} · {o.status==="requested"?"Needs your decision":"Ready for collection"}</p></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {o.status==="requested"&&<><button type="button" disabled={orderBusy!==null} onClick={()=>void decidePickup(o.id,"accept")} style={{...button,padding:"9px 13px",opacity:orderBusy!==null?.6:1}}>Accept</button><button type="button" disabled={orderBusy!==null} onClick={()=>void decidePickup(o.id,"reject")} style={{...button,padding:"9px 13px",background:"#f1e7e5",color:"#934f43"}}>Reject</button></>}
              <Link href={"/retailer/orders?status="+o.status} style={{...button,textDecoration:"none",padding:"9px 13px",background:"#e2eee7",color:"#143e38"}}>{o.status==="accepted"?"Verify pickup":"View details"} →</Link>
            </div>
          </div>)}
          {!pickup.length&&<p style={{fontSize:13,color:"#648378",margin:0}}>No open pickup requests. New orders will appear here automatically.</p>}
        </div>
        {pickup.length>5&&<p style={{fontSize:12,color:"#648378"}}>Showing the 5 most recent open requests. <Link href="/retailer/orders?status=all">View all</Link></p>}
      </section>
      <section id="pickup-conversion" style={{...panel,marginBottom:22}}>
        <h2 style={{marginTop:0}}>Pickup conversion · last 30 days</h2>
        <p style={{fontSize:13,color:"#648378"}}>Based on actual reservation statuses, not product interaction events. Latest 1,000 requests maximum.</p>
        {funnelError?<p role="alert">{funnelError}</p>:(()=>{
          const total=pickupFunnel.length;
          const counts=(s:string)=>pickupFunnel.filter(x=>x.status===s).length;
          const complete=counts("completed");
          const accepted=counts("accepted");
          const rejected=counts("rejected");
          const expired=counts("expired");
          const pending=counts("requested");
          return <><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12}}>
            {([["Requested",total,"all"],["Awaiting decision",pending,"requested"],["Ready for collection",accepted,"accepted"],["Collected",complete,"completed"],["Rejected",rejected,"rejected"],["Expired",expired,"expired"]] as [string,number,string][]).map(([label,value,status])=><Link key={label} href={"/retailer/orders?status="+status} style={{background:"#f4f8f5",borderRadius:12,padding:15,textDecoration:"none",color:"#102f30",display:"block"}}><p style={{fontSize:12,color:"#5e8177"}}>{label}</p><strong style={{fontSize:24}}>{value}</strong><div style={{height:5,background:"#dbe9e0",borderRadius:4,marginTop:12,overflow:"hidden"}}><div style={{height:"100%",width:(total?100*value/total:0)+"%",background:"#19745d",borderRadius:4}}/></div><small style={{color:"#116d5a"}}>View orders →</small></Link>)}
          </div><p style={{fontSize:13,color:"#486b60",marginBottom:0}}>Collected / requested: <strong>{total?(100*complete/total).toFixed(1)+"%":"No requests yet"}</strong>. Pending and active reservations remain in the denominator; this is a current cohort snapshot, not a final conversion rate.</p></>;
        })()}
      </section>
      <section id="sales-insights" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:18,marginBottom:22}}>
        <div style={{...panel,padding:26,background:"#102f30",color:"white",border:"none"}}>
          <p style={{fontSize:12,letterSpacing:2,color:"#9ccebd",fontWeight:700}}>BUSINESS INTELLIGENCE · LIVE DATA</p>
          <h2 style={{fontSize:27,margin:"10px 0 8px"}}>Insights for your store</h2>
          <p style={{fontSize:13,color:"#c4ddd4",lineHeight:1.6}}>Automated insights based on your POS transactions and current stock. Not generative AI.</p>
          <div style={{display:"grid",gap:10,marginTop:20}}>
            <div style={{background:"#ffffff12",padding:15,borderRadius:13}}><strong>Today's average bill · {currency(avgTicket)}</strong><p style={{fontSize:13,color:"#c4ddd4",margin:"6px 0 0"}}>{posSales.length?posSales.length+" recorded POS transactions today.":"Record POS sales to start tracking basket value."}</p></div>
            <div style={{background:"#ffffff12",padding:15,borderRadius:13}}><strong>{stats.out+stats.low} products need attention</strong><p style={{fontSize:13,color:"#c4ddd4",margin:"6px 0 0"}}>{stats.out} out of stock · {stats.low} running low. Prioritise restocking active products.</p></div>
            <div style={{background:"#ffffff12",padding:15,borderRadius:13}}><strong>Product engagement · last 30 days</strong>{engagementError?<p style={{fontSize:13,color:"#f9d9c7"}}>{engagementError}</p>:productEngagement.length?productEngagement.slice(0,5).map(x=><p key={x.product_id} style={{fontSize:13,color:"#c4ddd4"}}>{byId.get(x.product_id)?.name||x.product_id}: {x.product_views} views · {x.basket_adds} basket adds · {x.pickup_requests} pickup requests</p>):<p style={{fontSize:13,color:"#c4ddd4"}}>Not enough activity yet. Each product needs engagement from five distinct signed-in consumers.</p>}<p style={{fontSize:11,color:"#b0cfc2",marginBottom:0}}>Interactions only; not completed sales or conversion rates.</p></div>
            <div style={{background:"#ffffff12",padding:15,borderRadius:13}}><strong>Consumer search demand · last 30 days</strong>{searchDemandError?<p style={{fontSize:13,color:"#f9d9c7"}}>Analytics unavailable: {searchDemandError}</p>:searchDemand.length?<div style={{marginTop:8}}>{searchDemand.slice(0,5).map(x=><p key={x.search_term} style={{fontSize:13,color:"#c4ddd4",margin:"7px 0"}}>{x.search_term} · {x.searches} searches{x.zero_result_searches>0?" · "+x.zero_result_searches+" no-match":""}</p>)}</div>:<p style={{fontSize:13,color:"#c4ddd4",margin:"6px 0 0"}}>No trends to show yet. Each term needs at least five distinct signed-in consumers.</p>}<p style={{fontSize:11,color:"#b0cfc2",marginBottom:0}}>Platform-wide searches, not neighbourhood-specific. Match counts use the first 100 loaded listings.</p></div>
          </div>
        </div>
        <div style={{...panel,padding:26}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <p style={{fontSize:12,letterSpacing:2,color:"#548478",fontWeight:700}}>SALES TREND · POS</p>
            <div style={{display:"flex",gap:6}}>{([7,30] as const).map(n=><button key={n} type="button" aria-pressed={salesRange===n} onClick={()=>{setSalesRange(n);setSelectedDay(null);}} style={{...button,padding:"7px 10px",background:salesRange===n?"#143e38":"#e5f1ea",color:salesRange===n?"white":"#143e38"}}>{n} days</button>)}</div>
          </div>
          <h2 style={{fontSize:26,margin:"10px 0 8px"}}>{currency(rangeSales)}</h2>
          <p style={{fontSize:13,color:"#648378"}}>POS revenue · latest 1,000 sales over 30 days maximum</p>
          <div style={{height:178,display:"flex",alignItems:"flex-end",gap:salesRange===7?10:3,marginTop:25,borderBottom:"1px solid #dce8df",paddingBottom:12}}>
          {dailySales.map((d,i)=><button type="button" key={d.key} onClick={()=>setSelectedDay(d.key)} aria-label={d.label+": "+currency(d.value)} title={d.label+": "+currency(d.value)} style={{flex:1,textAlign:"center",minWidth:0,border:0,padding:0,background:"transparent",cursor:"pointer"}}><div style={{height:125,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",height:Math.max(5,125*d.value/maxDay),background:selectedDay===d.key?"#e6a15d":i===dailySales.length-1?"#174e43":"#a9d7c3",borderRadius:"5px 5px 2px 2px"}}/></div>{salesRange===7&&<small style={{fontSize:11,color:"#638579",display:"block",marginTop:9}}>{d.label}</small>}</button>)}
          </div>
          <p style={{fontSize:13,color:"#486b60",minHeight:18}}>{selectedSalesDay?selectedSalesDay.label+": "+currency(selectedSalesDay.value)+" in POS sales":"Select a bar to see that day's revenue."}</p>
          <Link href="/retailer/sales" style={{display:"inline-block",marginTop:24,color:"#146653",fontWeight:700}}>Explore transactions →</Link>
        </div>
      </section>
      <section id="product-insights" style={{...panel,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div><p style={{fontSize:11,letterSpacing:2,color:"#548478",fontWeight:700}}>PRODUCT PERFORMANCE</p><h2 style={{margin:"6px 0"}}>Top-selling products</h2></div>
          <Link href="/retailer/sales" style={{...button,textDecoration:"none"}}>Sales report →</Link>
        </div>
        <p style={{fontSize:12,color:"#648378"}}>POS items only, last 30 days. Based on the latest 200 POS transactions (up to 2,000 line items); pickup orders are excluded.</p>
        {productSalesError&&<p role="alert" style={{color:"#a33b30"}}>{productSalesError}</p>}
        <div style={{display:"grid",gap:13}}>
          {rankedProducts.map(p=><div key={p.productId} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center"}}>
            <div style={{minWidth:0}}><strong style={{fontSize:13}}>{byId.get(p.productId)?.name||p.productId}</strong><div style={{height:8,background:"#e9f0e9",borderRadius:8,marginTop:8,overflow:"hidden"}}><div style={{width:(100*p.revenue/maxProductRevenue)+"%",height:"100%",background:"#438e74",borderRadius:8}}/></div></div>
            <div style={{textAlign:"right"}}><strong>{currency(p.revenue)}</strong><div style={{fontSize:12,color:"#648378"}}>{p.units} units</div></div>
          </div>)}
          {!rankedProducts.length&&!productSalesError&&<p style={{fontSize:13,color:"#648378"}}>No POS product sales recorded in this period.</p>}
        </div>
      </section>
      <section id="stock-health" style={{...panel,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div><p style={{fontSize:11,letterSpacing:2,color:"#548478",fontWeight:700}}>STOCK HEALTH</p><h2 style={{margin:"6px 0"}}>Inventory at a glance</h2></div>
          <Link href="/retailer/stock" style={{...button,textDecoration:"none"}}>Stock control →</Link>
        </div>
        <div style={{display:"flex",height:13,borderRadius:10,overflow:"hidden",background:"#e8eee9",margin:"16px 0 10px"}}>
          <div title={"Available: "+stats.active} style={{width:(stats.total?100*stats.active/stats.total:0)+"%",background:"#3d9a76"}}/>
          <div title={"Low stock: "+stats.low} style={{width:(stats.total?100*stats.low/stats.total:0)+"%",background:"#e5a653"}}/>
          <div title={"Out of stock: "+stats.out} style={{width:(stats.total?100*stats.out/stats.total:0)+"%",background:"#d77b68"}}/>
        </div>
        <p style={{fontSize:12,color:"#648378"}}>{stats.active} available · {stats.low} low stock · {stats.out} out of stock. Low-stock items may also be counted as available.</p>
        <div style={{display:"grid",gap:8}}>
          {r.items.filter(i=>i.active&&i.stock<=5).sort((a,b)=>a.stock-b.stock).slice(0,6).map(i=><div key={i.productId} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"11px 13px",border:"1px solid #e3ece6",borderRadius:12}}>
            <div><strong style={{fontSize:13}}>{byId.get(i.productId)?.name||i.productId}</strong><p style={{fontSize:12,color:i.stock===0?"#b4513d":"#986b25",margin:"5px 0 0"}}>{i.stock===0?"Out of stock":i.stock+" left"}</p></div>
            <Link href={"/retailer/stock?product="+encodeURIComponent(i.productId)} style={{...button,textDecoration:"none",padding:"9px 12px",background:"#e5f1ea",color:"#143e38"}}>Restock →</Link>
          </div>)}
          {!r.items.some(i=>i.active&&i.stock<=5)&&<p style={{fontSize:13,color:"#648378"}}>No active products are below the 5-unit alert threshold.</p>}
        </div>
      </section>
      <section id="inventory-management" aria-label="Inventory overview" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,margin:"20px 0"}}>
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
              <button onClick={()=>startEdit(i)} style={{...button,width:"100%",padding:"12px 14px"}}>Edit selling price</button>
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
        <p>Use <Link href="/retailer/stock">Stock adjustments</Link> to change quantities with an audit trail.</p>
        {notice&&<p role="alert">{notice}</p>}
        <div style={{display:"flex",gap:10}}><button disabled={saving} onClick={()=>setEditing(null)} style={{...button,background:"#e4efea",color:"#143e38"}}>Cancel</button><button disabled={saving} onClick={save} style={button}>{saving?"Saving…":"Save changes"}</button></div>
      </div>
    </div>}
  </main>;
}
const panel:React.CSSProperties={background:"white",border:"1px solid #d9e7df",borderRadius:18,padding:22};

