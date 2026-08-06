import imageCompression from "browser-image-compression";

type ImageKind = "portada" | "cuerpo";

export async function compressPublicationImage(
  file: File,
  kind: ImageKind
): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: kind === "portada" ? 0.4 : 0.28,
    maxWidthOrHeight: kind === "portada" ? 1600 : 1400,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: kind === "portada" ? 0.78 : 0.72,
  });

  const originalName = file.name.replace(/\.[^/.]+$/, "");

  return new File(
    [compressed],
    `${originalName}.webp`,
    {
      type: "image/webp",
      lastModified: Date.now(),
    }
  );
}
export async function prepareProfileAvatar(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.max(0, (bitmap.width - side) / 2);
  const sourceY = Math.max(0, (bitmap.height - side) / 2);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    bitmap.close();
    throw new Error("No fue posible procesar la fotografía.");
  }

  context.fillStyle = "#111111";
  context.fillRect(0, 0, size, size);
  context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, size, size);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("No fue posible comprimir la fotografía.")),
      "image/webp",
      0.7
    );
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "") || "avatar";
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

export async function compressPromotionImage(
  file: File,
  kind: "marca" | "producto"
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: kind === "marca" ? 0.16 : 0.12,
    maxWidthOrHeight: kind === "marca" ? 1200 : 900,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: kind === "marca" ? 0.66 : 0.6,
    preserveExif: false,
  });

  const originalName = file.name.replace(/\.[^/.]+$/, "") || kind;
  return new File([compressed], `${originalName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
