"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Gift, Tag, X } from "lucide-react";
import type { Promotion } from "@/lib/promotions";
import styles from "@/app/admin/promociones/Promociones.module.css";

interface PromotionCardProps {
  promotion: Promotion;
  preview?: boolean;
}

function formatDate(value: string) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

export default function PromotionCard({ promotion, preview = false }: PromotionCardProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const images = promotion.productImages;

  useEffect(() => {
    if (selectedImage === null) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedImage(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selectedImage]);

  function move(direction: number) {
    if (selectedImage === null || images.length < 2) return;
    setSelectedImage((selectedImage + direction + images.length) % images.length);
  }

  return (
    <>
      <article className={`${styles.promotionCard} ${preview ? styles.previewCard : ""}`}>
        <div className={styles.promotionStatus}><span className={promotion.status === "Activa" ? styles.activeStatus : styles.draftStatus}>{promotion.status}</span></div>
        <div className={styles.brandArea}>
          <img src={promotion.brandImage} alt={`Marca ${promotion.brandName}`} />
          <strong>{promotion.brandName}</strong>
        </div>
        <div className={styles.promotionContent}>
          <span>Promoción especial</span>
          <h3>{promotion.title}</h3>
          <p>{promotion.description}</p>
          <div className={styles.promotionCode}><Tag /><div><span>Código</span><strong>{promotion.code}</strong></div></div>
          <div className={styles.expiration}><CalendarDays />Vigente hasta {formatDate(promotion.expiration)}</div>
        </div>
        <div className={styles.productsArea}>
          <span>Productos y premios</span>
          {images.length > 0 ? (
            <div className={styles.productGallery}>
              {images.map((image, index) => (
                <button type="button" key={`${image}-${index}`} className={styles.productImageButton} onClick={() => setSelectedImage(index)} aria-label={`Abrir fotografía del premio ${index + 1}`}>
                  <img src={image} alt={`Producto promocional ${index + 1}`} />
                  <span>Ver foto</span>
                </button>
              ))}
            </div>
          ) : <div className={styles.emptyProducts}><Gift /><span>Sin fotografías de productos.</span></div>}
        </div>
      </article>

      {selectedImage !== null && images[selectedImage] ? (
        <div className={styles.lightboxBackdrop} role="dialog" aria-modal="true" aria-label="Fotografía del premio" onClick={() => setSelectedImage(null)}>
          <div className={styles.lightboxContent} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.lightboxClose} onClick={() => setSelectedImage(null)} aria-label="Cerrar"><X /></button>
            {images.length > 1 && <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => move(-1)} aria-label="Anterior"><ChevronLeft /></button>}
            <img src={images[selectedImage]} alt={`Premio ${selectedImage + 1}`} />
            {images.length > 1 && <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => move(1)} aria-label="Siguiente"><ChevronRight /></button>}
            <span>{selectedImage + 1} de {images.length}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
