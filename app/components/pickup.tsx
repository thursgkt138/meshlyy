"use client";

import { useState } from "react";
import { Arrow, PreviewLabel, SectionIntro } from "./ui";

const stages = [
  { label: "Requested", time: "4:02 pm", title: "Your list is with the shop.", note: "Common Ground is checking your sample items. Wait for acceptance before making plans.", action: "Preview acceptance" },
  { label: "Accepted", time: "4:05 pm", title: "A little preparation underway.", note: "The shop has accepted your sample request. Your pickup window will appear once it’s ready.", action: "Preview ready for pickup" },
  { label: "Ready", time: "4:18 pm", title: "Ready when you are.", note: "Your sample items are set aside at Common Ground. Show your collection code at the counter.", action: "Preview collection" },
  { label: "Collected", time: "4:32 pm", title: "A good day to shop local.", note: "Sample handover complete. One less errand, one more familiar face.", action: "Restart preview" },
];

export function PickupDemo() {
  const [stage, setStage] = useState(2);
  const current = stages[stage];
  return <section className="pickup-section section-space shell" id="pickup" aria-labelledby="pickup-title">
    <SectionIntro number="02" label="On your time" title={<>A small detour.<br /><em>A good part of your day.</em></>}><p>Reserve nearby. Get a clear update. Pick it up yourself when the shop says it’s ready.</p></SectionIntro>
    <div className="pickup-layout"><div className="pickup-route" aria-hidden="true"><span className="route-top-note">The way home, with one good stop.</span><svg viewBox="0 0 540 390" fill="none"><path d="M-10 283h169a42 42 0 0 0 42-42V119a42 42 0 0 1 42-42h307" stroke="#E5EBE1" strokeWidth="60" /><path d="M-10 283h169a42 42 0 0 0 42-42V119a42 42 0 0 1 42-42h307" stroke="#ADBFB0" strokeDasharray="3 10" /><path d="M57 283h102a42 42 0 0 0 42-42V119a42 42 0 0 1 42-42h162" stroke="#27806A" strokeWidth="2" strokeDasharray="5 5" /><circle cx="57" cy="283" r="9" fill="#10232A" /><circle cx="405" cy="77" r="12" fill="#4EDDBB" stroke="#10232A" strokeWidth="2" /><path d="m306 195 42-30 42 30v61h-84Z" fill="#F7F8F5" stroke="#10232A" strokeWidth="2" /><path d="M337 256v-33h22v33m-37-52h12" stroke="#10232A" strokeWidth="2" /><path d="M71 149h54v50H71Zm-5 0 10-18h44l10 18Z" fill="#4EDDBB" stroke="#10232A" strokeWidth="2" /></svg><span className="route-shop-note">Your local shop</span><span className="route-home-note">And then, home.</span><span className="route-footnote">Illustrative route · No location tracking</span></div>
      <div className="pickup-ticket"><div className="ticket-top"><span className="small-caps">COMMON GROUND / SAMPLE #M042</span><PreviewLabel>Pickup preview</PreviewLabel></div>
        <ol className="pickup-stages" aria-label="Select a sample pickup status">{stages.map((step, index) => <li key={step.label}><button type="button" aria-pressed={stage === index} aria-label={`Preview ${step.label} status`} onClick={() => setStage(index)} className={`${index <= stage ? "is-complete" : ""} ${index === stage ? "is-current" : ""}`}><span>{index < stage ? "✓" : `0${index + 1}`}</span>{step.label}</button></li>)}</ol>
        <div className="pickup-status" aria-live="polite" aria-atomic="true"><span className="status-stamp">{current.label} <span>Sample update · {current.time}</span></span><h3 id="pickup-title">{current.title}</h3><p>{current.note}</p>
          <div className={`collection-details${stage === 2 ? " is-ready" : ""}`}><div><span>{stage === 2 ? "SAMPLE PICKUP WINDOW" : stage === 3 ? "SAMPLE COLLECTION" : "PICKUP WINDOW"}</span><strong>{stage === 2 ? "4:20–6:00 pm" : stage === 3 ? "Collected at 4:32 pm" : "Waiting for ready status"}</strong><small>12 Market Lane · Counter pickup</small></div><div className="collection-code"><span>DEMO CODE</span><b>{stage >= 2 ? "0426" : "— — — —"}</b></div></div>
        </div>
        <button type="button" className="text-button pickup-next" onClick={() => setStage((stage + 1) % stages.length)}>{current.action}<Arrow /></button><p className="demo-note">A separate sample order. Times and code are illustrative.</p>
      </div>
    </div>
  </section>;
}
