"use client";

import { Camera, Save, UserRound } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { getCurrentProfile, supabase } from "@/lib/supabase";
import { prepareProfileAvatar } from "@/lib/image";
import styles from "../SponsorDashboard.module.css";

type SponsorProfile = { id: string; full_name: string; email: string; avatar_url: string };

export default function SponsorProfile() {
  const [profile, setProfile] = useState<SponsorProfile | null>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getCurrentProfile().then((value) => {
      if (!active || !value) return;
      setProfile(value);
      setName(value.full_name ?? "");
      setPhoto(value.avatar_url ?? "");
    });
    return () => { active = false; };
  }, []);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setWorking(true);
    setMessage("");
    try {
      const optimized = await prepareProfileAvatar(file);
      const path = `${profile.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, optimized, {
        upsert: true,
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const nextPhoto = `${publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("profiles").update({ avatar_url: nextPhoto, updated_at: new Date().toISOString() }).eq("id", profile.id);
      if (error) throw error;
      setPhoto(nextPhoto);
      setProfile((current) => current ? { ...current, avatar_url: nextPhoto } : current);
      setMessage(`Fotografía actualizada y comprimida a ${Math.max(1, Math.round(optimized.size / 1024))} KB.`);
      window.dispatchEvent(new Event("hrr-profile-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible actualizar la fotografía.");
    } finally {
      setWorking(false);
      event.target.value = "";
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setWorking(true);
    setMessage("");
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), updated_at: new Date().toISOString() }).eq("id", profile.id);
    setWorking(false);
    if (error) return setMessage(error.message);
    setProfile({ ...profile, full_name: name.trim() });
    setMessage("Perfil actualizado correctamente.");
    window.dispatchEvent(new Event("hrr-profile-updated"));
  }

  return <div className={styles.page}>
    <div className={styles.heading}><div><h1>Mi perfil</h1><p>Administra la cuenta vinculada a la organización patrocinadora.</p></div></div>
    <form className={styles.panel} onSubmit={save} style={{ display: "grid", gap: 22, maxWidth: 820 }}>
      {!profile ? <p>Cargando...</p> : <>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ width: 112, height: 112, borderRadius: "50%", overflow: "hidden", background: "#050607", display: "grid", placeItems: "center", border: "1px solid #343842" }}>
            {photo ? <img src={photo} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} /> : <UserRound size={54} />}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <label className={styles.button} style={{ cursor: working ? "wait" : "pointer" }}><Camera size={18} /> Cambiar fotografía<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} disabled={working} hidden /></label>
            <small style={{ color: "#aeb5c1" }}>Se recorta al centro, se convierte a WebP y se comprime automáticamente.</small>
          </div>
        </div>
        <label>Nombre visible<input value={name} onChange={(event) => setName(event.target.value)} style={input} /></label>
        <label>Correo<input value={profile.email} readOnly style={{ ...input, opacity: .72 }} /></label>
        <span className={styles.badge} style={{ justifySelf: "start" }}>Patrocinador</span>
        {message ? <p style={{ margin: 0, color: message.toLowerCase().includes("correct") || message.toLowerCase().includes("actualizada") ? "#8de3a8" : "#ffaaaa" }}>{message}</p> : null}
        <button className={styles.button} type="submit" disabled={working} style={{ border: 0, justifySelf: "start", cursor: "pointer" }}><Save size={18} /> {working ? "Guardando..." : "Guardar cambios"}</button>
      </>}
    </form>
  </div>;
}

const input = { display: "block", width: "100%", marginTop: 7, boxSizing: "border-box" as const, border: "1px solid #30343c", borderRadius: 12, padding: "12px 13px", background: "#0b0d10", color: "white", font: "inherit" };
