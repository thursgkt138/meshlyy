"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleCheck, Compass, Layers3, MapPin, MessageCircle, Pause, Play, RotateCcw, Search, Send, ShoppingBag, Sparkles, Store } from "lucide-react";
import { useCommerceMotion } from "./commerce-interactive";

const stories = [
  { id: "cable", label: "A charging cable", query: "I need a USB-C cable. What can I find nearby?", reply: "Two sample options, both a short walk away.", followup: "Which one is closest?", answer: "Circuit Corner is closer. The 1-metre cable is also the lower-priced option.", image: "meshlyy-cable.webp", name: "USB-C charging cable", options: [{ shop: "Circuit Corner", detail: "1 metre · USB-C to USB-C", price: 249, distance: "0.4 km", walk: "5 min walk" }, { shop: "Everyday Connect", detail: "2 metres · USB-C to USB-C", price: 349, distance: "0.8 km", walk: "10 min walk" }] },
  { id: "milk", label: "My grocery run", query: "Help me find oat milk around the corner.", reply: "Here’s how two local listings could look.", followup: "Show me the closer shop.", answer: "Common Ground is the closer sample shop. Check the listing, then request a pickup.", image: "meshlyy-oat-milk.webp", name: "Original oat milk", options: [{ shop: "Common Ground", detail: "Original · 1 litre", price: 120, distance: "0.3 km", walk: "4 min walk" }, { shop: "Neighbourhood Pantry", detail: "Original · 1 litre", price: 135, distance: "0.7 km", walk: "9 min walk" }] },
  { id: "notebook", label: "Something for my desk", query: "Where can I pick up a pocket notebook?", reply: "A small find, with two sample local options.", followup: "Let’s go with the nearest one.", answer: "Little Objects is nearest in this story. You can review the details before a pickup request.", image: "meshlyy-notebook.webp", name: "Pocket notebook", options: [{ shop: "Little Objects", detail: "Plain pages · A6", price: 90, distance: "0.6 km", walk: "8 min walk" }, { shop: "Paper & Things", detail: "Ruled pages · A6", price: 110, distance: "0.9 km", walk: "12 min walk" }] },
];
const phases = ["Your question", "Finding options", "Compare your finds", "A quick follow-up", "Your local option", "A pickup preview"];
const durations = [2800, 1900, 5200, 2600, 6000];
const money = (price: number) => `₹${price.toLocaleString("en-IN")}`;

function TypedLine({ text, animate }: { text: string; animate: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(animate ? 0 : text.length);
    if (!animate) return;
    const timer = window.setInterval(() => setCount(value => Math.min(text.length, value + 2)), 24);
    return () => window.clearInterval(timer);
  }, [text, animate]);
  return <>{text.slice(0, count)}{animate && count < text.length && <span className="fa-type-cursor" aria-hidden="true" />}</>;
}

