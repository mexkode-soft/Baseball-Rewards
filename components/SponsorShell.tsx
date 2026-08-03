"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BriefcaseBusiness, LogOut, Menu, PlusCircle, UserRound, X } from "lucide-react";
import { useState } from "react";
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
  const pathname=usePathname(); const router=useRouter(); const [open,setOpen]=useState(false);
  async function logout(){ await supabase.auth.signOut(); router.replace('/login'); }
  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${open?styles.open:""}`}>
      <div className={styles.brand}><img src="/images/logo-home-run.png" alt="Home Run Rewards"/><div><strong>Portal de marcas</strong><span>Patrocinador</span></div><button onClick={()=>setOpen(false)} className={styles.close} aria-label="Cerrar"><X/></button></div>
      <nav>{items.map(([href,label,Icon])=><Link key={href} href={href} className={pathname===href?styles.active:""}><Icon/><span>{label}</span></Link>)}</nav>
      <button className={styles.logout} onClick={logout}><LogOut/>Cerrar sesión</button>
    </aside>
    {open?<button className={styles.overlay} onClick={()=>setOpen(false)} aria-label="Cerrar menú"/>:null}
    <section className={styles.content}><header><button onClick={()=>setOpen(true)} aria-label="Abrir menú"><Menu/></button><div><span>Home Run Rewards</span><strong>Centro de resultados</strong></div><NotificationBell /></header><main>{children}</main></section>
  </div>
}
