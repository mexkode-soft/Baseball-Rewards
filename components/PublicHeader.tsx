"use client";

import Link from "next/link";
import {
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

import styles from "./PublicHeader.module.css";

export default function PublicHeader() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
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
          onClick={() => setOpen(!open)}
          aria-label={
            open
              ? "Cerrar menú"
              : "Abrir menú"
          }
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>

        <nav
          className={`${styles.navLinks} ${
            open ? styles.open : ""
          }`}
        >
          <Link
            href="/#inicio"
            onClick={closeMenu}
          >
            Inicio
          </Link>

          <Link
            href="/#quienes-somos"
            onClick={closeMenu}
          >
            ¿Quiénes somos?
          </Link>

          <Link
            href="/campanas"
            onClick={closeMenu}
          >
            Campañas
          </Link>

          <Link
            href="/login"
            className={styles.navbarLoginButton}
            onClick={closeMenu}
          >
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}