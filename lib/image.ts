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