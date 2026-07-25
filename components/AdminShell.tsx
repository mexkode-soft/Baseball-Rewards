"use client";

import Link from "next/link";

import {
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Gift,
  LogOut,
  MapPinned,
  Megaphone,
  Menu,
  Percent,
  Radio,
  Trophy,
  UserRound,
  UserRoundCog,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  hasSupabaseConfig,
  supabase,
} from "@/lib/supabase";

import styles from "./AdminShell.module.css";

type Role = "admin" | "usuario";

type MenuItem = readonly [
  href: string,
  label: string,
  icon: typeof UserRound,
];

const adminItems: readonly MenuItem[] = [
  [
    "/admin/mapas-premios",
    "Mapas / Premios",
    MapPinned,
  ],
  [
    "/admin/crear-campana",
    "Crear campaña",
    Trophy,
  ],
  [
    "/admin/preguntas",
    "Listado de preguntas",
    CircleHelp,
  ],
  [
    "/admin/niveles",
    "Niveles",
    ChartNoAxesColumnIncreasing,
  ],
  [
    "/admin/ranking",
    "Ranking",
    Trophy,
  ],
  [
    "/admin/promociones",
    "Promociones",
    Percent,
  ],
  [
    "/admin/anuncios",
    "Anuncios",
    Megaphone,
  ],
  [
    "/admin/canal-difusion",
    "Canal de difusión",
    Radio,
  ],
];

const userItems: readonly MenuItem[] = [
  [
    "/admin/ranking",
    "Ranking",
    Trophy,
  ],
  [
    "/admin/cazar-recompensas",
    "Cazar recompensas",
    MapPinned,
  ],
  [
    "/admin/promociones",
    "Promociones",
    Gift,
  ],
];

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [role, setRole] =
    useState<Role>("usuario");

  const [photo, setPhoto] =
    useState("");

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

    function updateProfilePhoto() {
      setPhoto(
        localStorage.getItem(
          "hrr-photo"
        ) ?? ""
      );
    }

    window.addEventListener(
      "hrr-profile-updated",
      updateProfilePhoto
    );

    if (hasSupabaseConfig) {
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

          setPhoto(
            data.user?.user_metadata
              ?.avatar_url ?? ""
          );
        });
    }

    return () => {
      window.removeEventListener(
        "hrr-profile-updated",
        updateProfilePhoto
      );
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    if (hasSupabaseConfig) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem(
      "hrr-demo-role"
    );

    router.replace("/login");
  }

  const menuItems =
    role === "admin"
      ? adminItems
      : userItems;

  const roleLabel =
    role === "admin"
      ? "Administrador"
      : "Usuario";

  return (
    <div className={styles.adminShell}>
      <button
        type="button"
        className={`${styles.sidebarOverlay} ${
          menuOpen
            ? styles.sidebarOverlayOpen
            : ""
        }`}
        onClick={() =>
          setMenuOpen(false)
        }
        aria-label="Cerrar menú lateral"
      />

      <aside
        className={`${styles.sidebar} ${
          menuOpen
            ? styles.sidebarOpen
            : ""
        }`}
      >
        <div className={styles.sidebarBrand}>
          <img
            src="/images/logo-home-run.png"
            alt="Home Run Rewards"
          />

          <div>
            <strong>
              Home Run Rewards
            </strong>

            <span>
              Panel {roleLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          className={styles.sidebarClose}
          onClick={() =>
            setMenuOpen(false)
          }
          aria-label="Cerrar menú"
        >
          <X />
        </button>

        <Link
          href="/admin/perfil"
          className={styles.profileHead}
        >
          <div className={styles.avatar}>
            {photo ? (
              <img
                src={photo}
                alt="Foto de perfil"
              />
            ) : (
              <UserRoundCog />
            )}
          </div>

          <div
            className={
              styles.profileInformation
            }
          >
            <strong>
              {roleLabel}
            </strong>

            <span>
              Editar perfil
            </span>
          </div>
        </Link>

        <nav className={styles.navigation}>
          {menuItems.map(
            ([
              href,
              label,
              Icon,
            ]) => {
              const active =
                pathname === href ||
                pathname.startsWith(
                  `${href}/`
                );

              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? styles.active
                      : ""
                  }
                >
                  <Icon />

                  <span>
                    {label}
                  </span>
                </Link>
              );
            }
          )}
        </nav>

        <button
          type="button"
          className={styles.logout}
          onClick={logout}
        >
          <LogOut />

          <span>
            Cerrar sesión
          </span>
        </button>
      </aside>

      <section className={styles.adminMain}>
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={() =>
              setMenuOpen(true)
            }
            aria-label="Abrir menú"
          >
            <Menu />
          </button>

          <div className={styles.headerTitle}>
            <strong>
              Home Run Rewards
            </strong>

            <span>
              Panel {roleLabel}
            </span>
          </div>

          <img
            src="/images/logo-home-run.png"
            alt="Home Run Rewards"
          />
        </header>

        <main className={styles.adminContent}>
          {children}
        </main>
      </section>
    </div>
  );
}