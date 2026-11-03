"use client";
import {useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useRetailerStore,supabase} from "./catalog/use-retailer-store";
const sections=[
 {label:"WORKSPACE",items:[["/retailer/dashboard","Overview","◫"],["/retailer/orders","Online orders","▤"],["/retailer/pos","New sale / POS","▦"]]},
 {label:"OPERATIONS",items:[["/retailer/catalog","Product catalogue","▣"],["/retailer/stock","Inventory & stock","▥"],["/retailer/sales","Sales & analytics","◷"],["/retailer/stores","Manage stores","◇"]]},
 {label:"ACCOUNT",items:[["/retailer/settings","Settings","⚙"],["/retailer/help","Help & suggestions","?"]]}
];
const mobileLinks=[["/retailer/dashboard","Home","◫"],["/retailer/orders","Orders","▤"],["/retailer/pos","Sell","▦"],["/retailer/stock","Stock","▥"],["/retailer/sales","Sales","◷"]];
export default function RetailerLayout({children}:{children:React.ReactNode}){
 const pathname=usePathname();const store=useRetailerStore();const [menuOpen,setMenuOpen]=useState(false);
 if(["/retailer/login","/retailer/signup","/retailer/onboarding","/retailer/trial"].some(p=>pathname.startsWith(p)))return <>{children}</>;
 const current=sections.flatMap(s=>s.items).find(([href])=>pathname===href)?.[1]||"Retailer Studio";
 const nav=<>{sections.map(section=><div className="ret-nav-section" key={section.label}><div className="ret-nav-caption">{section.label}</div>{section.items.map(([href,label,glyph])=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} aria-current={pathname===href?"page":undefined} className="ret-nav-link"><span className="ret-nav-glyph" aria-hidden>{glyph}</span><span>{label}</span>{pathname===href&&<span className="ret-nav-active-dot" aria-hidden/>}</Link>)}</div>)}</>;
 return <div className="ret-shell">
  <aside className={"ret-sidebar"+(menuOpen?" ret-sidebar-open":"")}>
   <Link href="/retailer/dashboard" className="ret-brand" onClick={()=>setMenuOpen(false)}><span className="ret-brand-mark">✳</span><span>meshlyy<small>RETAILER STUDIO</small></span></Link>
   <div className="ret-store-card"><span className="ret-store-avatar">{(store.storeName||"S").slice(0,1).toUpperCase()}</span><span className="ret-store-info"><strong>{store.storeName||"Your store"}</strong><small>{store.user?.email||"Sign in to manage"}</small></span><span className="ret-store-chevron">⌄</span></div>
   <nav aria-label="Retailer navigation" className="ret-navigation">{nav}</nav>
   <div className="ret-sidebar-bottom"><span className="ret-status-dot"/> Pickup-first local commerce <small>Meshlyy Retailer Studio</small></div>
  </aside>
  {menuOpen&&<button aria-label="Close navigation" className="ret-mobile-scrim" onClick={()=>setMenuOpen(false)}/>}
  <div className="ret-body">
   <header className="ret-topbar">
    <div className="ret-top-left"><button className="ret-menu-button" aria-label="Open navigation" onClick={()=>setMenuOpen(v=>!v)}>☰</button><span className="ret-breadcrumb">Workspace <span>/</span> <strong>{current}</strong></span></div>
    <div className="ret-top-actions"><Link href="/retailer/pos" className="ret-new-sale">＋ New sale</Link><span className="ret-user-avatar" title={store.user?.email||"Retailer"}>{(store.user?.email||"R").slice(0,1).toUpperCase()}</span><button className="ret-signout" onClick={async()=>{if(supabase){await supabase.auth.signOut();location.assign("/retailer/login");}}}>Sign out</button></div>
   </header>
   <div className="ret-page-content">{children}</div>
   <nav className="ret-bottom-nav" aria-label="Quick navigation">{mobileLinks.map(([href,label,glyph])=><Link href={href} key={href} aria-current={pathname===href?"page":undefined}><span aria-hidden>{glyph}</span><small>{label}</small></Link>)}</nav>
  </div>
  <style jsx global>{`
.ret-shell{--ret-ink:#182a27;--ret-muted:#788780;--ret-line:#e8ede9;--ret-green:#17634d;display:flex;min-height:100vh;background:#f6f8f7;color:var(--ret-ink);font-family:var(--sans,"DM Sans",Arial,sans-serif)}
.ret-sidebar{width:252px;flex:0 0 252px;height:100vh;position:sticky;top:0;overflow-y:auto;display:flex;flex-direction:column;background:#fff;border-right:1px solid var(--ret-line);padding:28px 15px 18px;z-index:50}
.ret-brand{display:flex;align-items:center;gap:11px;padding:0 13px;color:#143f32;font-size:26px;line-height:1;font-weight:800;letter-spacing:-1.5px;text-decoration:none}.ret-brand-mark{display:grid;place-items:center;background:#d9f4e7;color:#136146;width:38px;height:38px;border-radius:12px;font-size:27px}.ret-brand small{display:block;margin-top:7px;font-size:9px;font-weight:750;letter-spacing:2px;color:#84978c}
.ret-store-card{display:flex;align-items:center;gap:10px;margin:32px 2px 25px;padding:13px 10px;background:#f5f8f6;border:1px solid #edf0ec;border-radius:14px;min-width:0}.ret-store-avatar{display:grid;place-items:center;flex:0 0 37px;width:37px;height:37px;border-radius:11px;background:#d7eae0;color:#195a43;font-size:17px;font-weight:750}.ret-store-info{flex:1;min-width:0}.ret-store-info strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ret-store-info small{display:block;font-size:10px;color:#819087;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.ret-store-chevron{font-size:17px;color:#819087}
.ret-navigation{display:grid;gap:23px}.ret-nav-section{display:grid;gap:3px}.ret-nav-caption{padding:0 13px 9px;font-size:10px;font-weight:750;letter-spacing:1.6px;color:#a0aca5}.ret-nav-link{display:flex;align-items:center;gap:11px;padding:11px 12px;min-height:42px;border-radius:10px;color:#596b62;text-decoration:none;font-size:12.5px;font-weight:650;transition:background .15s,color .15s}.ret-nav-link:hover{background:#f3f7f4;color:#174d3d}.ret-nav-link[aria-current=page]{background:#e8f4ed;color:#116244;font-weight:750}.ret-nav-glyph{font-size:18px;display:grid;place-items:center;width:22px;height:22px;flex:none}.ret-nav-active-dot{margin-left:auto;width:5px;height:5px;background:#2a9a69;border-radius:50%}
.ret-sidebar-bottom{margin-top:auto;padding:18px 11px 4px;border-top:1px solid var(--ret-line);font-size:10px;color:#6f8277}.ret-sidebar-bottom small{display:block;margin:7px 0 0 12px;color:#a3afa7}.ret-status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#41b882;margin-right:5px}
.ret-body{flex:1;min-width:0}.ret-topbar{height:72px;position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:0 30px;background:#ffffffed;backdrop-filter:blur(14px);border-bottom:1px solid var(--ret-line);gap:14px}.ret-top-left,.ret-top-actions{display:flex;align-items:center;gap:15px}.ret-breadcrumb{font-size:12px;color:#98a59e}.ret-breadcrumb span{margin:0 9px;color:#c3ccc5}.ret-breadcrumb strong{color:#284438;font-weight:750}.ret-new-sale{display:inline-flex;align-items:center;justify-content:center;padding:11px 15px;background:#194e3d;color:#fff;border-radius:10px;text-decoration:none;font-size:12px;font-weight:750}.ret-new-sale:hover{background:#0c392a}.ret-user-avatar{display:grid;place-items:center;width:33px;height:33px;background:#e6ede8;color:#32634e;border-radius:50%;font-size:12px;font-weight:750}.ret-signout{background:transparent;border:1px solid #e3e9e4;color:#62776a;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:650;cursor:pointer}.ret-page-content{min-width:0;max-width:1700px;margin:auto}.ret-menu-button,.ret-bottom-nav,.ret-mobile-scrim{display:none}
@media(min-width:801px){.ret-page-content>main{min-height:calc(100vh - 72px)!important;padding:27px 30px!important;background:transparent!important;max-width:1500px;margin:0 auto}.ret-page-content>main>nav:first-child{display:none!important}.ret-page-content>main>p:first-of-type{margin-top:4px!important}}
@media(max-width:1000px) and (min-width:801px){.ret-sidebar{width:214px;flex-basis:214px}.ret-topbar{padding:0 18px}}
@media(max-width:800px){.ret-sidebar{position:fixed;top:0;left:0;transform:translateX(-100%);transition:transform .2s;box-shadow:12px 0 50px #0d33291c}.ret-sidebar-open{transform:translateX(0)}.ret-mobile-scrim{display:block;position:fixed;inset:0;background:#102a2477;border:0;z-index:40}.ret-topbar{height:60px;padding:0 15px}.ret-menu-button{display:inline-grid;place-items:center;background:#f0f5f1;border:0;border-radius:9px;width:38px;height:38px;font-size:18px;color:#174d3d}.ret-breadcrumb{font-size:11px}.ret-top-actions{gap:8px}.ret-new-sale{padding:10px;font-size:11px}.ret-signout{display:none}.ret-page-content{padding-bottom:76px}.ret-bottom-nav{display:flex;justify-content:space-around;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--ret-line);z-index:30;padding:8px 4px max(8px,env(safe-area-inset-bottom))}.ret-bottom-nav a{display:grid;gap:3px;place-items:center;color:#8b9a90;font-size:20px;min-width:0;text-decoration:none}.ret-bottom-nav a[aria-current=page]{color:#13734e}.ret-bottom-nav small{font-size:9px;font-weight:700}}
`}</style>
 </div>;
}
