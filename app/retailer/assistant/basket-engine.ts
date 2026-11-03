export type BasketTerm={term:string;quantity:number};
const counts:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,ek:1,do:2,teen:3,char:4,paanch:5,एक:1,दो:2,तीन:3,चार:4};
export const productAliases:Record<string,string>={aalu:"potato",aloo:"potato",aaloo:"potato",alu:"potato","आलू":"potato",doodh:"milk",dudh:"milk","दूध":"milk",anda:"egg",ande:"egg",andey:"egg","अंडा":"egg","अंडे":"egg",pyaaz:"onion",pyaz:"onion",tamatar:"tomato"};
export const normalize=(s:string)=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function parseBasket(text:string,stockedNames:string[]):BasketTerm[]{
 const q=normalize(text).replace(/\b(and|aur|plus)\b|और/gu,",").replace(/\b(please|basket|cart|add|create|make|bill|for|me)\b/gu," ");
 const words=q.split(/[\s,]+/).filter(Boolean);
 const isQty=(w:string)=>/^\d+$/.test(w)||counts[w]!==undefined;
 const terms:BasketTerm[]=[];let buffer:string[]=[];let prefix:number|null=null;
 const flush=(suffix?:number)=>{if(buffer.length){terms.push({term:buffer.join(" "),quantity:suffix??prefix??1});buffer=[];prefix=null;}};
 for(const w of words){if(isQty(w)){const n=counts[w]??Number(w);if(buffer.length)flush(n);else prefix=n;}else buffer.push(w);}
 flush();
 if(terms.length===1&&words.length>=2&&!words.some(isQty)){
  const filler=new Set(["stock","check","show","find","sell","sold","bech","becha","diya","aaya","available","kitna","hai","the","my"]);
  const candidate=words.filter(w=>!filler.has(w));const mapped=candidate.map(w=>productAliases[w]||w);
  const names=stockedNames.map(normalize);
  if(candidate.length>1&&!names.some(n=>n.includes(mapped.join(" ")))&&mapped.every(w=>names.some(n=>n.split(" ").includes(w))))return candidate.map(term=>({term,quantity:1}));
 }
 return terms;
}
export function resolveBasket(terms:BasketTerm[],stocked:{id:string;name:string;stock:number}[]){
 return terms.map(t=>{
  const words=normalize(t.term).split(" ").map(w=>productAliases[w]||w);
  const ranked=stocked.map(i=>({i,score:words.filter(w=>normalize(i.name).split(" ").includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  const best=ranked[0]?.score||0;
  const options=ranked.filter(x=>x.score===best).slice(0,12).map(x=>({id:x.i.id,name:x.i.name,stock:x.i.stock}));
  return {term:t.term,quantity:t.quantity,options,selectedId:options.length===1?options[0].id:"",status:(options.length===0?"missing":options.length===1?"matched":"ambiguous") as "matched"|"ambiguous"|"missing"};
 });
}
