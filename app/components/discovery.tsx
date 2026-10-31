"use client";

import { useState } from "react";
import { useDemo } from "./demo-context";
import { categories, money, products, stores } from "./demo-data";
import { ProductArt, ShopArt } from "./illustrations";
import { Arrow, PreviewLabel } from "./ui";

function NeighbourhoodMap() {
  const { store, setStore, chooseCategory, setQuery } = useDemo();
  const selected = stores.find(item => item.id === store);
  return <div className="neighbourhood">
    <div className="map-heading"><span className="small-caps">A pocket of possibility</span><span className="map-scale">Illustrated neighbourhood</span></div>
    <div className="street-plan" role="group" aria-label="Explore four fictional neighbourhood shops">
      <svg className="map-ground" viewBox="0 0 640 490" preserveAspectRatio="none" aria-hidden="true">
        <rect width="640" height="490" fill="#EAF0E8" />
        <g fill="#E0E8DC" stroke="#CFDACC" strokeWidth="1.3"><path d="M-10 25h241v135H-10ZM397-10h253v167H397ZM-10 328h241v172H-10ZM397 326h253v174H397Z" /><path d="M17 44h84v39H17Zm126 0h66v39h-66ZM18 104h54v35H18ZM430 15h72v50h-72Zm100 3h93v47h-93ZM436 95h55v39h-55ZM18 355h73v39H18Zm110 0h74v39h-74ZM24 425h60v45H24Zm101 0h89v45h-89ZM435 354h70v40h-70Zm98 0h88v40h-88ZM437 421h57v52h-57Z" fill="#F2F4ED" /></g>
        <path d="M-20 248C170 203 416 283 670 232" stroke="#FAFBF6" strokeWidth="66" fill="none" /><path d="M319-10v510" stroke="#FAFBF6" strokeWidth="66" /><path d="M-20 248C170 203 416 283 670 232M319-10v510" stroke="#C6D5C7" strokeDasharray="3 9" fill="none" />
        <path className="walking-route" d={selected ? `M319 249 L${selected.x / 100 * 640} 249 L${selected.x / 100 * 640} ${selected.y / 100 * 490}` : "M319 249H149V154"} stroke="#27806A" strokeWidth="2.5" strokeDasharray="5 6" fill="none" />
        <g fill="#CADFC6"><circle cx="567" cy="438" r="17" /><circle cx="588" cy="459" r="20" /><circle cx="550" cy="467" r="18" /><circle cx="107" cy="121" r="15" /><circle cx="125" cy="135" r="13" /></g>
      </svg>
      <span className="street-name market-lane">Market Lane</span><span className="street-name garden-street">Garden Street</span>
      <div className="you-marker"><span aria-hidden="true" /><span>You, here</span></div>
      {stores.map(shop => <button className={`shop-pin${store === shop.id ? " is-selected" : ""}`} type="button" key={shop.id} style={{ left: `${shop.x}%`, top: `${shop.y}%` }} aria-pressed={store === shop.id} aria-label={`Explore ${shop.name}, ${shop.type}`} onClick={() => { chooseCategory("all"); setQuery(""); setStore(store === shop.id ? null : shop.id); }}><ShopArt category={shop.category} /><span>{shop.name}</span></button>)}
      <span className="map-compass" aria-hidden="true">N<br />↑</span>
    </div>
    <div className="map-caption" aria-live="polite" aria-atomic="true"><span className="location-glyph" aria-hidden="true">⌖</span><div><strong>{selected ? selected.name : "Good things, within walking distance."}</strong><span>{selected ? `${selected.street} · ${selected.walk} sample walk · Select again to see all shops` : "Choose a shop to see what’s on its shelves."}</span></div><span className="map-index" aria-hidden="true">01—04</span></div>
  </div>;
}

