"use client";

import Link from "next/link";

import {
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Gift,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Radio,
  Settings2,
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
  getCurrentProfile,
  supabase,
} from "@/lib/supabase";

import styles from "./AdminShell.module.css";

type Role =
  | "admin"
  | "usuario";

type MenuItem = readonly [
  href: string,
  label: string,
  icon: typeof UserRound,
];

const adminItems:
  readonly MenuItem[] = [
    ["/admin", "Inicio", UserRound],
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
    [
      "/admin/demo",
      "Demo",
      Settings2,
    ],
  ];

const userItems:
  readonly MenuItem[] = [
    ["/usuario", "Inicio", UserRound],
    [
      "/usuario/ranking",
      "Ranking",
      Trophy,
    ],
    [
      "/usuario/cazar-recompensas",
      "Cazar recompensas",
      Trophy,
    ],
    [
      "/usuario/promociones",
      "Promociones",
      Gift,
    ],
  ];

interface AdminShellProps {
  children:
    React.ReactNode;
}

export default function AdminShell({
  children,
}: AdminShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    sidebarCollapsed,
    setSidebarCollapsed,
  ] = useState(false);

  const [
    role,
    setRole,
  ] = useState<Role>(
    "usuario"
  );

  const [
    photo,
    setPhoto,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const profile = await getCurrentProfile();
      if (!active || !profile) return;
      setRole(profile.role);
      setPhoto(profile.avatar_url ?? "");
    }

    void loadProfile();
    const refresh = () => { void loadProfile(); };
    window.addEventListener("hrr-profile-updated", refresh);

    return () => {
      active = false;
      window.removeEventListener("hrr-profile-updated", refresh);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function toggleSidebar() {
    setSidebarCollapsed((currentValue) => !currentValue);
  }

  async function logout() {
    await supabase.auth.signOut();
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
    <div
      className={`${styles.adminShell} ${
        sidebarCollapsed
          ? styles.adminShellCollapsed
          : ""
      }`}
    >
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
        } ${
          sidebarCollapsed
            ? styles.sidebarCollapsed
            : ""
        }`}
      >
        <button
          type="button"
          className={
            styles.desktopCollapseButton
          }
          onClick={
            toggleSidebar
          }
          aria-label={
            sidebarCollapsed
              ? "Expandir menú lateral"
              : "Contraer menú lateral"
          }
          title={
            sidebarCollapsed
              ? "Expandir menú"
              : "Contraer menú"
          }
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen />
          ) : (
            <PanelLeftClose />
          )}
        </button>

        <div
          className={
            styles.sidebarBrand
          }
        >
          <img
            src="/images/logo-home-run.png"
            alt="Home Run Rewards"
          />

          <div
            className={
              styles.sidebarBrandText
            }
          >
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
          className={
            styles.sidebarClose
          }
          onClick={() =>
            setMenuOpen(false)
          }
          aria-label="Cerrar menú"
        >
          <X />
        </button>

        <Link
          href={role === "admin" ? "/admin/perfil" : "/usuario/perfil"}
          className={
            styles.profileHead
          }
          title={
            sidebarCollapsed
              ? "Editar perfil"
              : undefined
          }
        >
          <div
            className={
              styles.avatar
            }
          >
            {photo ? (
              <img
                src={photo}
                alt="Foto de perfil"
                referrerPolicy="no-referrer"
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

        <nav
          className={
            styles.navigation
          }
        >
          {menuItems.map(
            ([
              href,
              label,
              Icon,
            ]) => {
              const active =
                pathname ===
                  href ||
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
                  title={
                    sidebarCollapsed
                      ? label
                      : undefined
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
          className={
            styles.logout
          }
          onClick={logout}
          title={
            sidebarCollapsed
              ? "Cerrar sesión"
              : undefined
          }
        >
          <LogOut />

          <span>
            Cerrar sesión
          </span>
        </button>
      </aside>

      <section
        className={
          styles.adminMain
        }
      >
        <header
          className={
            styles.mobileHeader
          }
        >
          <button
            type="button"
            className={
              styles.menuButton
            }
            onClick={() =>
              setMenuOpen(true)
            }
            aria-label="Abrir menú"
          >
            <Menu />
          </button>

          <div
            className={
              styles.headerTitle
            }
          >
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

        <main
          className={
            styles.adminContent
          }
        >
          {children}
        </main>
      </section>
    </div>
  );
}
