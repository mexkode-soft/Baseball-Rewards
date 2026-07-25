import {
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";

import styles from "./PublicFooter.module.css";

export default function PublicFooter() {
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    "5210000000000";

  const facebookUrl =
    process.env.NEXT_PUBLIC_FACEBOOK_URL ??
    "https://facebook.com";

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
    "https://instagram.com";

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <img
          className={styles.footerLogo}
          src="/images/logo-home-run.png"
          alt="Home Run Rewards"
        />

        <p className={styles.footerCopy}>
          © 2026 Home Run Rewards.
          Todos los derechos reservados.
        </p>

        <div className={styles.socials}>
          <a
            className={`${styles.socialLink} ${styles.whatsapp}`}
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
          >
            <MessageCircle />
          </a>

          <a
            className={`${styles.socialLink} ${styles.facebook}`}
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
          >
            <Facebook />
          </a>

          <a
            className={`${styles.socialLink} ${styles.instagram}`}
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            <Instagram />
          </a>
        </div>
      </div>
    </footer>
  );
}