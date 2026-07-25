import {
  Award,
  BadgeCheck,
  CircleDot,
  Gift,
  MapPinned,
  Medal,
  Radio,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
} from "lucide-react";

import CampaignBaseballScene from "@/components/CampaignBaseballScene";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";

import styles from "./Campanas.module.css";

const campaigns = [
  {
    number: "Campaña 01",
    title: "Caza el jonrón",
    description:
      "Encuentra recompensas ocultas, supera el reto y captura el premio antes que los demás participantes.",
    icon: Target,
    secondaryIcon: MapPinned,
    benefits: [
      "Mapa interactivo",
      "Premios geolocalizados",
      "Experiencia de captura",
    ],
    buttonText: "Próximamente",
    featured: false,
  },
  {
    number: "Campaña 02",
    title: "Reto de la afición",
    description:
      "Participa en dinámicas especiales, responde preguntas y demuestra cuánto sabes de béisbol.",
    icon: Trophy,
    secondaryIcon: Medal,
    benefits: [
      "Preguntas y niveles",
      "Puntos para el ranking",
      "Recompensas exclusivas",
    ],
    buttonText: "Conocer campaña",
    featured: true,
  },
  {
    number: "Campaña 03",
    title: "Premio sorpresa",
    description:
      "Desbloquea promociones, beneficios y premios sorpresa proporcionados por nuestras marcas aliadas.",
    icon: Gift,
    secondaryIcon: Ticket,
    benefits: [
      "Promociones especiales",
      "Premios de patrocinadores",
      "Beneficios limitados",
    ],
    buttonText: "Próximamente",
    featured: false,
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
            Campañas
          </span>

          <h1>
            Vive el béisbol
            <span>
              de una manera diferente.
            </span>
          </h1>

          <p className={styles.introduction}>
            Explora nuestras campañas,
            completa retos, encuentra premios y
            conviértete en uno de los mejores
            jugadores de Home Run Rewards.
          </p>

          <CampaignBaseballScene />
        </section>

        <section className={styles.campaignSection}>
          <div className={styles.sectionHeading}>
            <span>
              <Sparkles />
              Experiencias disponibles
            </span>

            <h2>
              Elige tu próxima campaña
            </h2>

            <p>
              Cada experiencia ofrece retos,
              recompensas y formas diferentes de
              participar.
            </p>
          </div>

          <div className={styles.campaignGrid}>
            {campaigns.map((campaign) => {
              const MainIcon =
                campaign.icon;

              const SecondaryIcon =
                campaign.secondaryIcon;

              return (
                <article
                  key={campaign.title}
                  className={`${styles.campaignCard} ${
                    campaign.featured
                      ? styles.featured
                      : ""
                  }`}
                >
                  {campaign.featured && (
                    <span
                      className={
                        styles.featuredBadge
                      }
                    >
                      <Star />
                      Campaña destacada
                    </span>
                  )}

                  <div className={styles.cardTop}>
                    <div
                      className={
                        styles.mainIcon
                      }
                    >
                      <MainIcon />
                    </div>

                    <div
                      className={
                        styles.secondaryIcon
                      }
                    >
                      <SecondaryIcon />
                    </div>
                  </div>

                  <span
                    className={
                      styles.campaignNumber
                    }
                  >
                    {campaign.number}
                  </span>

                  <h3>{campaign.title}</h3>

                  <p
                    className={
                      styles.cardDescription
                    }
                  >
                    {campaign.description}
                  </p>

                  <div className={styles.divider} />

                  <ul>
                    {campaign.benefits.map(
                      (benefit) => (
                        <li key={benefit}>
                          <BadgeCheck />
                          {benefit}
                        </li>
                      )
                    )}
                  </ul>

                  <button
                    type="button"
                    className={
                      campaign.featured
                        ? styles.primaryButton
                        : styles.secondaryButton
                    }
                  >
                    {campaign.featured ? (
                      <Radio />
                    ) : (
                      <Award />
                    )}

                    {campaign.buttonText}
                  </button>
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