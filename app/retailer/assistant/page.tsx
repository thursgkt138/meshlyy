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
  const saleIntent=/bech|becha|bechi|bech diya|sold|sell|sale|बेच|बिका|बेचा|बिक्री/.test(q);
  const receiveIntent=/aaya|aayi|received|restock|stock aaya|आया|आई|मिला|जमा/.test(q);
  const unitLine=/(\\d+(?:\\.\\d+)?|aadha|adha|half|sawa|dhai|pauna|आधा|सवा|ढाई)\\s*(kilo|kg|kilogram|gram|g|packet|packets|pack|piece|pieces|pcs|litre|liter|l|ml|किलो|ग्राम|पैकेट|पीस)?\\s+([^,;]+?)(?=\\s+(?:aur|and|और)\\s+\\d|[,;]|$)/giu;
  const parts=[...raw.matchAll(unitLine)].map(m=>{
   const words:Record<string,number>={aadha:.5,adha:.5,half:.5,sawa:1.25,dhai:2.5,pauna:.75,"आधा":.5,"सवा":1.25,"ढाई":2.5};
   const amount=words[m[1].toLowerCase()]??Number(m[1]);
   const unit=(m[2]||"piece").toLowerCase();
   const phrase=norm(m[3].replace(/\\b(bech diya|becha|bechi|sold|sell|aaya|aayi|received|stock|add|aur|and)\\b/gi,""));
   const ranked=indexed.map(i=>({i,score:norm(i.name).split(" ").filter(t=>t.length>2&&phrase.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
   return {amount,unit,ranked};
  }).filter(p=>p.amount>0&&p.ranked.length>0);
  if((saleIntent||receiveIntent||parts.length>1)&&parts.length){
   const unresolved=parts.some(p=>p.ranked.length>1&&p.ranked[0].score===p.ranked[1].score);
   const fractional=parts.some(p=>!Number.isInteger(p.amount)||/kg|kilo|gram|litre|liter|ml|किलो|ग्राम/.test(p.unit));
   const description=parts.map(p=>`${p.amount} ${p.unit} — ${p.ranked[0].i.name}`).join("; ");
   if(unresolved){setAnswer({title:"Choose the exact product variant",detail:"Multiple stocked SKUs match this speech. Please specify the brand and pack size before preparing a transaction.",items:parts.flatMap(p=>p.ranked.slice(0,4).map(x=>({id:x.i.productId,name:x.i.name,stock:x.i.stock})))});return;}
   if(fractional){setAnswer({title:"Measured quantity detected",detail:description,warning:"This store still uses integer-based POS holds. Decimal/weight transactions are not enabled until the unit-aware database migration is applied; no stock was changed."});return;}
   if(receiveIntent&&!saleIntent&&parts.length===1){const p=parts[0];setAnswer({title:"Restock draft",detail:description,link:`/retailer/stock?product=${encodeURIComponent(p.ranked[0].i.productId)}&direction=add&quantity=${p.amount}`,linkText:"Review and confirm restock",warning:"Stock remains unchanged until confirmed."});return;}
   if(saleIntent||parts.length>1){
    const lines=parts.map(p=>({id:p.ranked[0].i.productId,quantity:p.amount}));
    if(lines.some(l=>l.quantity>100)){setAnswer({title:"Quantity too large",detail:"POS currently limits each product to 100 units.",warning:"No stock was changed."});return;}
    const encoded=encodeURIComponent(JSON.stringify(lines));
    setAnswer({title:"Voice checkout draft",detail:description,link:`/retailer/pos?voiceDraft=${encoded}`,linkText:"Review items in POS",warning:"No sale has been completed. Review the items and confirm checkout in POS."});return;
   }
  }
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
