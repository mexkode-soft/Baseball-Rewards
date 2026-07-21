"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/#quienes-somos", label: "¿Quiénes somos?" },
  { href: "/#campanas", label: "Campañas" },
  { href: "/#patrocinadores", label: "Patrocinadores" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar-shell">
      <nav className="navbar container" aria-label="Navegación principal">
        <Link href="/" className="brand" aria-label="Home Run Rewards, inicio">
          <Image src="/home-run-rewards-logo.jpg" alt="Home Run Rewards" width={74} height={52} priority />
          <span>HOME RUN <strong>REWARDS</strong></span>
        </Link>

        <button
          className="menu-button"
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${open ? "is-open" : ""}`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="button button-small" onClick={() => setOpen(false)}>
            Iniciar sesión
          </Link>
        </div>
      </nav>
    </header>
  );
}
