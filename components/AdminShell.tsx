"use client";

import Link from "next/link";

import {
  CalendarRange,
  ChevronDown,
  Building2,
  ClipboardCheck,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  ListChecks,
  Gift,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  Radio,
  ReceiptText,
  BarChart3,
  Settings2,
  Trophy,
  Gamepad2,
  Scale,
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

import NotificationBell from "@/components/NotificationBell";
import styles from "./AdminShell.module.css";

type Role =
  | "admin"
  | "usuario"
  | "sponsor";

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
      "/admin/campanas",
      "Mis campañas",
      ListChecks,
    ],
    [
      "/admin/campanas-patrocinadores",
      "Aprobar campañas",
      ClipboardCheck,
    ],
    [
      "/admin/tickets",
      "Validar tickets",
      ReceiptText,
    ],
    [
      "/admin/metricas-campanas",
      "Métricas por campaña",
      BarChart3,
    ],
    ["/admin/patrocinadores", "Patrocinadores", Building2],
    [
      "/admin/temporadas",
      "Temporadas",
      CalendarRange,
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
    ["/admin/legal", "Legal y consentimientos", Scale],
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
      "/usuario/recompensas",
      "Mis recompensas",
      Gift,
    ],
    [
      "/usuario/promociones",
      "Promociones",
      Percent,
    ],
    ["/usuario/baseball-fantasy", "Baseball Fantasy", Gamepad2],
  ];

const sponsorItems:
  readonly MenuItem[] = [
    ["/patrocinador", "Métricas", BarChart3],
    ["/patrocinador/campanas/nueva", "Crear campaña", Trophy],
    ["/patrocinador/campanas", "Mis campañas", ListChecks],
  ];

interface AdminShellProps {
  children: React.ReactNode;
  rolDelPanel: Role;
}

export default function AdminShell({
  children,
  rolDelPanel,
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
    photo,
    setPhoto,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const profile = await getCurrentProfile();
      if (!active || !profile) return;
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
    rolDelPanel === "admin"
      ? adminItems
      : rolDelPanel === "sponsor"
        ? sponsorItems
        : userItems;

  const roleLabel =
    rolDelPanel === "admin"
      ? "Administrador"
      : rolDelPanel === "sponsor"
        ? "Patrocinador"
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
          href={rolDelPanel === "admin" ? "/admin/perfil" : rolDelPanel === "sponsor" ? "/patrocinador/perfil" : "/usuario/perfil"}
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

        <nav className={styles.navigation}>
          {rolDelPanel === "admin" ? (
            <>
              <Link href="/admin" className={pathname === "/admin" ? styles.active : ""}><UserRound /><span>Inicio</span></Link>
              {[
                { label: "Campañas", icon: Trophy, paths: ["/admin/crear-campana","/admin/campanas","/admin/campanas-patrocinadores","/admin/metricas-campanas"], items: [["/admin/crear-campana","Crear campaña",Trophy],["/admin/campanas","Mis campañas",ListChecks],["/admin/campanas-patrocinadores","Aprobar campañas",ClipboardCheck],["/admin/metricas-campanas","Métricas por campaña",BarChart3]] },
                { label: "Patrocinadores", icon: Building2, paths: ["/admin/patrocinadores"], items: [["/admin/patrocinadores","Marcas y planes",Building2]] },
                { label: "Configuración", icon: Settings2, paths: ["/admin/temporadas","/admin/preguntas","/admin/niveles","/admin/ranking","/admin/demo"], items: [["/admin/temporadas","Temporadas",CalendarRange],["/admin/preguntas","Preguntas",CircleHelp],["/admin/niveles","Niveles",ChartNoAxesColumnIncreasing],["/admin/ranking","Ranking",Trophy],["/admin/demo","Demo",Settings2]] },
                { label: "Anuncios", icon: Megaphone, paths: ["/admin/promociones","/admin/anuncios","/admin/canal-difusion"], items: [["/admin/promociones","Promociones",Percent],["/admin/anuncios","Cinta y anuncios",Megaphone],["/admin/canal-difusion","Canal de difusión",Radio]] },
              ].map((group) => {
                const GroupIcon = group.icon;
                const groupActive = group.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
                return <details key={group.label} className={styles.navGroup} open={groupActive || undefined}>
                  <summary className={groupActive ? styles.groupActive : ""}><GroupIcon/><span>{group.label}</span><ChevronDown className={styles.groupChevron}/></summary>
                  <div className={styles.navChildren}>{group.items.map(([href,label,Icon]) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return <Link key={String(href)} href={String(href)} className={active ? styles.active : ""}><Icon/><span>{String(label)}</span></Link>;
                  })}</div>
                </details>;
              })}
            </>
          ) : menuItems.map(([href,label,Icon]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} className={active ? styles.active : ""} title={sidebarCollapsed ? label : undefined}><Icon/><span>{label}</span></Link>;
          })}
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
        <div className={styles.desktopNotification}><NotificationBell /></div>
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

          <div className={styles.mobileHeaderActions}>
            <NotificationBell />
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
            />
          </div>
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
