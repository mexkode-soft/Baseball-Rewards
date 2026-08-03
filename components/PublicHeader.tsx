"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./PublicHeader.module.css";

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.removeProperty("overflow");
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  const mobileMenu = open && mounted
    ? createPortal(
        <div className={styles.mobileMenuLayer} role="dialog" aria-modal="true" aria-label="Menú principal">
          <button type="button" className={styles.mobileMenuBackdrop} onClick={closeMenu} aria-label="Cerrar menú" />
          <nav className={styles.mobileMenuPanel}>
            <Link href="/#inicio" onClick={closeMenu}>Inicio</Link>
            <Link href="/#quienes-somos" onClick={closeMenu}>¿Quiénes somos?</Link>
            <Link href="/campanas" onClick={closeMenu}>Campañas</Link>
            <Link href="/login" className={styles.mobileLoginButton} onClick={closeMenu}>Login</Link>
          </nav>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <header className={styles.publicHeader}>
        <div className={styles.publicNav}>
          <Link href="/#inicio" className={styles.publicBrand} onClick={closeMenu} aria-label="Ir al inicio">
            <img src="/images/logo-home-run.png" alt="Home Run Rewards" />
          </Link>

          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>

          <nav className={styles.navLinks}>
            <Link href="/#inicio">Inicio</Link>
            <Link href="/#quienes-somos">¿Quiénes somos?</Link>
            <Link href="/campanas">Campañas</Link>
            <Link href="/login" className={styles.navbarLoginButton}>Login</Link>
          </nav>
        </div>
      </header>
      {mobileMenu}
    </>
  );
}
