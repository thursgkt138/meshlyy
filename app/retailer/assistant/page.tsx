"use client";
import {useMemo,useState,useEffect,useRef} from "react";
import Link from "next/link";
import {Mic,MicOff,Send,Sparkles,PackageSearch,Boxes,ShoppingCart,BarChart3,ArrowRight,ShieldCheck} from "lucide-react";
import catalog from "../../../meshlyy-master-catalog.json";
import {useRetailerStore} from "../catalog/use-retailer-store";
import "./assistant.css";
type Product={id:string;name:string;category?:string};
type Recognition={lang:string;interimResults:boolean;onresult:((e:{results:ArrayLike<{0:{transcript:string}}>;resultIndex:number})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
type SpeechWindow=Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
const products=catalog as Product[];
const byId=new Map(products.map(p=>[p.id,p]));
const norm=(s:string)=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
type Answer={title:string;detail:string;items?:{name:string;stock:number;id:string}[];link?:string;linkText?:string;warning?:string};
export default function RetailAssistant(){
 const store=useRetailerStore();
 const [input,setInput]=useState("");const [heard,setHeard]=useState("");const [answer,setAnswer]=useState<Answer|null>(null);
 const [listening,setListening]=useState(false);const [error,setError]=useState("");
 const recognition=useRef<Recognition|null>(null);
 useEffect(()=>()=>{recognition.current?.stop();},[]);
 const indexed=useMemo(()=>store.items.map(i=>({...i,name:byId.get(i.productId)?.name||i.productId})),[store.items]);
 const run=(raw:string)=>{
  const q=norm(raw);setHeard(raw);setError("");if(!q)return;
  if(/low stock|running low|कम स्टॉक|कम माल|कम सामान/.test(q)){
   const items=indexed.filter(i=>i.stock>0&&i.stock<=5).sort((a,b)=>a.stock-b.stock).slice(0,20);
   setAnswer({title:items.length?`${items.length} low-stock products`:"No low-stock products found",detail:"Showing products with 1–5 available units. This is current available stock, not a demand forecast.",items:items.map(i=>({id:i.productId,name:i.name,stock:i.stock})),link:"/retailer/stock",linkText:"Open inventory"});return;
  }
  if(/out of stock|sold out|zero stock|खत्म|स्टॉक नहीं/.test(q)){
   const items=indexed.filter(i=>i.stock===0).slice(0,20);
   setAnswer({title:`${items.length} out-of-stock products`,detail:"Showing up to 20 products with zero available units.",items:items.map(i=>({id:i.productId,name:i.name,stock:i.stock})),link:"/retailer/stock",linkText:"Open inventory"});return;
  }
  if(/sales|revenue|analytics|बिक्री|कमाई/.test(q)){setAnswer({title:"Sales & analytics",detail:"Your existing sales dashboard has revenue and transaction reporting.",link:"/retailer/sales",linkText:"Open sales dashboard"});return;}
  if(/order|pickup|ऑर्डर/.test(q)){setAnswer({title:"Online pickup orders",detail:"Review new orders, accepted pickups, and pickup verification.",link:"/retailer/orders",linkText:"Open orders"});return;}
  if(/bill|checkout|pos|बेचो|बिल/.test(q)){setAnswer({title:"Point of sale",detail:"Open POS to create a bill using the existing inventory-safe checkout.",link:"/retailer/pos",linkText:"Open POS"});return;}
  const stockAction=/add|increase|restock|received|जोड़|बढ़ा|आया/.test(q);
  const quantity=raw.match(/\b(\d{1,5})\b/);
  const candidates=indexed.map(i=>({item:i,score:norm(i.name).split(" ").filter(t=>t.length>2&&q.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(stockAction&&quantity&&candidates.length){
   const first=candidates[0].item;
   if(candidates.length>1&&candidates[1].score===candidates[0].score){setAnswer({title:"Which product did you mean?",detail:"Several products match. Choose the correct product before preparing a stock change.",items:candidates.slice(0,6).map(x=>({id:x.item.productId,name:x.item.name,stock:x.item.stock}))});return;}
   setAnswer({title:"Stock update draft",detail:`Add ${quantity[1]} units of ${first.name}. Current available stock: ${first.stock}. This is a draft only; review and confirm on the inventory page.`,link:`/retailer/stock?product=${encodeURIComponent(first.productId)}&direction=add&quantity=${quantity[1]}`,linkText:"Review stock change",warning:"No inventory has been changed."});return;
  }
  if(candidates.length){setAnswer({title:"Matching products",detail:"Products found in this store's inventory.",items:candidates.slice(0,12).map(x=>({id:x.item.productId,name:x.item.name,stock:x.item.stock}))});return;}
  setAnswer({title:"I couldn't match that command",detail:"Try asking for low stock, finding a product, adding stock, opening orders, or viewing sales. No changes were made."});
 };
 const startVoice=()=>{
  const w=window as SpeechWindow;const C=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!C){setError("Voice recognition is not available in this browser. You can type your command instead.");return;}
  try{recognition.current?.stop();const rec=new C();rec.lang="en-IN";rec.interimResults=false;rec.onresult=e=>{const t=e.results[e.resultIndex][0].transcript;setInput(t);run(t);};rec.onerror=e=>{setError("Microphone: "+e.error);setListening(false);};rec.onend=()=>setListening(false);recognition.current=rec;rec.start();setListening(true);setError("");}catch{setError("Unable to start microphone. Check browser permissions.");setListening(false);}
 };
 return <main className="mesh-assistant"><div className="mesh-ai-head"><div><p>RETAILER STUDIO / AI TOOLS</p><h1>Meshlyy Assistant <Sparkles size={27}/></h1><span>Speak or type. Find products and prepare everyday shop actions.</span></div><span className="mesh-ai-safe"><ShieldCheck size={16}/> Approval-first</span></div>
 <div className="mesh-ai-grid"><section className="mesh-ai-main"><div className="mesh-ai-welcome"><span className="mesh-ai-orb"><Sparkles size={25}/></span><h2>What can I help you with?</h2><p>Ask in English or Hindi. The first version supports inventory lookups, stock drafts and shortcuts to your existing retailer tools.</p></div>
 <div className="mesh-ai-chips">{["Show low stock","Which items are out of stock?","Open sales analytics","Show online orders"].map(q=><button key={q} onClick={()=>{setInput(q);run(q);}}>{q} <ArrowRight size={13}/></button>)}</div>
 {answer&&<section className="mesh-ai-result" aria-live="polite"><small>RESULT FOR: {heard}</small><h2>{answer.title}</h2><p>{answer.detail}</p>{answer.items&&<div className="mesh-ai-products">{answer.items.map(i=><Link href={`/retailer/stock?product=${encodeURIComponent(i.id)}`} key={i.id}><span>{i.name}</span><strong>{i.stock} available</strong></Link>)}</div>}{answer.warning&&<p className="mesh-ai-warning">{answer.warning}</p>}{answer.link&&<Link className="mesh-ai-action" href={answer.link}>{answer.linkText} <ArrowRight size={16}/></Link>}</section>}
 {error&&<p className="mesh-ai-error" role="alert">{error}</p>}
 <form className="mesh-ai-input" onSubmit={e=>{e.preventDefault();run(input);}}><button type="button" aria-label={listening?"Stop listening":"Speak command"} title={listening?"Stop listening":"Speak command"} className={listening?"is-listening":""} onClick={()=>{if(listening){recognition.current?.stop();setListening(false);}else startVoice();}}>{listening?<MicOff size={21}/>:<Mic size={21}/>}</button><input aria-label="Ask Meshlyy" placeholder={listening?"Listening…":"Ask Meshlyy about your shop…"} value={input} onChange={e=>setInput(e.target.value)}/><button type="submit" aria-label="Send command" disabled={!input.trim()}><Send size={18}/></button></form></section>
 <aside className="mesh-ai-side"><h3>Connected to your shop</h3><div><Boxes size={19}/><span>Inventory products</span><strong>{indexed.length}</strong></div><div><PackageSearch size={19}/><span>Low stock (1–5)</span><strong>{indexed.filter(i=>i.stock>0&&i.stock<=5).length}</strong></div><div><ShoppingCart size={19}/><span>POS checkout</span><Link href="/retailer/pos">Open</Link></div><div><BarChart3 size={19}/><span>Sales reporting</span><Link href="/retailer/sales">Open</Link></div><p>Product matches use your current store inventory. Commands are interpreted locally; microphone recognition depends on browser support and may use your browser's speech service. Nothing is submitted to stock without your confirmation.</p></aside></div></main>;
}
