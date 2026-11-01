"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "../catalog/use-retailer-store";
export default function RetailerAccess(){
 const router=useRouter();
 const [mode,setMode]=useState<"login"|"signup">("login");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [ready,setReady]=useState(false);
 useEffect(()=>{setMode(window.location.pathname.endsWith("/signup")?"signup":"login");setReady(true);},[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return setNotice("Supabase configuration is missing.");
  setBusy(true);setNotice("");
  const result=mode==="signup"?await supabase.auth.signUp({email:email.trim(),password}):await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(result.error){setNotice(result.error.message);setBusy(false);return;}
  if(mode==="signup"&&!result.data.session){setNotice("Check your email for a verification link, then sign in.");setBusy(false);return;}
  router.replace("/retailer/dashboard");router.refresh();setBusy(false);
 };
 const reset=async()=>{if(!supabase||!email.trim()){setNotice("Enter your email first.");return;}setBusy(true);const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+"/retailer/login"});setNotice(error?.message||"If this email has an account, check your inbox for reset instructions.");setBusy(false);};
 const field:React.CSSProperties={width:"100%",padding:"14px 15px",borderRadius:11,border:"1px solid #cadbd2",fontSize:15,boxSizing:"border-box"};
 return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f8f5",padding:20,fontFamily:"Arial,sans-serif",color:"#143e38"}}>
 <section style={{background:"white",padding:"clamp(24px,5vw,44px)",borderRadius:24,border:"1px solid #e0eae3",maxWidth:440,width:"100%",boxSizing:"border-box",boxShadow:"0 20px 65px #143e3810"}}>
 <Link href="/" style={{textDecoration:"none",color:"#143e38",fontSize:22,fontWeight:800}}>◈ meshlyy</Link><p style={{fontSize:12,letterSpacing:2,color:"#6b8a7c"}}>RETAILER STUDIO</p>
 <h1 style={{fontSize:30,margin:"20px 0 8px"}}>{mode==="signup"?"Create retailer account":"Welcome back"}</h1><p style={{color:"#678276",lineHeight:1.6}}>Manage your neighbourhood store from one workspace.</p>
 <form onSubmit={submit} style={{display:"grid",gap:15,marginTop:24}}>
 <label style={{display:"grid",gap:7,fontWeight:600,fontSize:13}}>Email<input style={field} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@yourstore.com"/></label>
 <label style={{display:"grid",gap:7,fontWeight:600,fontSize:13}}>Password<input style={field} type="password" autoComplete={mode==="signup"?"new-password":"current-password"} minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
 <button type="submit" disabled={busy||!ready} style={{background:"#143e38",color:"white",border:0,padding:15,borderRadius:11,fontWeight:700,cursor:"pointer"}}>{busy?"Please wait…":mode==="signup"?"Create account →":"Sign in →"}</button>
 </form>
 {mode==="login"&&<button type="button" onClick={()=>void reset()} disabled={busy} style={{background:"none",border:0,padding:"14px 0",color:"#19705d",cursor:"pointer"}}>Forgot password?</button>}
 {notice&&<p role="status" style={{padding:12,background:"#f0f5f0",borderRadius:10,fontSize:13,lineHeight:1.6}}>{notice}</p>}
 <p style={{fontSize:14,color:"#607a70"}}>{mode==="login"?"New to Meshlyy? ":"Already registered? "}<Link href={mode==="login"?"/retailer/signup":"/retailer/login"} style={{fontWeight:700,color:"#19705d"}}>{mode==="login"?"Create an account":"Sign in"}</Link></p>
 </section></main>;
}