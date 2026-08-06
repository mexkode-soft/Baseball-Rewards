"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./PublicHeader.module.css";

const MENU_EVENT = "hrr-public-menu-change";

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (open) {
      root.classList.add("hrr-public-menu-open");
      body.style.overflow = "hidden";
      body.style.touchAction = "none";
    } else {
      root.classList.remove("hrr-public-menu-open");
      body.style.removeProperty("overflow");
      body.style.removeProperty("touch-action");
    }

    window.dispatchEvent(
      new CustomEvent(MENU_EVENT, {
        detail: { open },
      })
    );

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      root.classList.remove("hrr-public-menu-open");
      body.style.removeProperty("overflow");
      body.style.removeProperty("touch-action");
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  const mobileMenu =
    open && mounted
      ? createPortal(
          <div
            className={styles.mobileMenuLayer}
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
          >
            <div className={styles.mobileMenuHeader}>
              <Link
                href="/#inicio"
                className={styles.mobileMenuBrand}
                onClick={closeMenu}
                aria-label="Ir al inicio"
              >
                <img
                  src="/images/logo-home-run.png"
                  alt="Home Run Rewards"
                />
              </Link>

              <button
                type="button"
                className={styles.mobileMenuClose}
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <X />
              </button>
            </div>

            <nav className={styles.mobileMenuPanel}>
              <Link href="/#inicio" onClick={closeMenu}>
                Inicio
              </Link>
              <Link href="/#campanas" onClick={closeMenu}>
                Campañas
              </Link>
              <Link href="/#quienes-somos" onClick={closeMenu}>
                ¿Quiénes somos?
              </Link>
              <Link
                href="/login"
                className={styles.mobileLoginButton}
                onClick={closeMenu}
              >
                Login
              </Link>
            </nav>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className={styles.publicHeader}>
        <div className={styles.publicNav}>
          <Link
            href="/#inicio"
            className={styles.publicBrand}
            onClick={closeMenu}
            aria-label="Ir al inicio"
          >
            <img
              src="/images/logo-home-run.png"
              alt="Home Run Rewards"
            />
          </Link>

          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <Menu />
          </button>

          <nav className={styles.navLinks}>
            <Link href="/#inicio">Inicio</Link>
            <Link href="/#campanas">Campañas</Link>
            <Link href="/#quienes-somos">¿Quiénes somos?</Link>
            <Link href="/login" className={styles.navbarLoginButton}>
              Login
            </Link>
          </nav>
        </div>
      </header>
      {mobileMenu}
    </>
  );
}
