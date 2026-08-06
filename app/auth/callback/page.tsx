"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import { obtenerRolActual, obtenerRutaInicialPorRol } from "@/lib/roles";
const esperar=(ms:number)=>new Promise((r)=>window.setTimeout(r,ms));
export default function PaginaCallbackAutenticacion(){
 const [mensaje,setMensaje]=useState("Validando tu cuenta...");
 useEffect(()=>{let cancelado=false; async function completar(){
  if(!hasSupabaseConfig){setMensaje("Supabase no está configurado.");window.setTimeout(()=>window.location.replace("/login"),1800);return;}
  const supabase=createSupabaseBrowserClient();
  try{
   const url=new URL(window.location.href); const codigo=url.searchParams.get("code");
   if(codigo){setMensaje("Confirmando el acceso...");const {error}=await supabase.auth.exchangeCodeForSession(codigo);if(error&&!error.message.toLowerCase().includes("code verifier"))throw error;url.searchParams.delete("code");url.searchParams.delete("state");window.history.replaceState({},"",`${url.pathname}${url.search}`);}
   let sesion=null;let ultimoError:Error|null=null;for(let i=0;i<8&&!sesion;i++){const r=await supabase.auth.getSession();sesion=r.data.session;if(r.error)ultimoError=r.error;if(!sesion)await esperar(450+i*150);}if(!sesion?.user)throw(ultimoError??new Error("No se pudo recuperar la sesión de Supabase."));
   setMensaje("Revisando tu perfil...");
   const {data:profile,error:profileError}=await supabase.from("profiles").select("phone,state,municipality,favorite_team,registration_completed").eq("id",sesion.user.id).maybeSingle();
   if(profileError)throw profileError;
   const complete=Boolean(profile?.registration_completed&&profile?.phone&&profile?.state&&profile?.municipality&&profile?.favorite_team);
   if(!complete){window.location.replace("/completar-registro");return;}
   const rol=await obtenerRolActual(supabase); if(cancelado)return; setMensaje("Acceso correcto. Redirigiendo...");window.location.replace(obtenerRutaInicialPorRol(rol));
  }catch(error){console.error(error);if(!cancelado)setMensaje(error instanceof Error?error.message:"No fue posible completar el inicio de sesión.");}
 }
 void completar();return()=>{cancelado=true};},[]);
 return <main style={{minHeight:"100svh",display:"grid",placeItems:"center",padding:24,background:"#07080a",color:"#fff",textAlign:"center"}}><section><img src="/images/logo-home-run.png" alt="Home Run Rewards" style={{width:"min(280px,72vw)",height:"auto",objectFit:"contain",marginBottom:24}}/><p>{mensaje}</p></section></main>;
}
