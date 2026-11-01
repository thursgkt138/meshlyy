"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const EMAIL="demo@meshlyy.test", PASSWORD="MeshlyyTrial2026!";
export default function RetailerTrial(){
 const [allowed,setAllowed]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[signed,setSigned]=useState(false),[name,setName]=useState(""),[pin,setPin]=useState(""),[address,setAddress]=useState(""),[opening,setOpening]=useState("09:00"),[closing,setClosing]=useState("21:00"),[isOpen,setIsOpen]=useState(false),[error,setError]=useState("");
 useEffect(()=>{setAllowed(process.env.NODE_ENV==="development"&&(location.hostname==="localhost"||location.hostname==="127.0.0.1"));try{const v=JSON.parse(localStorage.getItem("meshlyy-retailer-trial")||"{}");setName(v.name||"");setPin(v.pin||"");setAddress(v.address||"");setOpening(v.opening||"09:00");setClosing(v.closing||"21:00");setIsOpen(!!v.isOpen);}catch{}},[]);
 const save=()=>{localStorage.setItem("meshlyy-retailer-trial",JSON.stringify({name,pin,address,opening,closing,isOpen}));};
 const field:React.CSSProperties={padding:13,border:"1px solid #d6e3db",borderRadius:10,fontSize:16,width:"100%",boxSizing:"border-box"};
 const label:React.CSSProperties={display:"grid",gap:6,fontSize:13,fontWeight:700};
 if(!allowed)return <main style={{padding:40,fontFamily:"Arial"}}><h1>Trial unavailable</h1><p>Open this page on your local development server.</p><Link href="/retailer/login">Return to sign in</Link></main>;
 return <main style={{minHeight:"100vh",background:"#f5f8f5",padding:20,fontFamily:"Arial,sans-serif",color:"#143e38"}}><section style={{maxWidth:540,margin:"30px auto",background:"white",borderRadius:20,padding:28,border:"1px solid #dbe8df"}}>
 <p style={{letterSpacing:2,fontSize:12}}>MESHLYY · OFFLINE TRIAL</p>
 {!signed?<><h1>Try Retailer Studio</h1><p style={{color:"#648072"}}>This is a local preview. No SMS, email, or internet authentication needed. It does not access your live store or database.</p><form onSubmit={e=>{e.preventDefault();if(email===EMAIL&&password===PASSWORD){setSigned(true);setError("");}else setError("Incorrect trial credentials.");}} style={{display:"grid",gap:14}}>
 <label style={label}>Trial email<input style={field} type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label style={label}>Trial password<input style={field} type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
 <button style={{padding:15,borderRadius:10,background:"#143e38",color:"white",border:0,fontWeight:700}}>Enter trial →</button></form></>:<>
 <h1>{name?"Your trial shop":"Set up your trial shop"}</h1><p style={{color:"#648072"}}>Try the simple onboarding form. Details are saved only in this browser.</p>
 <div style={{display:"grid",gap:14}}><label style={label}>Shop name<input style={field} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sharma General Store"/></label>
 <label style={label}>PIN code<input style={field} inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\\D/g,""))} placeholder="6-digit PIN"/></label>
 <label style={label}>Shop address<input style={field} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street and landmark"/></label>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={label}>Opening<input style={field} type="time" value={opening} onChange={e=>setOpening(e.target.value)}/></label><label style={label}>Closing<input style={field} type="time" value={closing} onChange={e=>setClosing(e.target.value)}/></label></div>
 <button type="button" onClick={()=>{const next=!isOpen;setIsOpen(next);localStorage.setItem("meshlyy-retailer-trial",JSON.stringify({name,pin,address,opening,closing,isOpen:next}));}} style={{padding:15,borderRadius:10,border:0,background:isOpen?"#d8f4e2":"#f8e5de",color:"#143e38",fontWeight:700}}>{isOpen?"● Shop open · Turn off":"○ Shop closed · Turn on"}</button>
 <button onClick={()=>{if(name.trim().length<2||!/^[0-9]{6}$/.test(pin)){setError("Enter a shop name and valid 6-digit PIN.");return;}save();setError("Saved locally in this browser.");}} style={{padding:15,borderRadius:10,background:"#143e38",color:"white",border:0,fontWeight:700}}>Save trial shop</button>
 </div></>}
 {error&&<p role="status" style={{padding:12,background:"#edf4ed",borderRadius:10}}>{error}</p>}
 <p style={{fontSize:12,color:"#688879",marginTop:25}}>Local trial only · Not a real Supabase login · Do not enter bank details or other sensitive information.</p></section></main>;
}