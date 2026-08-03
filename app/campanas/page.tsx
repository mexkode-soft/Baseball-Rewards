import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  CircleDot,
  Gift,
  MapPinned,
  QrCode,
  ReceiptText,
  Sparkles,
  Store,
  Trophy,
} from "lucide-react";

import CampaignBaseballScene from "@/components/CampaignBaseballScene";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

import styles from "./Campanas.module.css";

const campaigns = [
  {
    number: "Dinámica 01",
    title: "Búsqueda QR",
    description:
      "Encuentra códigos ocultos, escanéalos desde tu celular y descubre al instante si ganaste una recompensa.",
    icon: QrCode,
    secondaryIcon: Camera,
    benefits: [
      "Escaneo directo desde la cámara",
      "Premios y puntos al instante",
      "Sin encuesta durante la búsqueda",
    ],
    accent: "qr",
  },
  {
    number: "Dinámica 02",
    title: "Recompensa en mapa",
    description:
      "Elige un premio cercano, sigue la ruta hasta la ubicación y completa la trivia para desbloquearlo.",
    icon: MapPinned,
    secondaryIcon: Trophy,
    benefits: [
      "Ubicaciones y premios disponibles",
      "Progreso de distancia en tiempo real",
      "Trivia y experiencia de recompensa",
    ],
    accent: "map",
  },
  {
    number: "Dinámica 03",
    title: "Visita a marca",
    description:
      "Compra con una marca participante, carga tu ticket y valida la visita para obtener puntos o beneficios.",
    icon: Store,
    secondaryIcon: ReceiptText,
    benefits: [
      "Carga y lectura de ticket",
      "Validación de ubicación",
      "Premios de marcas aliadas",
    ],
    accent: "brand",
  },
];

export default function Campanas() {
  return (
    <>
      <PublicHeader />

      <main className={styles.page}>
        <section className={styles.heroSection}>
          <span className={styles.eyebrow}>
            <CircleDot />
            Dinámicas oficiales
          </span>

          <h1>
            Tres formas de jugar,
            <span>una sola experiencia.</span>
          </h1>

          <p className={styles.introduction}>
            Participa en campañas QR, busca premios en el mapa o visita a nuestras marcas aliadas. Cada dinámica suma puntos y recompensas a tu perfil.
          </p>

          <CampaignBaseballScene />
        </section>

        <section className={styles.campaignSection}>
          <div className={styles.sectionHeading}>
            <span>
              <Sparkles />
              Cómo puedes participar
            </span>

            <h2>Elige tu dinámica</h2>

            <p>
              Las campañas activas se publican dentro de tu cuenta y conservan el mismo flujo en celular, tablet y computadora.
            </p>
          </div>

          <div className={styles.campaignGrid}>
            {campaigns.map((campaign) => {
              const MainIcon = campaign.icon;
              const SecondaryIcon = campaign.secondaryIcon;

              return (
                <article
                  key={campaign.title}
                  className={`${styles.campaignCard} ${styles[campaign.accent]}`}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.mainIcon}>
                      <MainIcon />
                    </div>

                    <div className={styles.secondaryIcon}>
                      <SecondaryIcon />
                    </div>
                  </div>

                  <span className={styles.campaignNumber}>
                    {campaign.number}
                  </span>

                  <h3>{campaign.title}</h3>

                  <p className={styles.cardDescription}>
                    {campaign.description}
                  </p>

                  <div className={styles.divider} />

                  <ul>
                    {campaign.benefits.map((benefit) => (
                      <li key={benefit}>
                        <BadgeCheck />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <Link href="/login" className={styles.primaryButton}>
                    <Gift />
                    Entrar para participar
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
