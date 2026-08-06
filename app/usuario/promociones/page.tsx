"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, Gift } from "lucide-react";
import PromotionCard from "@/components/PromotionCard";
import styles from "@/app/admin/promociones/Promociones.module.css";
import { readPromotions, type Promotion } from "@/lib/promotions";

export default function PromocionesUsuarioPage() {
  const [promociones, setPromociones] = useState<Promotion[]>([]);
  const [mensaje, setMensaje] = useState("");
  const carruselRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef({ activo: false, inicioX: 0, scrollInicial: 0 });

  function moverCarrusel(direccion: "anterior" | "siguiente") {
    const carrusel = carruselRef.current;
    if (!carrusel) return;

    const primeraTarjeta = carrusel.querySelector<HTMLElement>(
      `.${styles.savedCardWrap}`,
    );
    const estilosCarrusel = window.getComputedStyle(carrusel);
    const separacion = Number.parseFloat(estilosCarrusel.columnGap || estilosCarrusel.gap || "0");
    const desplazamiento = primeraTarjeta
      ? primeraTarjeta.getBoundingClientRect().width + separacion
      : Math.max(carrusel.clientWidth * 0.72, 360);

    carrusel.scrollBy({
      left: direccion === "siguiente" ? desplazamiento : -desplazamiento,
      behavior: "smooth",
    });
  }


  function iniciarArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    const carrusel = carruselRef.current;
    if (!carrusel) return;
    arrastreRef.current = { activo: true, inicioX: event.clientX, scrollInicial: carrusel.scrollLeft };
    carrusel.setPointerCapture(event.pointerId);
    carrusel.classList.add(styles.carouselDragging);
  }

  function moverArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    const carrusel = carruselRef.current;
    if (!carrusel || !arrastreRef.current.activo) return;
    carrusel.scrollLeft = arrastreRef.current.scrollInicial - (event.clientX - arrastreRef.current.inicioX);
  }

  function terminarArrastre(event: ReactPointerEvent<HTMLDivElement>) {
    const carrusel = carruselRef.current;
    if (!carrusel) return;
    arrastreRef.current.activo = false;
    if (carrusel.hasPointerCapture(event.pointerId)) carrusel.releasePointerCapture(event.pointerId);
    carrusel.classList.remove(styles.carouselDragging);
  }

  useEffect(() => {
    let activo = true;
    void readPromotions(false)
      .then((items) => { if (activo) setPromociones(items.filter((item) => item.status === "Activa")); })
      .catch((error) => { if (activo) setMensaje(error instanceof Error ? error.message : "No se pudieron cargar las promociones."); });
    return () => { activo = false; };
  }, []);

  return (
    <>
      <header className={styles.userPromotionHeader}>
        <span>Beneficios exclusivos</span>
        <h1>Promociones</h1>
        <p>Consulta las promociones vigentes, abre las fotografías de cada premio y presenta tu código al momento de canjear.</p>
      </header>
      {promociones.length === 0 ? (
        <section className={styles.emptyPromotions}><Gift /><strong>No hay promociones activas</strong><span>{mensaje || "Cuando exista una promoción aparecerá aquí."}</span></section>
      ) : (
        <section className={`${styles.promotionsSection} ${styles.userPromotionsSection}`}>
          <div className={styles.carouselControls} aria-label="Controles del carrusel de promociones">
              <button
                type="button"
                className={styles.carouselArrow}
                onClick={() => moverCarrusel("anterior")}
                aria-label="Ver promoción anterior"
                title="Promoción anterior"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.carouselArrow}
                onClick={() => moverCarrusel("siguiente")}
                aria-label="Ver promoción siguiente"
                title="Promoción siguiente"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>

          <div
            ref={carruselRef}
            className={`${styles.promotionsGrid} ${styles.userPromotionsGrid}`}
            onPointerDown={iniciarArrastre}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            onPointerCancel={terminarArrastre}
            onPointerLeave={(event) => arrastreRef.current.activo && terminarArrastre(event)}
          >
            {promociones.map((promocion) => (
              <div key={promocion.id} className={styles.savedCardWrap}>
                <PromotionCard promotion={promocion} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
