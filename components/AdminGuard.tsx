"use client";
import { type ReactNode, useEffect, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import styles from "./AdminGuard.module.css";
type AppRole="admin"|"usuario";
export default function AdminGuard({children,requiredRole}:{children:ReactNode;requiredRole:AppRole}){
 const [authorized,setAuthorized]=useState(false); const [message,setMessage]=useState("Validando acceso...");
 useEffect(()=>{let mounted=true;if(!hasSupabaseConfig){window.location.replace("/login");return}
 const supabase=createSupabaseBrowserClient();
 async function validate(){try{let {data:{session},error}=await supabase.auth.getSession();if(error)throw error;if(!session){await new Promise(r=>setTimeout(r,700));const result=await supabase.auth.getSession();session=result.data.session;if(result.error)throw result.error}if(!session?.user){window.location.replace("/login");return}
 const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(profileError)console.warn(profileError.message);const role:AppRole=profile?.role==="admin"?"admin":"usuario";if(role!==requiredRole){window.location.replace(role==="admin"?"/admin":"/usuario");return}if(mounted)setAuthorized(true)}catch(e){console.error(e);if(mounted)setMessage(e instanceof Error?e.message:"No fue posible validar la sesión.")}}
 void validate();const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"||!session)window.location.replace("/login")});return()=>{mounted=false;subscription.unsubscribe()};},[requiredRole]);
 if(!authorized)return <main className={styles.loading}><div className={styles.spinner}/><p>{message}</p></main>;return children;
}
