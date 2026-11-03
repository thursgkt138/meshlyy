// Tests the exact TypeScript module imported by the production Assistant.
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const ts=require("typescript");
const source=fs.readFileSync(path.join(__dirname,"../app/retailer/assistant/basket-engine.ts"),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(compiled,{exports,require,console});
const {parseBasket,resolveBasket}=exports;
const inventory=[{id:"m1",name:"Amul Gold Milk",stock:6},{id:"m2",name:"Heritage Toned Milk",stock:16},{id:"b1",name:"Multigrain Bread",stock:1},{id:"e1",name:"Farm Fresh Eggs",stock:12},{id:"p1",name:"Loose Potato",stock:8}];
const cases=[
 ["Ek dudh Char Ande",[["dudh",1],["ande",4]]],
 ["milk bread",[["milk",1],["bread",1]]],
 ["Aalu one milk one egg",[["aalu",1],["milk",1],["egg",1]]],
 ["2 milk and 3 eggs",[["milk",2],["eggs",3]]],
 ["ek doodh aur do anda",[["doodh",1],["anda",2]]],
 ["one milk one egg",[["milk",1],["egg",1]]],
 ["4 aalu and 2 milk",[["aalu",4],["milk",2]]]
];
let passed=0;
for(const [input,expected] of cases){
 const got=parseBasket(input,inventory.map(i=>i.name)).map(x=>[x.term,x.quantity]);
 try{assert.deepEqual(JSON.parse(JSON.stringify(got)),expected);passed++;console.log("PASS",input);}
 catch(e){console.error("FAIL",input,"expected",expected,"got",got);process.exitCode=1;}
}
const basket=resolveBasket(parseBasket("milk bread",inventory.map(i=>i.name)),inventory);
assert.equal(basket.length,2);
assert.equal(basket[0].status,"ambiguous");
assert.equal(basket[1].selectedId,"b1");
const absent=resolveBasket([{term:"soap",quantity:1}],inventory);
assert.equal(absent[0].status,"missing");
console.log(JSON.stringify({scope:"ACTUAL PRODUCTION BASKET MODULE",passed,total:cases.length,success:process.exitCode!==1},null,2));
