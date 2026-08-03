"use client";
import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/supabase";
import styles from "./PortalHome.module.css";
export default function PortalHome({role}:{role:"admin"|"usuario"}){
 const [name,setName]=useState("");
 useEffect(()=>{let active=true;void getCurrentProfile().then(profile=>{if(active&&profile){const first=profile.full_name.trim().split(/\s+/)[0]||"Usuario";setName(first)}});return()=>{active=false}},[]);
 return <main className={styles.home}><div className={styles.aura}/><img src="/images/logo-home-run.png" alt="Home Run Rewards" className={styles.logo}/><span>{role==="admin"?"Panel administrativo":"Panel de usuario"}</span><h1>{name?`Bienvenido, ${name}`:"Home Run Rewards"}</h1><p>{role==="admin"?"Administra campañas, preguntas, recompensas y experiencias desde un solo lugar.":"Descubre campañas, suma puntos y desbloquea nuevas recompensas."}</p></main>;
}
