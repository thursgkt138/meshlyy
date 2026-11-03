export type PosDraftLine={id:string;quantity:number};
export function validatePosDraft(value:unknown,validIds:ReadonlySet<string>):PosDraftLine[]{
 if(!Array.isArray(value)||value.length<1||value.length>20)throw Error("POS draft must contain 1–20 items");
 const seen=new Set<string>();
 return value.map(row=>{
  if(!row||typeof row!=="object"||Array.isArray(row))throw Error("Invalid POS line");
  const {id,quantity}=row as Record<string,unknown>;
  if(typeof id!=="string"||!validIds.has(id)||seen.has(id))throw Error("Unknown or duplicate product");
  if(typeof quantity!=="number"||!Number.isInteger(quantity)||quantity<1||quantity>100)throw Error("Quantity must be 1–100 whole units");
  seen.add(id);return {id,quantity};
 });
}
export function encodePosDraft(value:unknown,validIds:ReadonlySet<string>):string{
 return "/retailer/pos?voiceDraft="+encodeURIComponent(JSON.stringify(validatePosDraft(value,validIds)));
}
export function decodePosDraft(raw:string|null,validIds:ReadonlySet<string>):PosDraftLine[]{
 if(!raw||raw.length>16000)throw Error("Invalid voice draft");
 return validatePosDraft(JSON.parse(raw),validIds);
}
