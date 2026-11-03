// Offline E2E contract: speech transcript -> production parser -> SKU resolution -> POS URL -> production decoder.
// No browser, microphone, database, stock holds or checkout are executed.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict"),ts=require("typescript");
function load(file){const src=fs.readFileSync(path.join(__dirname,"../app/retailer/assistant/",file),"utf8");const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const output={};vm.runInNewContext(js,{exports:output,require,console});return output;}
const {parseBasket,resolveBasket}=load("basket-engine.ts");
const {encodePosDraft,decodePosDraft,validatePosDraft}=load("pos-draft.ts");
const inventory=[{id:"m1",name:"Amul Gold Milk",stock:8},{id:"m2",name:"Heritage Toned Milk",stock:9},{id:"e1",name:"Fresh Egg",stock:12},{id:"b1",name:"Whole Wheat Bread",stock:10},{id:"p1",name:"Loose Potato",stock:10}];
const ids=new Set(inventory.map(x=>x.id));
let passed=0,failed=0;
function test(label,fn){try{fn();passed++;console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}}
function journey(utterance,expected){
 const terms=parseBasket(utterance,inventory.map(i=>i.name));
 const basket=resolveBasket(terms,inventory);
 assert.equal(basket.length,expected.length,"number of basket lines");
 const lines=basket.map((l,i)=>{
  assert.equal(l.quantity,expected[i].quantity,"quantity for "+l.term);
  if(l.status==="ambiguous")assert.ok(l.options.some(o=>o.id===expected[i].id),"SKU choice must be available");
  else assert.equal(l.selectedId,expected[i].id,"SKU selected for "+l.term);
  return {id:expected[i].id,quantity:l.quantity};
 });
 const url=encodePosDraft(lines,ids);
 assert.ok(url.startsWith("/retailer/pos?voiceDraft="));
 const raw=new URL(url,"http://localhost").searchParams.get("voiceDraft");
 assert.deepEqual(JSON.parse(JSON.stringify(decodePosDraft(raw,ids))),expected);
}
test("Hinglish speech to POS",()=>journey("Ek dudh Char Ande",[{id:"m1",quantity:1},{id:"e1",quantity:4}]));
test("English multi item to POS",()=>journey("milk bread",[{id:"m2",quantity:1},{id:"b1",quantity:1}]));
test("Three items to POS",()=>journey("Aalu one milk one egg",[{id:"p1",quantity:1},{id:"m1",quantity:1},{id:"e1",quantity:1}]));
test("Numeric quantities to POS",()=>journey("2 milk and 3 egg",[{id:"m1",quantity:2},{id:"e1",quantity:3}]));
test("Reject unknown product",()=>assert.throws(()=>validatePosDraft([{id:"bad",quantity:1}],ids)));
test("Reject zero quantity",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:0}],ids)));
test("Reject fractional quantity",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:1.5}],ids)));
test("Reject negative quantity",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:-1}],ids)));
test("Reject duplicate SKU",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:1},{id:"m1",quantity:2}],ids)));
test("Reject oversized quantity",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:101}],ids)));
test("Reject empty basket",()=>assert.throws(()=>validatePosDraft([],ids)));
test("Reject malformed JSON",()=>assert.throws(()=>decodePosDraft("{",ids)));
test("Reject forged numeric string",()=>assert.throws(()=>validatePosDraft([{id:"m1",quantity:"2"}],ids)));
test("Reject oversized URL",()=>assert.throws(()=>decodePosDraft("x".repeat(16001),ids)));
console.log(JSON.stringify({scope:"PRODUCTION SPEECH-TO-POS CONTRACT (NO BROWSER/DB)",passed,failed,total:passed+failed},null,2));
if(failed)process.exitCode=1;
