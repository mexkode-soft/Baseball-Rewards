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
import { readRanking } from "@/lib/ranking";
import { prepareProfileAvatar } from "@/lib/image";
import { getStateCode, LMB_TEAMS, MEXICO_STATES, normalizeStateName } from "@/lib/mexicoCatalog";

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

  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState("");

  const [rankingPosition, setRankingPosition] = useState<number | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");

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
      setState(normalizeStateName(profile.state));
      setMunicipality(profile.municipality ?? "");
      setFavoriteTeam(profile.favorite_team ?? "");
      if (profile.role !== "admin") {
        const ranking = await readRanking(1000);
        const position = ranking.findIndex((player) => player.id === profile.id);
        setRankingPosition(position >= 0 ? position + 1 : null);
      }
    }

    void loadProfile();
    return () => { active = false; };
  }, []);


  useEffect(() => {
    const stateCode = getStateCode(state);

    if (!stateCode) {
      setMunicipalities([]);
      setMunicipalitiesError("");
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadMunicipalities() {
      setMunicipalitiesLoading(true);
      setMunicipalitiesError("");

      try {
        const response = await fetch(`/api/geo/municipalities?state=${stateCode}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { municipalities?: string[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No fue posible cargar los municipios.");
        if (!active) return;

        const options = payload.municipalities ?? [];
        setMunicipalities(options);
        setMunicipality((current) => current && options.includes(current) ? current : "");
      } catch (error) {
        if (controller.signal.aborted || !active) return;
        setMunicipalities([]);
        setMunicipalitiesError(error instanceof Error ? error.message : "No fue posible cargar los municipios.");
      } finally {
        if (active) setMunicipalitiesLoading(false);
      }
    }

    void loadMunicipalities();
    return () => { active = false; controller.abort(); };
  }, [state]);

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;

    setPhotoLoading(true);
    setPhotoMessage("");

    try {
      const optimized = await prepareProfileAvatar(file);
      const path = `${userData.user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, optimized, {
        upsert: true,
        contentType: "image/webp",
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      const value = `${publicData.publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: value, updated_at: new Date().toISOString() }).eq("id", userData.user.id);
      if (profileError) throw profileError;

      setPhoto(value);
      setPhotoMessage(`Fotografía optimizada (${Math.max(1, Math.round(optimized.size / 1024))} KB).`);
      window.dispatchEvent(new Event("hrr-profile-updated"));
    } catch (error) {
      console.error(error);
      setPhotoMessage(error instanceof Error ? error.message : "No fue posible subir la fotografía.");
    } finally {
      setPhotoLoading(false);
      event.target.value = "";
    }
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
              disabled={photoLoading}
            />
          </label>

          <p
            className={styles.imageHelp}
          >
            La imagen se recorta al centro y se comprime automáticamente.
          </p>

          {photoMessage && <p className={styles.photoMessage} role="status">{photoMessage}</p>}

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
                  {rankingPosition ? `#${rankingPosition}` : "Sin posición"}
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

                <select
                  value={state}
                  onChange={(event) => {
                    setState(event.target.value);
                    setMunicipality("");
                  }}
                  required
                >
                  <option value="">Selecciona un estado</option>
                  {MEXICO_STATES.map((stateOption) => (
                    <option key={stateOption.code} value={stateOption.name}>
                      {stateOption.name}
                    </option>
                  ))}
                </select>
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

                <select
                  value={municipality}
                  onChange={(event) => setMunicipality(event.target.value)}
                  disabled={!state || municipalitiesLoading}
                  required
                >
                  <option value="">
                    {!state
                      ? "Primero selecciona un estado"
                      : municipalitiesLoading
                        ? "Cargando municipios..."
                        : "Selecciona un municipio"}
                  </option>
                  {municipalities.map((municipalityOption) => (
                    <option key={municipalityOption} value={municipalityOption}>
                      {municipalityOption}
                    </option>
                  ))}
                </select>
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

                <select
                  value={favoriteTeam}
                  onChange={(event) => setFavoriteTeam(event.target.value)}
                  required
                >
                  <option value="">Selecciona tu equipo favorito</option>
                  {LMB_TEAMS.map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          {municipalitiesError && (
            <p className={styles.catalogError} role="alert">{municipalitiesError}</p>
          )}

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