export function ForestAgentExperience() {
  const [storyIndex, setStoryIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [input, setInput] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [selected, setSelected] = useState(0);
  const [runId, setRunId] = useState(0);
  const root = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const paused = useCommerceMotion();
  const story = stories[storyIndex];
  const running = playing && visible && tabVisible && !paused && !unsupported;
  const question = customQuestion || story.query;

  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .18 });
    if (root.current) observer.observe(root.current);
    const visibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  useEffect(() => {
    if (!running || phase >= 5) return;
    const timer = window.setTimeout(() => { setPhase(value => Math.min(5, value + 1)); if (phase === 3) setSelected(0); if (phase === 4) setPlaying(false); }, durations[phase]);
    return () => window.clearTimeout(timer);
  }, [running, phase, storyIndex, customQuestion, runId]);
  useEffect(() => {
    const el = transcript.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: paused ? "instant" : "smooth" });
  }, [phase, storyIndex, unsupported, paused]);

  function chooseStory(index: number) {
    setStoryIndex(index); setPhase(0); setSelected(0); setCustomQuestion(""); setUnsupported(false); setPlaying(true); setRunId(value => value + 1);
  }
  function next() { setPhase(value => Math.min(5, value + 1)); }
  function submit(event: FormEvent) {
    event.preventDefault(); const text = input.trim(); if (!text) return;
    const match = /cable|usb|charg/i.test(text) ? 0 : /milk|oat|grocer/i.test(text) ? 1 : /note|paper|desk/i.test(text) ? 2 : -1;
    setCustomQuestion(text); setInput(""); setUnsupported(match < 0); setPhase(0); setSelected(0); setPlaying(true); setRunId(value => value + 1);
    if (match >= 0) setStoryIndex(match);
  }
  const progress = Math.min(2, Math.floor(phase / 2));
  return <section ref={root} className="fa-section cm-section" id="network" aria-labelledby="fa-heading">
    <div className="fa-intro"><div><span className="fa-eyebrow"><Sparkles size={14} /> A MORE INTUITIVE WAY TO SHOP</span><h2 id="fa-heading">Good finds start<br />with a <span>hello.</span></h2></div><div className="fa-intro-right"><p>Ask for what you need. <br />See the options. Make it local.</p><span><i />An animated look at what’s next.</span></div></div>
    <div className="fa-experience"><div className="fa-chat"><header className="fa-chat-header"><div className="fa-agent-mark"><img src="/meshlyy-emerald.svg" width="25" height="20" alt="" /></div><div><strong>Meshlyy assistant</strong><span><i />Shopping companion · Concept demo</span></div><div className="fa-playback"><button aria-label="Replay agent demo" title="Replay demo" onClick={() => chooseStory(storyIndex)}><RotateCcw size={16} /></button><button aria-label={playing ? "Pause agent demo" : "Play agent demo"} title={playing ? "Pause demo" : "Play demo"} onClick={() => { if (phase >= 5) chooseStory(storyIndex); else setPlaying(!playing); }} disabled={paused}>{playing && !paused ? <Pause size={15} /> : <Play size={15} />}</button></div></header>
      <div className="fa-chat-body" ref={transcript} role="log" aria-label="Sample shopping conversation" aria-live="off"><div className="fa-conversation-start"><span><Sparkles size={18} /></span><p>A whole neighbourhood.<br /><strong>One conversation.</strong></p></div><div className="fa-user-message" key={`${storyIndex}-${customQuestion}-${runId}`}><span className="fa-user-label">YOU</span><p><TypedLine text={question} animate={phase === 0 && running} /></p></div>
      {unsupported ? <div className="fa-agent-message fa-message-enter"><span className="fa-message-avatar"><Sparkles size={15} /></span><div><p>Try a cable, oat milk or a notebook. This preview has three shopping stories to explore.</p><div className="fa-inline-stories">{stories.map((s, i) => <button key={s.id} onClick={() => chooseStory(i)}>{s.label}<ArrowUpRight size={12} /></button>)}</div></div></div> : <>
      {phase === 1 && <div className="fa-agent-message fa-message-enter"><span className="fa-message-avatar"><Sparkles size={15} /></span><div className="fa-searching"><div><span /><span /><span /></div><p>Looking around your neighbourhood…</p><span className="fa-search-progress"><i /></span></div></div>}
      {phase >= 2 && <div className="fa-agent-message fa-message-enter"><span className="fa-message-avatar"><Sparkles size={15} /></span><div className="fa-agent-results"><p><TypedLine text={story.reply} animate={phase === 2 && running} /></p><div className="fa-product-options">{story.options.map((option, index) => <article key={`${story.id}-${option.shop}`} className={`fa-option${selected === index ? " selected" : ""}`}><button className="fa-option-image" aria-label={`Select sample option at ${option.shop}`} aria-pressed={selected === index} onClick={() => { setSelected(index); if (phase < 2) setPhase(2); }}><img src={`/images/${story.image}`} alt={story.name} /><span className="fa-selection-check">{selected === index && <Check size={12} />}</span>{index === 0 && <span className="fa-nearest">Closest option</span>}</button><div className="fa-option-copy"><h3>{story.name}</h3><p>{option.detail}</p><strong>{money(option.price)}</strong><div><Store size={12} /><span>{option.shop}</span></div><span><MapPin size={11} />{option.distance}<i />{option.walk}</span><button onClick={() => { setSelected(index); setPhase(4); setPlaying(false); }}>Explore this option<ArrowRight size={13} /></button></div></article>)}</div><span className="fa-sample-label">Sample listings and prices</span></div></div>}
      {phase >= 3 && <div className="fa-user-message fa-followup-message fa-message-enter"><p><TypedLine text={story.followup} animate={phase === 3 && running} /></p></div>}
      {phase >= 4 && <div className="fa-agent-message fa-message-enter"><span className="fa-message-avatar"><Sparkles size={15} /></span><div className="fa-recommendation"><p><TypedLine text={selected === 0 ? story.answer : `${story.options[1].shop} is selected. Review this sample option before previewing a pickup.`} animate={phase === 4 && running} /></p><button className="fa-pickup-button" onClick={() => { setPhase(5); setPlaying(false); }}><ShoppingBag size={15} />Preview a pickup<ArrowRight size={15} /></button></div></div>}
      {phase >= 5 && <div className="fa-confirmation fa-message-enter"><span><CircleCheck size={23} /></span><div><strong>And that’s your next local stop.</strong><p>{story.options[selected].shop} · {story.options[selected].distance}</p><span>In a real pickup, wait for shop acceptance before you go.</span></div><span className="fa-demo-badge">DEMO</span></div>}
      </>}
      </div>
      <div className="fa-composer-area"><form className="fa-composer" onSubmit={submit}><label className="cm-sr" htmlFor="fa-message">Try a sample shopping question</label><MessageCircle size={18} /><input id="fa-message" value={input} onChange={event => setInput(event.target.value)} maxLength={160} placeholder="Ask about a cable, milk or notebook…" autoComplete="off" /><button type="submit" aria-label="Send sample question" disabled={!input.trim()}><ArrowRight size={18} /></button></form><div className="fa-chat-footer"><span><i />{unsupported ? "Choose a sample story" : phases[phase]}</span><button disabled={phase >= 5 || unsupported} onClick={() => { setPlaying(false); next(); }}>Next step<ChevronRight size={13} /></button></div></div></div>
      <aside className="fa-storyboard"><div className="fa-storyboard-title"><span>FROM A NEED TO A NEARBY FIND</span><p>A little less searching.<br /><strong>A little more living.</strong></p></div><div className="fa-journey">{[{ icon: MessageCircle, title: "Tell us what you need.", text: "Your words. Your everyday." }, { icon: Layers3, title: "See the possibilities.", text: "A few useful options, side by side." }, { icon: ShoppingBag, title: "Make your next stop local.", text: "Choose a shop. Preview a pickup." }].map((step, i) => <button key={step.title} className={progress === i ? "active" : ""} aria-pressed={progress === i} onClick={() => { setPhase(i * 2); setPlaying(false); setUnsupported(false); }}><span><step.icon size={18} /></span><div><strong>{step.title}</strong><p>{step.text}</p></div><i /></button>)}</div><div className="fa-local-map"><div className="fa-map-roads" /><div className="fa-map-park" /><div className="fa-map-radius"><i /><i /></div><span className="fa-location-dot" /><button className={`fa-shop-marker fa-shop-one${selected === 0 ? " active" : ""}`} aria-label={`Show ${story.options[0].shop} on concept map`} onClick={() => { setSelected(0); if (phase < 2) setPhase(2); }}><Store size={19} /></button><button className={`fa-shop-marker fa-shop-two${selected === 1 ? " active" : ""}`} aria-label={`Show ${story.options[1].shop} on concept map`} onClick={() => { setSelected(1); if (phase < 2) setPhase(2); }}><Store size={18} /></button><span className="fa-map-caption"><MapPin size={12} />A sample neighbourhood</span><div className="fa-local-shop" key={`${storyIndex}-${selected}`}><span><Store size={19} /></span><div><strong>{story.options[selected].shop}</strong><span>{story.options[selected].distance} · {story.options[selected].walk}</span></div><ArrowUpRight size={15} /></div></div><span className="fa-storyboard-note"><Compass size={13} />A concept for the road ahead.</span></aside>
    </div>
    <div className="fa-bottom"><div><span>TRY A DIFFERENT STORY</span><div>{stories.map((s, i) => <button key={s.id} className={storyIndex === i && !unsupported ? "active" : ""} aria-pressed={storyIndex === i && !unsupported} onClick={() => chooseStory(i)}>{s.label}<ArrowUpRight size={12} /></button>)}</div></div><p>Scripted concept with sample data. <br />No live searches or pickup requests are sent.</p></div>
  </section>;
}
