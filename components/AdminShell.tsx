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
  hasSupabaseConfig,
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
    [
      "/admin/ranking",
      "Ranking",
      Trophy,
    ],
    [
      "/admin/cazar-recompensas",
      "Cazar recompensas",
      Trophy,
    ],
    [
      "/admin/promociones",
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

    setSidebarCollapsed(
      localStorage.getItem(
        "hrr-sidebar-collapsed"
      ) === "true"
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
            data.user
              ?.user_metadata
              ?.role;

          setRole(
            metadataRole ===
              "admin"
              ? "admin"
              : "usuario"
          );

          setPhoto(
            data.user
              ?.user_metadata
              ?.avatar_url ??
              ""
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

  function toggleSidebar() {
    setSidebarCollapsed(
      (currentValue) => {
        const nextValue =
          !currentValue;

        localStorage.setItem(
          "hrr-sidebar-collapsed",
          String(nextValue)
        );

        return nextValue;
      }
    );
  }

  async function logout() {
    if (hasSupabaseConfig) {
      await supabase.auth
        .signOut();
    }

    localStorage.removeItem(
      "hrr-demo-role"
    );

    router.replace(
      "/login"
    );
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
          href="/admin/perfil"
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
