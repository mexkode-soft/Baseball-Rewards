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

import {
  hasSupabaseConfig,
  supabase,
} from "@/lib/supabase";

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
    const demoRole =
      localStorage.getItem(
        "hrr-demo-role"
      ) === "admin"
        ? "admin"
        : "usuario";

    setRole(demoRole);

    setPhoto(
      localStorage.getItem(
        "hrr-photo"
      ) ?? ""
    );

    setName(
      localStorage.getItem(
        "hrr-name"
      ) ?? ""
    );

    setEmail(
      localStorage.getItem(
        "hrr-email"
      ) ?? ""
    );

    setPhone(
      localStorage.getItem(
        "hrr-phone"
      ) ?? ""
    );

    setState(
      localStorage.getItem(
        "hrr-state"
      ) ?? ""
    );

    setMunicipality(
      localStorage.getItem(
        "hrr-municipality"
      ) ?? ""
    );

    setFavoriteTeam(
      localStorage.getItem(
        "hrr-favorite-team"
      ) ?? ""
    );

    if (!hasSupabaseConfig) {
      return;
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        const metadataRole =
          data.user?.user_metadata
            ?.role;

        setRole(
          metadataRole === "admin"
            ? "admin"
            : "usuario"
        );

        const avatarUrl =
          data.user?.user_metadata
            ?.avatar_url;

        if (avatarUrl) {
          setPhoto(avatarUrl);
        }
      });
  }, []);

  function uploadPhoto(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const value =
        String(reader.result);

      setPhoto(value);

      localStorage.setItem(
        "hrr-photo",
        value
      );

      window.dispatchEvent(
        new Event(
          "hrr-profile-updated"
        )
      );
    };

    reader.readAsDataURL(file);
  }

  function saveProfile(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    localStorage.setItem(
      "hrr-name",
      name
    );

    localStorage.setItem(
      "hrr-email",
      email
    );

    localStorage.setItem(
      "hrr-phone",
      phone
    );

    localStorage.setItem(
      "hrr-state",
      state
    );

    localStorage.setItem(
      "hrr-municipality",
      municipality
    );

    localStorage.setItem(
      "hrr-favorite-team",
      favoriteTeam
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
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