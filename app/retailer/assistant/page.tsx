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
const saleIntentFromText=(v:string)=>/bech|becha|bechi|sold|sell|sale|बेच|बिका|बेचा/i.test(v);
export default function RetailAssistant(){
 const store=useRetailerStore();
 const [input,setInput]=useState("");const [heard,setHeard]=useState("");const [answer,setAnswer]=useState<Answer|null>(null);
 const [pending,setPending]=useState<{id:string;name:string;quantity:number;action:"sale"|"restock"}|null>(null);
 const [conversation,setConversation]=useState<{quantity:number|null;unit:string;measured:boolean;mode:"choose"|"actions";productId?:string}|null>(null);
 const [listening,setListening]=useState(false);const [error,setError]=useState("");
 const recognition=useRef<Recognition|null>(null);
 useEffect(()=>()=>{recognition.current?.stop();},[]);
 const indexed=useMemo(()=>store.items.map(i=>({...i,name:byId.get(i.productId)?.name||i.productId})),[store.items]);
 const run=(raw:string)=>{
  const q=norm(raw);setHeard(raw);setError("");setPending(null);setConversation(null);if(!q)return;
  const saleIntent=/bech|becha|bechi|bech diya|sold|sell|sale|बेच|बिका|बेचा|बिक्री/.test(q);
  const uncertainIntent=/bhej|bheja|bheji|भेज/.test(q);
  const receiveIntent=/aaya|aayi|received|restock|stock aaya|आया|आई|मिला|जमा/.test(q);
  const unitLine=/(\d+(?:\.\d+)?|aadha|adha|half|sawa|dhai|pauna|आधा|सवा|ढाई)\s*(kilo|kg|kilogram|gram|g|packet|packets|pack|piece|pieces|pcs|litre|liter|l|ml|किलो|ग्राम|पैकेट|पीस)?\s+([^,;]+?)(?=\s+(?:aur|and|और)\s+\d|[,;]|$)/giu;
  const alias=(v:string)=>{const groups=[["onion","onions","pyaaz","pyaz","pyaj","piyaz","प्याज","प्याज़"],["potato","potatoes","aloo","alu","aaloo","aalu","आलू"],["tomato","tomatoes","tamatar","टमाटर"],["milk","doodh","dudh","दूध"],["sugar","cheeni","chini","चीनी"],["rice","chawal","चावल","akki"],["coriander","dhaniya","dhania","धनिया","kottambari"],["curd","dahi","दही","mosaru"],["ginger","adrak","अदरक","shunti"],["garlic","lahsun","लहसुन","bellulli"],["banana","kela","केला","baale"]];return groups.find(g=>g.includes(v))?.[0]||v;};
  const tokens=(v:string)=>norm(v).split(" ").filter(Boolean).map(alias);
  // Conversational product understanding: detect product independently of transaction intent.
  const stopWords=new Set(["stock","available","availability","have","left","remaining","check","kitna","kitne","hai","hain","bacha","bachi","milega","milegi","quantity","kg","kilo","kilogram","gram","g","litre","liter","ml","pack","packet","piece","pcs","bech","becha","bechi","diya","sell","sold","sale","add","received","aaya","aayi","please","show","me","the","of","in","my","shop","how","much","do","we","is"]);
  const quantityMention=raw.match(/(\d+(?:\.\d+)?)\s*(kilograms?|kilos?|kg|grams?|g|litres?|liters?|ml|packets?|packs?|pieces?|pcs)?/i);
  const requestedAmount=quantityMention?Number(quantityMention[1]):null;
  const requestedUnit=(quantityMention?.[2]||"").toLowerCase();
  const measured=/^(kilograms?|kilos?|kg|grams?|g|litres?|liters?|ml)$/.test(requestedUnit);
  const lookupTokens=tokens(raw).filter(t=>!stopWords.has(t)&&!/^\d+(?:\.\d+)?$/.test(t));
  const lookupMatches=lookupTokens.length?indexed.map(i=>({i,score:tokens(i.name).filter(t=>lookupTokens.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score):[];
  const explicitLookup=/\b(stock|available|availability|have|left|remaining|check|kitna|kitne|bacha|milega|quantity)\b|स्टॉक|कितना|कितने|बचा|उपलब्ध/.test(q);
  if(!saleIntent&&!receiveIntent&&!uncertainIntent&&(requestedAmount!==null||explicitLookup)&&lookupTokens.length){
   if(!lookupMatches.length){setAnswer({title:"Product not in this shop's inventory",detail:"I understood your product request, but no stocked SKU matches. Add the exact product to your shop first.",warning:"No stock changed."});return;}
   const best=lookupMatches[0];
   const ambiguous=lookupMatches.length>1&&lookupMatches[1].score===best.score;
   if(ambiguous){setAnswer({title:"Choose the exact product",detail:"I found multiple variants. Select the product you mean.",items:lookupMatches.slice(0,8).map(x=>({id:x.i.productId,name:x.i.name,stock:x.i.stock})),warning:"No stock changed."});setConversation({quantity:requestedAmount,unit:requestedUnit,measured,mode:"choose"});return;}
   setConversation({quantity:requestedAmount,unit:requestedUnit,measured,mode:"actions",productId:best.i.productId});
   setAnswer({title:"I found "+best.i.name,detail:"Understood "+(requestedAmount===null?"the product":requestedAmount+" "+(requestedUnit||"units"))+". What would you like to do?",warning:"No stock or sale has changed."});return;
  }
  const parts=[...raw.matchAll(unitLine)].map(m=>{
   const words:Record<string,number>={aadha:.5,adha:.5,half:.5,sawa:1.25,dhai:2.5,pauna:.75,"आधा":.5,"सवा":1.25,"ढाई":2.5};
   const amount=words[m[1].toLowerCase()]??Number(m[1]);
   const unit=(m[2]||"piece").toLowerCase();
   const phrase=norm(m[3].replace(/\b(bech diya|becha|bechi|sold|sell|aaya|aayi|received|stock|add|aur|and)\b/gi,""));
   const ignored=new Set(["bech","becha","bechi","diya","gaya","bhej","bheja","bheji","sold","sell","aaya","aayi","received","stock","add","aur","and"]);const phraseTokens=tokens(phrase).filter(t=>!ignored.has(t));
   const ranked=indexed.map(i=>({i,score:tokens(i.name).filter(t=>phraseTokens.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
   return {amount,unit,ranked};
  }).filter(p=>p.amount>0&&p.ranked.length>0);
  if(uncertainIntent&&!saleIntent&&!receiveIntent){setAnswer({title:"Did you mean sold?",detail:"I heard bhej (sent). Please confirm by saying bech diya (sold).",warning:"No inventory changes were made."});return;}
  if((saleIntent||receiveIntent)&&parts.length===0){
   const ignored=new Set(["bech","becha","bechi","diya","gaya","sold","sell","sale","aaya","aayi","received","stock","add","kar","kiya","hai","kilo","kg","gram","g","packet","packets","piece","pieces","pcs","litre","liter","ml"]);
   const requested=tokens(raw).filter(t=>!ignored.has(t));
   const ranked=indexed.map(i=>({i,score:tokens(i.name).filter(t=>requested.includes(t)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
   if(!ranked.length){setAnswer({title:"Product not found",detail:"I understood the action, but couldn't match the product to this store's inventory. Please check the product name.",warning:"No stock changed."});return;}
   if(ranked.length>1&&ranked[0].score===ranked[1].score){setAnswer({title:"Which product?",detail:"Several products match. Please say the brand and pack size.",items:ranked.slice(0,8).map(x=>({id:x.i.productId,name:x.i.name,stock:x.i.stock})),warning:"No stock changed."});return;}
   const item=ranked[0].i;
   const spokenQuantity=raw.match(/\b(\d+(?:\.\d+)?)\s*(kilo|kg|gram|g|packet|packets|piece|pieces|pcs|litre|liter|ml)?\b/i);
   const amount=spokenQuantity?Number(spokenQuantity[1]):1;
   if(spokenQuantity&&/kilo|kg|gram|litre|liter|ml/i.test(spokenQuantity[2]||"")){setAnswer({title:"Weight-based sale needs unit setup",detail:"Recognized "+amount+" "+spokenQuantity[2]+" of "+item.name+". This store uses whole-unit POS stock. Configure a compatible unit before checkout.",warning:"No stock changed."});return;}
   setPending({id:item.productId,name:item.name,quantity:amount,action:saleIntent?"sale":"restock"});
   setAnswer({title:saleIntent?"Confirm offline sale":"Confirm stock received",detail:item.name+" — quantity not spoken. I've assumed 1 unit. Edit the quantity below before confirming.",warning:"Nothing has been changed yet."});return;
  }
  if((saleIntent||receiveIntent||uncertainIntent||parts.length>1)&&parts.length){
   if(uncertainIntent&&!saleIntent&&!receiveIntent){setAnswer({title:"Did you mean sold or sent?",detail:"I heard bhej, which could mean sent. Please say bech diya for sold, or stock aaya for received.",warning:"No inventory changes were made."});return;}
   const unresolved=parts.some(p=>p.ranked.length>1&&p.ranked[0].score===p.ranked[1].score);
   const fractional=parts.some(p=>!Number.isInteger(p.amount)||/kg|kilo|gram|litre|liter|ml|किलो|ग्राम/.test(p.unit));
   const description=parts.map(p=>`${p.amount} ${p.unit} — ${p.ranked[0].i.name}`).join("; ");
   if(unresolved){setAnswer({title:"Choose the exact product variant",detail:"Multiple stocked SKUs match this speech. Please specify the brand and pack size before preparing a transaction.",items:parts.flatMap(p=>p.ranked.slice(0,4).map(x=>({id:x.i.productId,name:x.i.name,stock:x.i.stock})))});return;}
   if(fractional){setAnswer({title:"Measured quantity detected",detail:description,warning:"This store still uses integer-based POS holds. Decimal/weight transactions are not enabled until the unit-aware database migration is applied; no stock was changed."});return;}
   if(receiveIntent&&!saleIntent&&parts.length===1){const p=parts[0];setPending({id:p.ranked[0].i.productId,name:p.ranked[0].i.name,quantity:p.amount,action:"restock"});setAnswer({title:"Restock draft",detail:description,link:`/retailer/stock?product=${encodeURIComponent(p.ranked[0].i.productId)}&direction=add&quantity=${p.amount}`,linkText:"Review and confirm restock",warning:"Stock remains unchanged until confirmed."});return;}
   if(saleIntent&&parts.length===1){const p=parts[0];setPending({id:p.ranked[0].i.productId,name:p.ranked[0].i.name,quantity:p.amount,action:"sale"});setAnswer({title:"Confirm offline sale",detail:description,warning:"Review the quantity below, then proceed to POS checkout. No stock has been changed."});return;}
   if(saleIntent||parts.length>1){
    const lines=parts.map(p=>({id:p.ranked[0].i.productId,quantity:p.amount}));
    if(lines.some(l=>l.quantity>100)){setAnswer({title:"Quantity too large",detail:"POS currently limits each product to 100 units.",warning:"No stock was changed."});return;}
    const encoded=encodeURIComponent(JSON.stringify(lines));
    setAnswer({title:"Voice checkout draft",detail:description,link:`/retailer/pos?voiceDraft=${encoded}`,linkText:"Review items in POS",warning:"No sale has been completed. Review the items and confirm checkout in POS."});return;
   }
  }
  if((saleIntent||receiveIntent||uncertainIntent)&&!parts.length){setAnswer({title:"Could not identify the product",detail:"Please say the quantity and product name, for example 2 kilo pyaaz bech diya.",warning:"No inventory changes were made."});return;}
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
 {answer&&<section className="mesh-ai-result" aria-live="polite"><small>RESULT FOR: {heard}</small><h2>{answer.title}</h2><p>{answer.detail}</p>{answer.items&&<div className="mesh-ai-products">{answer.items.map(i=><button type="button" key={i.id} onClick={()=>{if(conversation?.mode==="choose"){setConversation({...conversation,mode:"actions",productId:i.id});setAnswer({title:"I found "+i.name,detail:"Understood "+(conversation.quantity===null?"the product":conversation.quantity+" "+(conversation.unit||"units"))+". What would you like to do?",warning:"No changes made."});}else if(saleIntentFromText(heard)){setPending({id:i.id,name:i.name,quantity:Number(heard.match(/\b\d+\b/)?.[0]||1),action:"sale"});setAnswer({title:"Confirm selected product",detail:i.name+" — verify the quantity, then continue to POS.",warning:"No stock changed."});}else{window.location.assign("/retailer/stock?product="+encodeURIComponent(i.id));}}}><span>{i.name}</span><strong>{i.stock} available</strong></button>)}</div>}{conversation?.mode==="actions"&&conversation.productId&&<div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:14}}>{(["sale","restock","lookup"] as const).map(action=><button key={action} type="button" onClick={()=>{const product=indexed.find(i=>i.productId===conversation.productId);if(!product)return;const count=conversation.quantity??1;if(action==="lookup"){setAnswer({title:"Stock availability: "+product.name,detail:"Current available inventory: "+product.stock+" whole units. "+(conversation.measured?"You asked for "+count+" "+conversation.unit+". This SKU has no verified weight conversion, so kg availability cannot be calculated safely.":conversation.quantity!==null?"Requested: "+count+" units. "+(product.stock>=count?"Enough units available.":"Not enough units available."):""),warning:"Read-only lookup. No stock changed."});return;}if(conversation.measured){setAnswer({title:"Unit configuration required",detail:"I understood "+count+" "+conversation.unit+" of "+product.name+". POS and stock updates currently accept whole inventory units only. Configure measured inventory before proceeding.",warning:"No changes made."});return;}setPending({id:product.productId,name:product.name,quantity:count,action});setAnswer({title:action==="sale"?"Review sale in POS":"Review incoming stock",detail:product.name+" — "+count+" whole unit(s). Confirm the exact SKU and quantity.",warning:"Nothing has been changed yet."});}} style={{padding:"10px 15px",borderRadius:9,border:"1px solid #bfd4c7",background:action==="sale"?"#17553c":"#fff",color:action==="sale"?"white":"#17553c",cursor:"pointer"}}>{action==="sale"?"Sell in POS":action==="restock"?"Add stock":"Check stock"}</button>)}</div>}{answer.warning&&<p className="mesh-ai-warning">{answer.warning}</p>}{pending&&<div style={{display:"grid",gap:10,marginTop:12,padding:14,background:"#eaf5ed",borderRadius:12}}><label style={{fontSize:12,fontWeight:700}}>Confirm quantity for {pending.name}</label><input aria-label="Confirm quantity" type="number" min="0.001" step="any" value={pending.quantity} onChange={e=>setPending(p=>p?{...p,quantity:Number(e.target.value)}:null)} style={{padding:10,border:"1px solid #c8dfce",borderRadius:8,maxWidth:160}}/><div style={{display:"flex",gap:10,alignItems:"center"}}><button type="button" disabled={!Number.isInteger(pending.quantity)||pending.quantity<1||pending.quantity>100} onClick={()=>{const url=pending.action==="sale"?"/retailer/pos?autoAddVoice=1&voiceDraft="+encodeURIComponent(JSON.stringify([{id:pending.id,quantity:pending.quantity}])):"/retailer/stock?product="+encodeURIComponent(pending.id)+"&direction=add&quantity="+pending.quantity;window.location.assign(url);}} style={{padding:"11px 16px",background:"#17553c",color:"#fff",border:0,borderRadius:8,cursor:"pointer"}}>Confirm &amp; review {pending.action==="sale"?"checkout":"stock update"}</button><button type="button" onClick={()=>setPending(null)}>Cancel</button></div><small>Only whole units are supported by the current database. Fractional quantities remain blocked until migration.</small></div>}{answer.link&&<Link className="mesh-ai-action" href={answer.link}>{answer.linkText} <ArrowRight size={16}/></Link>}</section>}
 {error&&<p className="mesh-ai-error" role="alert">{error}</p>}
 <form className="mesh-ai-input" onSubmit={e=>{e.preventDefault();run(input);}}><button type="button" aria-label={listening?"Stop listening":"Speak command"} title={listening?"Stop listening":"Speak command"} className={listening?"is-listening":""} onClick={()=>{if(listening){recognition.current?.stop();setListening(false);}else startVoice();}}>{listening?<MicOff size={21}/>:<Mic size={21}/>}</button><input aria-label="Ask Meshlyy" placeholder={listening?"Listening…":"Ask Meshlyy about your shop…"} value={input} onChange={e=>setInput(e.target.value)}/><button type="submit" aria-label="Send command" disabled={!input.trim()}><Send size={18}/></button></form></section>
 <aside className="mesh-ai-side"><h3>Connected to your shop</h3><div><Boxes size={19}/><span>Inventory products</span><strong>{indexed.length}</strong></div><div><PackageSearch size={19}/><span>Low stock (1–5)</span><strong>{indexed.filter(i=>i.stock>0&&i.stock<=5).length}</strong></div><div><ShoppingCart size={19}/><span>POS checkout</span><Link href="/retailer/pos">Open</Link></div><div><BarChart3 size={19}/><span>Sales reporting</span><Link href="/retailer/sales">Open</Link></div><p>Product matches use your current store inventory. Commands are interpreted locally; microphone recognition depends on browser support and may use your browser's speech service. Nothing is submitted to stock without your confirmation.</p></aside></div></main>;
}
