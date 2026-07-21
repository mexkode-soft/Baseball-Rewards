import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Gift, MapPin, Megaphone, Trophy, Users } from "lucide-react";
import Navbar from "@/components/Navbar";

const campaigns = [
  { icon: Trophy, title: "Reto del séptimo inning", text: "Participa durante el juego y suma puntos para desbloquear premios." },
  { icon: MapPin, title: "Explora el estadio", text: "Encuentra activaciones especiales y experiencias de marca." },
  { icon: Gift, title: "Recompensas para fans", text: "Convierte tu participación en artículos, accesos y beneficios." },
];

export default function Home() {
  return (
    <main>
      <Navbar />

      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">LA EXPERIENCIA DEL BÉISBOL EVOLUCIONA</span>
            <h1>Juega, participa y convierte cada entrada en una <em>recompensa.</em></h1>
            <p>Home Run Rewards conecta a fans, equipos y patrocinadores mediante campañas interactivas dentro y fuera del estadio.</p>
            <div className="hero-actions">
              <Link href="/#campanas" className="button">Explorar campañas <ArrowRight size={19} /></Link>
              <Link href="/login" className="button button-secondary">Crear mi cuenta</Link>
            </div>
            <div className="hero-proof">
              <span><BadgeCheck size={19} /> Experiencias verificadas</span>
              <span><Users size={19} /> Comunidad de aficionados</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="logo-stage">
              <Image src="/home-run-rewards-logo.jpg" alt="Logotipo de Home Run Rewards" width={700} height={470} priority />
            </div>
            <div className="floating-card floating-card-left"><strong>+250</strong><span>Puntos disponibles</span></div>
            <div className="floating-card floating-card-right"><Megaphone size={23} /><span>Nueva campaña</span></div>
          </div>
        </div>
      </section>

      <section id="quienes-somos" className="section section-light">
        <div className="container split-section">
          <div>
            <span className="eyebrow eyebrow-dark">¿QUIÉNES SOMOS?</span>
            <h2>Un puente entre la pasión del fan y las marcas que impulsan el juego.</h2>
          </div>
          <div className="section-copy">
            <p>Somos una plataforma de experiencias y recompensas diseñada para acercar a los aficionados al béisbol con sus equipos favoritos y con campañas de patrocinadores.</p>
            <p>Nuestro objetivo es transformar la asistencia, participación y lealtad de cada fan en beneficios reales.</p>
          </div>
        </div>
      </section>

      <section id="campanas" className="section campaigns-section">
        <div className="container">
          <div className="section-heading centered">
            <span className="eyebrow">CAMPAÑAS</span>
            <h2>Más que mirar el partido:<br />forma parte de él.</h2>
            <p>Ejemplos visuales para comenzar a diseñar las futuras dinámicas de la plataforma.</p>
          </div>
          <div className="card-grid">
            {campaigns.map(({ icon: Icon, title, text }, index) => (
              <article className="campaign-card" key={title}>
                <span className="campaign-number">0{index + 1}</span>
                <div className="icon-box"><Icon size={27} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
                <button type="button" className="card-link">Próximamente <ArrowRight size={16} /></button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="patrocinadores" className="section sponsors-section">
        <div className="container sponsors-grid">
          <div>
            <span className="eyebrow eyebrow-dark">PATROCINADORES</span>
            <h2>Marcas presentes en los momentos que los fans recuerdan.</h2>
            <p>Este espacio está listo para incorporar logotipos, campañas destacadas y beneficios patrocinados.</p>
          </div>
          <div className="sponsor-placeholder-grid" aria-label="Espacios reservados para patrocinadores">
            {["Patrocinador 01", "Patrocinador 02", "Patrocinador 03", "Patrocinador 04"].map((name) => (
              <div key={name} className="sponsor-placeholder">{name}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-box">
          <div><span className="eyebrow">TU PRÓXIMA JUGADA</span><h2>Prepárate para vivir el béisbol de una forma diferente.</h2></div>
          <Link href="/login" className="button button-light">Ingresar a la plataforma <ArrowRight size={19} /></Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2026 Home Run Rewards</span>
          <span>Prototipo visual · Sin conexión a base de datos</span>
        </div>
      </footer>
    </main>
  );
}
