"use client";

import {
  Camera,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getCurrentProfile, supabase } from "@/lib/supabase";

import styles from "./Perfil.module.css";

type Role = "admin" | "usuario";

export default function Perfil() {
  const [role, setRole] =
    useState<Role>("usuario");

  const [photo, setPhoto] =
    useState("");

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [state, setState] =
    useState("");

  const [
    municipality,
    setMunicipality,
  ] = useState("");

  const [
    favoriteTeam,
    setFavoriteTeam,
  ] = useState("");

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const profile = await getCurrentProfile();
      if (!active || !profile) return;
      setRole(profile.role);
      setPhoto(profile.avatar_url ?? "");
      setName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
      setPhone(profile.phone ?? "");
      setState(profile.state ?? "");
      setMunicipality(profile.municipality ?? "");
      setFavoriteTeam(profile.favorite_team ?? "");
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userData.user.id}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (uploadError) {
      console.error(uploadError);
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
    const value = `${publicData.publicUrl}?v=${Date.now()}`;
    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: value }).eq("id", userData.user.id);
    if (profileError) {
      console.error(profileError);
      return;
    }

    setPhoto(value);
    window.dispatchEvent(new Event("hrr-profile-updated"));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: name.trim(),
      phone: phone.trim() || null,
      state: state.trim() || null,
      municipality: municipality.trim() || null,
      favorite_team: favoriteTeam.trim() || null,
      avatar_url: photo || null,
      updated_at: new Date().toISOString(),
    }).eq("id", userData.user.id);

    if (error) {
      console.error(error);
      return;
    }

    setSaved(true);
    window.dispatchEvent(new Event("hrr-profile-updated"));
    window.setTimeout(() => setSaved(false), 2500);
  }

  const isAdmin =
    role === "admin";

  return (
    <>
      <div className={styles.pageTitle}>
        <span>
          Mi cuenta
        </span>

        <h1>
          Perfil
        </h1>

        <p>
          Actualiza tu información
          personal y tu fotografía.
        </p>
      </div>

      <section
        className={styles.profileCard}
      >
        <div
          className={styles.photoColumn}
        >
          <div
            className={styles.profilePhoto}
          >
            {photo ? (
              <img
                src={photo}
                alt="Foto de perfil"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserRound />
            )}
          </div>

          <label
            className={styles.photoButton}
          >
            <Camera />

            <span>
              Cambiar fotografía
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadPhoto}
            />
          </label>

          <p
            className={styles.imageHelp}
          >
            Usa una imagen JPG, PNG
            o WEBP.
          </p>

          {isAdmin ? (
            <div
              className={`${styles.statusCard} ${styles.adminStatus}`}
            >
              <div
                className={
                  styles.statusIcon
                }
              >
                <ShieldCheck />
              </div>

              <div>
                <span>
                  Tipo de cuenta
                </span>

                <strong>
                  Administrador
                </strong>
              </div>
            </div>
          ) : (
            <div
              className={styles.statusCard}
            >
              <div
                className={
                  styles.statusIcon
                }
              >
                <Trophy />
              </div>

              <div>
                <span>
                  Ranking
                </span>

                <strong>
                  #2
                </strong>
              </div>
            </div>
          )}
        </div>

        <form
          className={styles.profileForm}
          onSubmit={saveProfile}
        >
          <div
            className={styles.formHeading}
          >
            <span>
              Datos personales
            </span>

            <h2>
              Información de la cuenta
            </h2>

            <p>
              Estos datos se utilizarán
              para identificar tu perfil
              dentro de la plataforma.
            </p>
          </div>

          <div
            className={styles.formGrid}
          >
            <label>
              Nombre completo

              <div
                className={
                  styles.inputWrap
                }
              >
                <UserRound />

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Nombre completo"
                />
              </div>
            </label>

            <label>
              Correo electrónico

              <div
                className={
                  styles.inputWrap
                }
              >
                <Mail />

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </label>

            <label>
              Teléfono

              <div
                className={
                  styles.inputWrap
                }
              >
                <Phone />

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="(000) 000 0000"
                />
              </div>
            </label>

            <label>
              Estado

              <div
                className={
                  styles.inputWrap
                }
              >
                <MapPin />

                <input
                  value={state}
                  onChange={(event) =>
                    setState(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Veracruz"
                />
              </div>
            </label>

            <label>
              Municipio

              <div
                className={
                  styles.inputWrap
                }
              >
                <MapPin />

                <input
                  value={municipality}
                  onChange={(event) =>
                    setMunicipality(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Boca del Río"
                />
              </div>
            </label>

            <label>
              Equipo favorito

              <div
                className={
                  styles.inputWrap
                }
              >
                <Shield />

                <input
                  value={favoriteTeam}
                  onChange={(event) =>
                    setFavoriteTeam(
                      event.target.value
                    )
                  }
                  placeholder="Nombre del equipo"
                />
              </div>
            </label>
          </div>

          <div
            className={styles.formActions}
          >
            {saved && (
              <span
                className={
                  styles.savedMessage
                }
              >
                Cambios guardados
                correctamente.
              </span>
            )}

            <button type="submit">
              <Save />

              Guardar cambios
            </button>
          </div>
        </form>
      </section>
    </>
  );
}