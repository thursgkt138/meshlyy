"use client";

import { useRef, useState } from "react";
import { useDemo } from "./demo-context";
import { Arrow } from "./ui";

export function Brand() {
  return <a className="brand" href="#main" aria-label="Meshlyy home"><img src="/mark.svg" alt="" width="36" height="36" /><span>meshlyy</span></a>;
}
export function Header() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { count } = useDemo();
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="shell header-inner" onKeyDown={event => { if (event.key === "Escape" && open) { setOpen(false); trigger.current?.focus(); } }}>
    <Brand />
    <nav id="main-navigation" className={open ? "is-open" : ""} aria-label="Main navigation">
      <a href="#discover" onClick={() => setOpen(false)}>The neighbourhood</a><a href="#pickup" onClick={() => setOpen(false)}>The pickup</a><a href="#retailers" onClick={() => setOpen(false)}>For local shops</a>
    </nav>
    <a className="basket-link" href="#basket" aria-label={`Preview basket, ${count} items`}>Basket <span>{count}</span><Arrow /></a>
    <button ref={trigger} type="button" className="menu-toggle" aria-controls="main-navigation" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(value => !value)}>{open ? "×" : <><span /><span /></>}</button>
  </div></header></>;
}