function ProductSearch() {
  const { query, setQuery, category, chooseCategory, store, setStore, basket, changeQuantity } = useDemo();
  const [showAll, setShowAll] = useState(false);
  const filtered = products.filter(product => {
    const shop = stores.find(item => item.id === product.store)!;
    const term = query.trim().toLocaleLowerCase();
    return (category === "all" || product.category === category) && (!store || store === product.store) && `${product.name} ${product.size} ${shop.name} ${shop.type}`.toLocaleLowerCase().includes(term);
  });
  const hasFilter = Boolean(query.trim() || category !== "all" || store);
  const visible = hasFilter || showAll ? filtered : products.filter(product => ["milk", "cleanser", "cable", "cup"].includes(product.id));
  return <div className="search-preview" id="search-preview">
    <div className="search-heading"><h3>What’s on your list?</h3><PreviewLabel>Search preview</PreviewLabel></div>
    <label className="sr-only" htmlFor="product-search">Search sample products or shops</label>
    <div className="search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg><input id="product-search" type="search" placeholder="Try “milk” or “cup”" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" /><kbd aria-hidden="true">⌕</kbd></div>
    <div className="result-summary"><span role="status">{hasFilter ? `${filtered.length} sample ${filtered.length === 1 ? "find" : "finds"}` : "A few neighbourhood favourites"}</span>{hasFilter && <button className="text-button" type="button" onClick={() => { chooseCategory("all"); setStore(null); }}>Clear filters</button>}</div>
    <ul className="product-list" aria-label="Sample product results">
      {visible.map(product => <li className="product-row" key={product.id}><div className={`product-thumbnail tone-${product.category}`}><ProductArt kind={product.art} /></div><div className="product-detail"><span className="product-store">{stores.find(shop => shop.id === product.store)?.name}</span><h4>{product.name}</h4><span className="product-size">{product.size} <span aria-hidden="true">·</span> {money(product.price)}</span></div><button className="add-product" type="button" disabled={(basket[product.id] ?? 0) >= 9} aria-label={`Add ${product.name} to preview basket${basket[product.id] ? `, ${basket[product.id]} already added` : ""}`} onClick={() => changeQuantity(product.id, 1)}><span aria-hidden="true">{basket[product.id] ? <>{basket[product.id]}<small>+</small></> : "+"}</span></button></li>)}
    </ul>
    {visible.length === 0 && <div className="empty-search"><span aria-hidden="true">⌕</span><h4>No sample finds just yet.</h4><p>Try milk, cleanser, cable or cup.</p><button className="text-button" type="button" onClick={() => chooseCategory("all")}>Reset search <Arrow /></button></div>}
    {!hasFilter && <button className="browse-all text-button" type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? "Show fewer samples" : "Browse all 8 samples"}<Arrow down={ !showAll } /></button>}
    <p className="demo-note">Sample shops, products & prices. Nothing is reserved.</p>
  </div>;
}

export function Discovery() {
  return <section id="discover" className="discovery shell" aria-labelledby="discovery-title"><div className="section-bar"><h2 id="discovery-title">Your neighbourhood, unfolded.</h2><PreviewLabel>Discovery preview</PreviewLabel></div><div className="discovery-workspace"><NeighbourhoodMap /><ProductSearch /></div><CategoryBrowse /></section>;
}

function CategoryBrowse() {
  const { category, chooseCategory } = useDemo();
  return <div className="category-browse"><div className="category-caption"><span className="small-caps">Follow your<br />everyday.</span><span className="hand-arrow" aria-hidden="true">↳</span></div><div className="category-options" role="group" aria-label="Browse sample categories">{categories.map(item => <button key={item.id} type="button" className={`category-option${category === item.id ? " is-active" : ""}`} aria-pressed={category === item.id} onClick={() => { chooseCategory(category === item.id ? "all" : item.id); document.getElementById("search-preview")?.scrollIntoView({ block: "nearest" }); }}><ProductArt kind={item.id} /><span className="category-name">{item.name}<span aria-hidden="true">↗</span></span><span className="category-note">{item.note}</span></button>)}</div></div>;
}
