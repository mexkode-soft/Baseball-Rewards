"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BriefcaseBusiness, LogOut, Menu, PlusCircle, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./SponsorShell.module.css";
import NotificationBell from "@/components/NotificationBell";

const items = [
  ["/patrocinador", "Dashboard", BarChart3],
  ["/patrocinador/campanas", "Mis campañas", BriefcaseBusiness],
  ["/patrocinador/campanas/nueva", "Crear campaña", PlusCircle],
  ["/patrocinador/perfil", "Mi perfil", UserRound],
] as const;

export default function SponsorShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false); const [planName,setPlanName]=useState("");
  useEffect(()=>{void (async()=>{const {data}=await supabase.from("sponsor_members").select("sponsor_organizations(plan_code,subscription_plans(name))").limit(1).maybeSingle();const org=Array.isArray(data?.sponsor_organizations)?data?.sponsor_organizations[0]:data?.sponsor_organizations;const plan=Array.isArray(org?.subscription_plans)?org?.subscription_plans[0]:org?.subscription_plans;setPlanName(plan?.name??org?.plan_code??"")})()},[]);
  async function logout(){ await supabase.auth.signOut(); router.replace('/login'); }
  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${open?styles.open:""}`}>
      <div className={styles.brand}><img src="/images/logo-home-run.png" alt="Home Run Rewards"/><div><strong>Portal de marcas</strong><span>Patrocinador</span>{planName?<small style={{display:"inline-flex",marginTop:6,padding:"4px 8px",borderRadius:999,background:"#3a2f17",color:"#efc65d",fontWeight:700}}>Plan {planName}</small>:null}</div><button onClick={()=>setOpen(false)} className={styles.close} aria-label="Cerrar"><X/></button></div>
      <nav>{items.map(([href,label,Icon])=><Link key={href} href={href} className={pathname===href?styles.active:""}><Icon/><span>{label}</span></Link>)}</nav>
      <button className={styles.logout} onClick={logout}><LogOut/>Cerrar sesión</button>
    </aside>
    {open?<button className={styles.overlay} onClick={()=>setOpen(false)} aria-label="Cerrar menú"/>:null}
    <section className={styles.content}><header><button onClick={()=>setOpen(true)} aria-label="Abrir menú"><Menu/></button><div><span>Home Run Rewards</span><strong>Centro de resultados</strong></div><NotificationBell /></header><main>{children}</main></section>
  </div>
}
