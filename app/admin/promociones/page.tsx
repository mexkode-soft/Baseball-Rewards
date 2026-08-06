"use client";

import {
  CalendarDays,
  Eye,
  Gift,
  ImagePlus,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Pencil,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createPromotion as createPromotionRecord,
  updatePromotion as updatePromotionRecord,
  deletePromotion as deletePromotionRecord,
  readPromotions,
  uploadPromotionImage,
  type Promotion,
  type PromotionStatus,
} from "@/lib/promotions";
import styles from "./Promociones.module.css";
import PromotionCard from "@/components/PromotionCard";

function formatDate(value: string) {
  if (!value) {
    return "Sin fecha definida";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

interface PromocionesViewProps {
  modo?: "admin" | "usuario";
}

function PromocionesView({ modo = "admin" }: PromocionesViewProps) {
  const [promotions, setPromotions] =
    useState<Promotion[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandImage, setBrandImage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [expiration, setExpiration] = useState("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [status, setStatus] =
    useState<PromotionStatus>("Borrador");
  const [savedMessage, setSavedMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function cargarPromocionesAdministrativas() {
      try {
        const promociones = await readPromotions(modo === "admin");
        if (mounted) setPromotions(promociones);
      } catch (error) {
        if (mounted) {
          setSavedMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las promociones."
          );
        }
      }
    }

    void cargarPromocionesAdministrativas();
    return () => {
      mounted = false;
    };
  }, [modo]);

  const isAdmin = modo === "admin";

  const activePromotions = useMemo(
    () =>
      promotions.filter(
        (promotion) => promotion.status === "Activa"
      ),
    [promotions]
  );

  async function uploadBrandImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setBrandImage(await uploadPromotionImage(file, "brands")); }
    catch (error) { setSavedMessage(error instanceof Error ? error.message : "No se pudo subir la imagen."); }
    event.target.value = "";
  }

  async function uploadProductImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3 - productImages.length);
    if (!files.length) return;
    try {
      const images = await Promise.all(files.map((file) => uploadPromotionImage(file, "products")));
      setProductImages((current) => [...current, ...images]);
    } catch (error) { setSavedMessage(error instanceof Error ? error.message : "No se pudieron subir las imágenes."); }
    event.target.value = "";
  }

  function removeProductImage(imageIndex: number) {
    setProductImages((currentImages) =>
      currentImages.filter((_, index) => index !== imageIndex)
    );
  }

  function editPromotion(promotion: Promotion) {
    setEditingId(promotion.id);
    setBrandName(promotion.brandName);
    setBrandImage(promotion.brandImage);
    setTitle(promotion.title);
    setDescription(promotion.description);
    setCode(promotion.code);
    setExpiration(promotion.expiration);
    setProductImages(promotion.productImages);
    setStatus(promotion.status);
    setSavedMessage("Editando promoción. Guarda los cambios cuando termines.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setBrandName("");
    setBrandImage("");
    setTitle("");
    setDescription("");
    setCode("");
    setExpiration("");
    setProductImages([]);
    setStatus("Borrador");
    setEditingId(null);
  }

  async function createPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brandName.trim() || !title.trim()) {
      setSavedMessage("Agrega el nombre de la marca y el título de la promoción.");
      return;
    }
    try {
      const payload = {
        brandName: brandName.trim(),
        brandImage: brandImage || "/images/logo-home-run.png",
        title: title.trim(),
        description: description.trim(),
        code: code.trim() || "SIN-CODIGO",
        expiration,
        productImages,
        status,
      };
      const saved = editingId
        ? await updatePromotionRecord(editingId, payload)
        : await createPromotionRecord(payload);
      setPromotions((current) => editingId
        ? current.map((item) => item.id === editingId ? saved : item)
        : [saved, ...current]);
      const wasEditing = Boolean(editingId);
      resetForm();
      setSavedMessage(wasEditing ? "Promoción actualizada correctamente." : "Promoción creada correctamente en Supabase.");
    } catch (error) { setSavedMessage(error instanceof Error ? error.message : "No se pudo guardar la promoción."); }
  }

  async function deletePromotion(promotionId: string) {
    try {
      await deletePromotionRecord(promotionId);
      setPromotions((current) => current.filter((promotion) => promotion.id !== promotionId));
    } catch (error) { setSavedMessage(error instanceof Error ? error.message : "No se pudo eliminar."); }
  }

  const previewPromotion: Promotion = {
    id: "preview",
    brandName: brandName || "Nombre de la marca",
    brandImage:
      brandImage || "/images/logo-home-run.png",
    title: title || "Título de la promoción",
    description:
      description ||
      "Aquí aparecerá la descripción de la promoción, beneficio o premio.",
    code: code || "CODIGO-PROMO",
    expiration,
    productImages,
    status,
  };

  return (
    <>
      <div className={styles.pageTitle}>
        <span>
          {isAdmin
            ? "Gestión de promociones"
            : "Beneficios disponibles"}
        </span>

        <h1>Promociones</h1>

        <p>
          {isAdmin
            ? "Crea promociones, beneficios y premios para mostrarlos dentro de la plataforma."
            : "Consulta las promociones y recompensas activas disponibles para ti."}
        </p>
      </div>

      {isAdmin && (
        <div className={styles.editorLayout}>
          <section className={styles.editorCard}>
            <div className={styles.sectionHeading}>
              <div className={styles.headingIcon}>
                <Plus />
              </div>

              <div>
                <span>Nueva promoción</span>
                <h2>Configuración</h2>
                <p>
                  Completa los datos y revisa la vista previa
                  antes de publicarla.
                </p>
              </div>
            </div>

            <form
              className={styles.promotionForm}
              onSubmit={createPromotion}
            >
              <div className={styles.formGrid}>
                <label>
                  Nombre de la marca
                  <div className={styles.inputWrap}>
                    <Tag />
                    <input
                      value={brandName}
                      onChange={(event) =>
                        setBrandName(event.target.value)
                      }
                      placeholder="Ej. Águilas de Mexicali"
                      required
                    />
                  </div>
                </label>

                <label>
                  Estado
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value as PromotionStatus
                      )
                    }
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Activa">Activa</option>
                  </select>
                </label>

                <label className={styles.fullWidth}>
                  Título de la promoción
                  <div className={styles.inputWrap}>
                    <Sparkles />
                    <input
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      placeholder="Ej. 2x1 en accesos al partido"
                      required
                    />
                  </div>
                </label>

                <label className={styles.fullWidth}>
                  Descripción
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Describe el beneficio, premio o condiciones de la promoción."
                    rows={4}
                  />
                </label>

                <label>
                  Código promocional
                  <div className={styles.inputWrap}>
                    <Gift />
                    <input
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.toUpperCase())
                      }
                      placeholder="HOMERUN2X1"
                    />
                  </div>
                </label>

                <label>
                  Fecha de vigencia
                  <div className={styles.dateWrap}>
                    <CalendarDays />
                    <input
                      type="date"
                      value={expiration}
                      onChange={(event) =>
                        setExpiration(event.target.value)
                      }
                    />
                  </div>
                </label>
              </div>

              <div className={styles.uploadSection}>
                <div className={styles.uploadHeading}>
                  <div>
                    <strong>Imagen de la marca</strong>
                    <span>
                      Aparecerá en la parte superior de la
                      promoción.
                    </span>
                  </div>

                  <label className={styles.uploadButton}>
                    <Upload />
                    Cargar marca
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={uploadBrandImage}
                    />
                  </label>
                </div>

                {brandImage ? (
                  <div className={styles.brandPreview}>
                    <img
                      src={brandImage}
                      alt="Vista previa de la marca"
                    />
                    <button
                      type="button"
                      onClick={() => setBrandImage("")}
                      aria-label="Eliminar imagen de marca"
                    >
                      <Trash2 />
                    </button>
                  </div>
                ) : (
                  <div className={styles.emptyUpload}>
                    <ImagePlus />
                    <span>
                      Aún no has cargado una imagen.
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.uploadSection}>
                <div className={styles.uploadHeading}>
                  <div>
                    <strong>Productos o premios</strong>
                    <span>
                      Puedes agregar hasta tres fotografías.
                    </span>
                  </div>

                  <label className={styles.uploadButton}>
                    <ImagePlus />
                    Agregar fotos
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      onChange={uploadProductImages}
                      disabled={productImages.length >= 3}
                    />
                  </label>
                </div>

                {productImages.length > 0 ? (
                  <div className={styles.productUploads}>
                    {productImages.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className={styles.productUpload}
                      >
                        <img
                          src={image}
                          alt={`Producto ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            removeProductImage(index)
                          }
                          aria-label={`Eliminar producto ${
                            index + 1
                          }`}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyUpload}>
                    <Gift />
                    <span>
                      Agrega imágenes de productos, regalos o
                      premios.
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                {savedMessage && (
                  <span className={styles.savedMessage}>
                    {savedMessage}
                  </span>
                )}

                {editingId ? (
                  <button type="button" className={styles.cancelEditButton} onClick={resetForm}><X />Cancelar edición</button>
                ) : null}
                <button type="submit">
                  <Save />
                  {editingId ? "Guardar cambios" : "Guardar promoción"}
                </button>
              </div>
            </form>
          </section>

          <aside className={styles.previewSection}>
            <div className={styles.previewHeading}>
              <Eye />
              <div>
                <span>Previsualizador</span>
                <strong>Vista del usuario</strong>
              </div>
            </div>

            <PromotionCard
              promotion={previewPromotion}
              preview
            />
          </aside>
        </div>
      )}

      <section
        className={`${styles.promotionsSection} ${
          !isAdmin ? styles.userPromotionsSection : ""
        }`}
      >
        <div className={styles.listHeading}>
          <div>
            <span>
              {isAdmin
                ? "Promociones creadas"
                : "Promociones activas"}
            </span>
            <h2>
              {isAdmin
                ? "Contenido disponible"
                : "Beneficios para ti"}
            </h2>
            <p>
              {isAdmin
                ? "Estas son las promociones que se mostrarán dentro de la plataforma."
                : "Estas promociones se encuentran activas actualmente."}
            </p>
          </div>

          <div className={styles.totalBadge}>
            <Gift />
            <strong>
              {isAdmin
                ? promotions.length
                : activePromotions.length}
            </strong>
            <span>promociones</span>
          </div>
        </div>

        {(isAdmin ? promotions : activePromotions).length > 0 ? (
          <div
            className={`${styles.promotionsGrid} ${
              !isAdmin ? styles.userPromotionsGrid : ""
            }`}
          >
            {(isAdmin ? promotions : activePromotions).map(
              (promotion) => (
                <div
                  key={promotion.id}
                  className={styles.savedCardWrap}
                >
                  <PromotionCard promotion={promotion} />

                  {isAdmin && (
                    <div className={styles.promotionAdminActions}>
                      <button type="button" className={styles.editPromotion} onClick={() => editPromotion(promotion)}><Pencil />Editar</button>
                      <button type="button" className={styles.deletePromotion} onClick={() => { void deletePromotion(promotion.id); }}><Trash2 />Eliminar</button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        ) : (
          <div className={styles.emptyPromotions}>
            <Gift />
            <strong>No hay promociones activas</strong>
            <span>
              Cuando exista una nueva promoción, aparecerá en
              esta sección.
            </span>
          </div>
        )}
      </section>
    </>
  );
}

export default function PromocionesPage() {
  return <PromocionesView modo="admin" />;
}
