"use client";

import { useState } from "react";
import { money } from "./demo-data";
import { ProductArt } from "./illustrations";
import { Arrow, PreviewLabel } from "./ui";

type View = "Requests" | "Products" | "Store hours";
const requestSteps = ["Requested", "Accepted", "Ready for pickup", "Collected"];

export function RetailerDemo() {
  const [view, setView] = useState<View>("Requests");
  const [requests, setRequests] = useState([0, 1]);
  const [stock, setStock] = useState([true, true]);
  const [takingPickups, setTakingPickups] = useState(true);
  const [notice, setNotice] = useState("");
  function reset() { setRequests([0, 1]); setStock([true, true]); setTakingPickups(true); setNotice("Retailer preview reset."); }
  return <section className="retailer-section section-space" id="retailers" aria-labelledby="retailer-title"><div className="shell">
    <div className="retailer-intro"><div><p className="eyebrow"><span>03</span> FOR THE FAMILIAR FACES</p><h2 id="retailer-title">Your shop.<br /><em>A little more discovered.</em></h2></div><div><p>A place for your shelves, your pickup requests, and the people just around the corner.</p><span className="retailer-coming">Retailer onboarding is coming soon <Arrow /></span></div></div>
    <div className="retailer-dashboard"><aside className="dashboard-sidebar"><div className="dashboard-store"><img src="/mark.svg" alt="" width="30" height="30" /><strong>Common{" "}<br />Ground<span>Sample shop</span></strong></div><div className="dashboard-nav" role="group" aria-label="Retailer preview views">{(["Requests", "Products", "Store hours"] as View[]).map((item, index) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}><span aria-hidden="true">{["↳", "⊞", "◷"][index]}</span>{item}{view === item && <span className="nav-active-mark" aria-hidden="true">•</span>}</button>)}</div><div className="sidebar-bottom"><span>LOCAL SHOP. LOCAL PEOPLE.</span><span>Pickup-only, always.</span></div></aside>
      <div className="dashboard-main"><div className="dashboard-top"><PreviewLabel>Retailer dashboard preview</PreviewLabel><button className="text-button" type="button" onClick={reset}>Reset demo <span aria-hidden="true">↺</span></button></div>
        <div className="dashboard-content">
          {view === "Requests" && <><div className="dashboard-title"><div><span className="small-caps">A SAMPLE AFTERNOON</span><h3>A few things to get ready.</h3></div><span className="request-count">2 sample requests</span></div><div className="request-list">{[{ code: "M042", items: "Oat milk × 1 · Sourdough loaf × 1", amount: 300 }, { code: "M043", items: "Sourdough loaf × 2", amount: 360 }].map((request, index) => <div className="request-row" key={request.code}><div className="request-number"><span aria-hidden="true">↳</span><strong>#{request.code}</strong><span>{money(request.amount)}</span></div><div className="request-items"><p>{request.items}</p><span className={`request-status state-${requests[index]}`}>{requestSteps[requests[index]]}</span></div><button className="dashboard-action" type="button" disabled={requests[index] === 3} aria-label={`${["Accept", "Mark ready", "Mark collected", "Collected"][requests[index]]} sample request ${request.code}`} onClick={() => { setRequests(current => current.map((step, i) => i === index ? Math.min(3, step + 1) : step)); setNotice(`Sample ${request.code}: ${requestSteps[Math.min(3, requests[index] + 1)]}.`); }}>{["Accept request", "Mark ready", "Mark collected", "Collected ✓"][requests[index]]}<Arrow /></button></div>)}</div><p className="dashboard-hint">Try accepting a request, then mark it ready for counter pickup.</p></>}
          {view === "Products" && <><div className="dashboard-title"><div><span className="small-caps">SAMPLE SHELVES</span><h3>The everyday, in order.</h3></div><span className="request-count">2 sample products</span></div><div className="inventory-list">{[{ name: "Oat milk", price: 120, art: "pantry" as const }, { name: "Sourdough loaf", price: 180, art: "bread" as const }].map((product, index) => <div className="inventory-row" key={product.name}><ProductArt kind={product.art} /><div><strong>{product.name}</strong><span>{money(product.price)} · Sample price</span></div><button className="stock-toggle" type="button" aria-pressed={stock[index]} aria-label={`${product.name} sample availability`} onClick={() => { setStock(current => current.map((value, i) => i === index ? !value : value)); setNotice(`${product.name}: ${stock[index] ? "unavailable" : "available"} in retailer preview.`); }}><span className="toggle-track"><span /></span>{stock[index] ? "Available" : "Unavailable"}</button></div>)}</div><p className="dashboard-hint">Toggle sample availability. This separate demo doesn’t change the discovery shelves.</p></>}
          {view === "Store hours" && <><div className="dashboard-title"><div><span className="small-caps">SAMPLE PICKUP SETTINGS</span><h3>Make room for your day.</h3></div></div><div className="hours-preview"><div><span className="small-caps">MONDAY–SATURDAY</span><strong>9:00 am–7:00 pm</strong><span>Sunday · Closed</span></div><div className="hours-toggle"><p>Accept pickup requests</p><button type="button" className="stock-toggle" aria-pressed={takingPickups} onClick={() => { setTakingPickups(value => !value); setNotice(`Sample pickup requests ${takingPickups ? "paused" : "enabled"}.`); }}><span className="toggle-track"><span /></span>{takingPickups ? "Enabled" : "Paused"}</button></div></div><p className="dashboard-hint">Illustrative hours. Toggle requests to preview taking a break.</p></>}
        </div>
        <div className="dashboard-footer"><span>Demonstration only · No shop data is changed</span><span aria-hidden="true">meshlyy for retailers ↗</span></div><span className="sr-only" role="status">{notice}</span>
      </div>
    </div>
  </div></section>;
}
