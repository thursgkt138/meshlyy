"use client";

import { useDemo } from "./demo-context";
import { money, products, stores } from "./demo-data";
import { ProductArt } from "./illustrations";
import { Arrow, PreviewLabel, SectionIntro } from "./ui";

export function BasketDemo() {
  const { basket, count, changeQuantity } = useDemo();
  const total = products.reduce((sum, product) => sum + product.price * (basket[product.id] ?? 0), 0);
  const groups = stores.filter(store => products.some(product => product.store === store.id && basket[product.id] > 0));
  return <section className="basket-section section-space" id="basket" aria-labelledby="basket-title"><div className="shell basket-layout">
    <div className="basket-editorial"><SectionIntro number="01" label="A little of everything" title={<>Different shops.<br />One <em>lovely list.</em></>}><p>Morning essentials. A small something for home. Keep it all together, then collect from each shop.</p></SectionIntro><div className="basket-sketch" aria-hidden="true"><ProductArt kind="pantry" /><span>+</span><ProductArt kind="home" /><svg viewBox="0 0 240 100" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M25 12c0 38 88 5 95 62m95-62c0 38-88 5-95 62m-8-10 8 10 8-10" /></svg><span className="sketch-caption">One list. A few familiar faces.</span></div><a href="#discover" className="editorial-link">Find something to add <Arrow /></a></div>
    <div className="basket-paper"><div className="paper-heading"><div><PreviewLabel>Basket preview</PreviewLabel><h3 id="basket-title">Your local little haul.</h3></div><span className="bag-icon" aria-hidden="true"><svg viewBox="0 0 40 44" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 13h28l3 27H3Zm7 3V9a7 7 0 0 1 14 0v7" /></svg><b>{count}</b></span></div>
      <div className="basket-groups">{groups.map(store => <div className="basket-group" key={store.id}><div className="basket-store-heading"><h4>{store.name}</h4><span>Pickup at shop</span></div><ul>{products.filter(product => product.store === store.id && basket[product.id] > 0).map(product => <li key={product.id}><div className="basket-item-name"><strong>{product.name}</strong><span>{money(product.price)} each</span></div><div className="quantity-control" role="group" aria-label={`${product.name} quantity`}><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => changeQuantity(product.id, -1)}>−</button><span>{basket[product.id]}</span><button type="button" disabled={basket[product.id] >= 9} aria-label={`Add one ${product.name}`} onClick={() => changeQuantity(product.id, 1)}>+</button></div><span className="line-price">{money(product.price * basket[product.id])}</span></li>)}</ul></div>)}</div>
      {count === 0 && <div className="empty-basket"><p>A little room for something local.</p><a href="#discover" className="editorial-link">Explore sample shelves <Arrow /></a></div>}
      <div className="basket-total"><div><span>Sample subtotal</span><strong>{money(total)}</strong></div><p>{count} {count === 1 ? "item" : "items"} across {groups.length} {groups.length === 1 ? "shop" : "shops"} · Collected by you</p></div>
      <a className="button button-ink basket-next" href="#pickup">Try the pickup preview <Arrow /></a><p className="demo-note">A demonstration basket. No checkout or payment.</p>
    </div>
  </div></section>;
}
