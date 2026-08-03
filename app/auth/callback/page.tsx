"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

type ProfileRole = "admin" | "usuario";
export default function AuthCallbackPage() {
  const [message,setMessage]=useState("Validando tu cuenta...");
  useEffect(()=>{
    let cancelled=false;
    async function completeLogin(){
      if(!hasSupabaseConfig){ setMessage("Supabase no está configurado."); window.setTimeout(()=>window.location.replace("/login"),1800); return; }
      const supabase=createSupabaseBrowserClient();
      try{
        await new Promise<void>(resolve=>window.setTimeout(resolve,650));
        let {data:{session},error}=await supabase.auth.getSession();
        if(error) throw error;
        if(!session){
          session=await new Promise(resolve=>{
            let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"]|null=null;
            const timeout=window.setTimeout(()=>{subscription?.unsubscribe();resolve(null)},5000);
            const result=supabase.auth.onAuthStateChange((event,nextSession)=>{
              if(event==="SIGNED_IN"||event==="INITIAL_SESSION"){
                window.clearTimeout(timeout); subscription?.unsubscribe(); resolve(nextSession);
              }
            });
            subscription=result.data.subscription;
          });
        }
        if(!session?.user) throw new Error("No se pudo recuperar la sesión de Google.");
        let role:ProfileRole="usuario";
        const {data:profile,error:profileError}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();
        if(profileError) console.warn("Perfil aún no disponible:",profileError.message);
        if(profile?.role==="admin") role="admin";
        if(cancelled) return;
        setMessage("Acceso correcto. Redirigiendo...");
        window.location.replace(role==="admin"?"/admin":"/usuario");
      }catch(error){
        console.error("Error del callback:",error);
        if(cancelled) return;
        setMessage(error instanceof Error?error.message:"No fue posible completar el inicio de sesión.");
        window.setTimeout(()=>window.location.replace("/login"),5000);
      }
    }
    void completeLogin(); return()=>{cancelled=true};
  },[]);
  return <main style={{minHeight:"100svh",display:"grid",placeItems:"center",padding:24,background:"#07080a",color:"#fff",textAlign:"center"}}><section><img src="/images/logo-home-run.png" alt="Home Run Rewards" style={{width:"min(280px,72vw)",height:"auto",objectFit:"contain",marginBottom:24}}/><p>{message}</p></section></main>;
}
