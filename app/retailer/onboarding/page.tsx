"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "../catalog/use-retailer-store";
export default function RetailerOnboarding(){
 const router=useRouter();const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [error,setError]=useState("");
 const [name,setName]=useState("");const [pin,setPin]=useState("");const [address,setAddress]=useState("");const [locality,setLocality]=useState("");const [opening,setOpening]=useState("09:00");const [closing,setClosing]=useState("21:00");
 useEffect(()=>{if(!supabase){setError("Supabase configuration missing.");setLoading(false);return;}supabase.auth.getUser().then(async({data})=>{if(!data.user){router.replace("/retailer/login");return;}const stores=await supabase!.from("retailer_stores").select("id").eq("owner_id",data.user.id).limit(1);if(stores.data?.length){router.replace("/retailer/dashboard");return;}setLoading(false);}).catch(e=>{setError(String(e));setLoading(false);});},[router]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase)return; if(name.trim().length<2||!/^[0-9]{6}$/.test(pin)){setError("Enter your shop name and a valid 6-digit PIN code.");return;}setSaving(true);setError("");const {data}=await supabase.auth.getUser();if(!data.user){router.replace("/retailer/login");return;}
 const {error:dbError}=await supabase.from("retailer_stores").insert({owner_id:data.user.id,name:name.trim(),address:address.trim()||null,locality:locality.trim()||null,pincode:pin,opens_at:opening,closes_at:closing,is_open:false}).select("id").single();setSaving(false);if(dbError)setError(dbError.message);else router.replace("/retailer/dashboard");};
 const input:React.CSSProperties={padding:13,width:"100%",boxSizing:"border-box",borderRadius:10,border:"1px solid #d1dfd6",fontSize:16};const label:React.CSSProperties={display:"grid",gap:7,fontSize:14,fontWeight:700};
 return <main style={{minHeight:"100vh",background:"#f5f8f5",display:"grid",placeItems:"center",padding:18,fontFamily:"Arial,sans-serif",color:"#143e38"}}><section style={{background:"white",border:"1px solid #e0eae3",borderRadius:22,padding:"clamp(20px,5vw,40px)",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
 <Link href="/" style={{color:"#143e38",fontWeight:800,textDecoration:"none",fontSize:21}}>◈ meshlyy</Link><p style={{fontSize:12,letterSpacing:2,color:"#688879"}}>STEP 1 OF 2 · YOUR SHOP</p><h1 style={{fontSize:29,margin:"12px 0"}}>Tell us about your shop</h1><p style={{color:"#668276",lineHeight:1.6}}>Just a few details to get started. You can add your logo, GST and bank details later.</p>
 {loading?<p>Checking your account…</p>:<form onSubmit={save} style={{display:"grid",gap:16,marginTop:23}}>
 <label style={label}>Shop name *<input style={input} required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sharma General Store"/></label>
 <label style={label}>PIN code *<input style={input} required inputMode="numeric" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\\D/g,""))} placeholder="6-digit PIN code"/></label>
 <label style={label}>Shop address<input style={input} value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street, building or landmark"/></label>
 <label style={label}>Area / locality<input style={input} value={locality} onChange={e=>setLocality(e.target.value)} placeholder="e.g. Indiranagar"/></label>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={label}>Opens at<input style={input} type="time" value={opening} onChange={e=>setOpening(e.target.value)}/></label><label style={label}>Closes at<input style={input} type="time" value={closing} onChange={e=>setClosing(e.target.value)}/></label></div>
 <p style={{fontSize:12,color:"#668276",margin:0}}>Your shop starts as Closed. You can switch it on from your dashboard when ready.</p>
 <button disabled={saving} style={{background:"#143e38",color:"white",border:0,padding:16,borderRadius:11,fontWeight:700,fontSize:15}}>{saving?"Saving…":"Create my shop →"}</button></form>}
 {error&&<p role="alert" style={{color:"#a23e32",fontSize:13}}>{error}</p>}
 </section></main>;
}