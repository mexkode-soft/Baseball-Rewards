"use client";

import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Gift,
  QrCode,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";

import Link from "next/link";
import { createPortal } from "react-dom";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "../../CazarRecompensas.module.css";

import {
  readActiveQrCampaigns,
  readDemoPoints,
  validateQrPayload,
  type QrCampaign,
  type QrScanResult,
} from "@/lib/qrCampaigns";


type ScannerState =
  | "idle"
  | "starting"
  | "scanning"
  | "result"
  | "error";

export default function QrPlayPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const campaignId =
    searchParams.get(
      "campaign"
    ) ?? "";

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<QrCampaign[]>(
      []
    );

  const [
    scannerState,
    setScannerState,
  ] =
    useState<ScannerState>(
      "idle"
    );

  const [
    result,
    setResult,
  ] =
    useState<QrScanResult | null>(
      null
    );

  const [
    points,
    setPoints,
  ] = useState(0);

  const scannerRef =
    useRef<
      import("html5-qrcode").Html5Qrcode | null
    >(null);

  const processingScanRef = useRef(false);

  const readerId =
    "hrr-public-qr-reader";

  useEffect(() => {
    const update = async () => {
      const [activeCampaigns, currentPoints] = await Promise.all([
        readActiveQrCampaigns(),
        readDemoPoints(),
      ]);
      setCampaigns(activeCampaigns);
      setPoints(currentPoints);
    };

    void update();

    window.addEventListener(
      "hrr-qr-campaigns-updated",
      update
    );

    window.addEventListener(
      "hrr-points-updated",
      update
    );

    return () => {
      window.removeEventListener(
        "hrr-qr-campaigns-updated",
        update
      );

      window.removeEventListener(
        "hrr-points-updated",
        update
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      const scanner =
        scannerRef.current;

      if (!scanner) {
        return;
      }

      if (
        scanner.isScanning
      ) {
        void scanner
          .stop()
          .catch(
            () => undefined
          );
      }

      try {
        scanner.clear();
      } catch {
        // El componente ya se desmontó.
      }

      scannerRef.current =
        null;
    };
  }, []);

  const campaign =
    useMemo(
      () =>
        campaigns.find(
          (item) =>
            item.id ===
            campaignId
        ),
      [
        campaigns,
        campaignId,
      ]
    );

  async function stopScanner() {
    const scanner =
      scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      if (
        scanner.isScanning
      ) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn(
        "No fue posible detener la cámara:",
        error
      );
    }

    try {
      scanner.clear();
    } catch (error) {
      console.warn(
        "No fue posible limpiar el escáner:",
        error
      );
    }

    scannerRef.current =
      null;
  }

  async function processPayload(
    payload: string
  ) {
    if (processingScanRef.current) return;
    processingScanRef.current = true;

    // No hacemos await scanner.stop() dentro del callback de lectura. En html5-qrcode
    // eso puede bloquear el mismo ciclo que acaba de detectar el código y dejar la
    // cámara abierta sin llegar a validar el payload. Pausar es síncrono y seguro.
    try {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.pause(true);
      }
    } catch {
      // Si el navegador no permite pausar en este instante continuamos con la validación.
    }

    try {
      const normalizedPayload = payload.trim();
      const scanResult = await validateQrPayload(normalizedPayload, campaignId);
      setResult(scanResult);
      setPoints(await readDemoPoints());
      if (scanResult.ok) {
        window.dispatchEvent(new CustomEvent("hrr-qr-captures-updated"));
        window.dispatchEvent(new CustomEvent("hrr-points-updated"));
      }
      setScannerState("result");
    } catch (error) {
      console.error("Error validando QR:", error);
      setResult({
        ok: false,
        status: "invalid",
        message: error instanceof Error ? error.message : "No fue posible validar este QR.",
      });
      setScannerState("result");
    } finally {
      processingScanRef.current = false;
      // Se detiene después de que el callback de decodificación ya devolvió el control.
      window.setTimeout(() => { void stopScanner(); }, 0);
    }
  }

  async function scanQrImage(file: File) {
    if (!campaign) return;
    setResult(null);
    setScannerState("starting");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      await stopScanner();
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const scanner = new Html5Qrcode(readerId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
      scannerRef.current = scanner;
      const decodedText = await scanner.scanFile(file, true);
      await processPayload(decodedText);
    } catch (error) {
      console.error("No fue posible leer la imagen QR:", error);
      setResult({ ok: false, status: "invalid", message: "No pudimos detectar un QR válido en esa imagen." });
      setScannerState("result");
    }
  }

  async function startScanner() {
    if (!campaign) {
      return;
    }

    setResult(null);

    setScannerState(
      "starting"
    );

    try {
      const {
        Html5Qrcode,
        Html5QrcodeSupportedFormats,
      } = await import("html5-qrcode");

      await stopScanner();
      processingScanRef.current = false;

      const scanner = new Html5Qrcode(readerId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });

      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras().catch(() => []);
      const preferredCamera =
        cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label)) ??
        cameras.at(-1);

      const cameraConfig = preferredCamera?.id
        ? preferredCamera.id
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          disableFlip: false,
          // Una zona de lectura explícita mejora mucho la detección en Chrome/PWA
          // y evita que el QR tenga que ocupar prácticamente toda la cámara.
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
            return { width: Math.max(180, edge), height: Math.max(180, edge) };
          },
        },
        (decodedText) => {
          void processPayload(decodedText);
        },
        () => undefined
      );

      setScannerState(
        "scanning"
      );
    } catch (error) {
      console.error(
        "No fue posible iniciar la cámara:",
        error
      );

      await stopScanner();

      setScannerState(
        "error"
      );
    }
  }

  async function closeScanner() {
    await stopScanner();

    setResult(null);

    setScannerState(
      "idle"
    );
  }

  const isWinner =
    result?.status ===
    "winner";

  const isAccepted =
    result?.status ===
      "winner" ||
    result?.status ===
      "not_winner";

  if (
    campaigns.length > 0 &&
    !campaign
  ) {
    return (
      <main
        className={
          styles.mobileStage
        }
      >
        <section
          className={
            styles.emptyCard
          }
        >
          <XCircle />

          <h2>
            Campaña no disponible
          </h2>

          <p>
            Puede haber finalizado
            o ya no estar activa.
          </p>

          <Link href="/usuario/cazar-recompensas/qr">
            Elegir otra campaña
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className={`${styles.mobileStage} ${styles.gameStage}`}
    >
      <div
        className={
          styles.topBar
        }
      >
        <Link
          href="/usuario/cazar-recompensas/qr"
          className={
            styles.backButton
          }
          aria-label="Regresar"
        >
          <ArrowLeft />
        </Link>

        <div
          className={
            styles.compactPoints
          }
        >
          <Trophy />

          {points}
        </div>
      </div>

      <section
        className={
          styles.gameHero
        }
      >
        <div
          className={
            styles.gameOrb
          }
        >
          <QrCode />
        </div>

        <span>
          {
            campaign?.sponsor ??
            "Home Run Rewards"
          }
        </span>

        <h1>
          {
            campaign?.name ??
            "Preparando campaña"
          }
        </h1>

        <p>
          Encuentra los QR
          escondidos, escanéalos y
          descubre si la suerte
          está de tu lado.
        </p>
      </section>

      <section
        className={
          styles.gameActions
        }
      >
        <button
          type="button"
          className={styles.cameraButton}
          onClick={startScanner}
          disabled={!campaign}
        >
          <Camera />
          Abrir cámara
        </button>

        <label className={styles.cameraButton} style={{ cursor: campaign ? "pointer" : "not-allowed" }}>
          <QrCode />
          Leer QR desde imagen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={!campaign}
            style={{ display: "none" }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void scanQrImage(file);
            }}
          />
        </label>
      </section>

      {scannerState !== "idle" &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={
              styles.scannerModal
            }
          >
          <div
            className={
              styles.scannerShell
            }
          >
            <button
              type="button"
              className={
                styles.scannerClose
              }
              onClick={
                closeScanner
              }
              aria-label="Cerrar cámara"
            >
              ×
            </button>

            {(
              scannerState ===
                "starting" ||
              scannerState ===
                "scanning"
            ) && (
              <>
                <div
                  className={
                    styles.scannerTitle
                  }
                >
                  <QrCode />

                  <div>
                    <span>
                      {scannerState ===
                      "starting"
                        ? "Preparando cámara"
                        : "Buscando código"}
                    </span>

                    <h2>
                      Coloca el QR
                      dentro del
                      recuadro
                    </h2>
                  </div>
                </div>

                <div
                  id={
                    readerId
                  }
                  className={
                    styles.reader
                  }
                />
              </>
            )}

            {scannerState ===
              "error" && (
              <section
                className={
                  styles.resultScreen
                }
              >
                <XCircle />

                <span>
                  Cámara no
                  disponible
                </span>

                <h2>
                  Revisa los
                  permisos del
                  navegador
                </h2>

                <p>
                  Autoriza la
                  cámara y vuelve a
                  intentarlo.
                </p>

                <button
                  type="button"
                  onClick={
                    closeScanner
                  }
                >
                  Cerrar
                </button>
              </section>
            )}

            {scannerState ===
              "result" &&
              result && (
                <section
                  className={`${styles.resultScreen} ${
                    isWinner
                      ? styles.resultWinner
                      : isAccepted
                        ? styles.resultTryAgain
                        : styles.resultInvalid
                  }`}
                >
                  <div
                    className={
                      styles.resultIcon
                    }
                  >
                    {isWinner ? (
                      <Gift />
                    ) : isAccepted ? (
                      <CheckCircle2 />
                    ) : (
                      <XCircle />
                    )}
                  </div>

                  <span>
                    {isWinner
                      ? "¡Felicidades!"
                      : result.status ===
                          "not_winner"
                        ? "¡Mejor suerte a la siguiente!"
                        : "Código no aceptado"}
                  </span>

                  <h2>{result.message}</h2>

                  {isWinner && campaign && (
                    <p>Tu premio estará disponible durante {campaign.rewardValidityDays ?? 15} días.</p>
                  )}

                  {result.status === "not_winner" && (
                    <p>¡Sigue buscando! Cada QR válido puede acercarte al siguiente premio.</p>
                  )}

                  {result.code
                    ?.reward && (
                    <div
                      className={
                        styles.rewardPrize
                      }
                    >
                      <small>
                        Tu recompensa
                      </small>

                      <strong>
                        {
                          result
                            .code
                            .reward
                        }
                      </strong>
                    </div>
                  )}

                  {result.pointsAwarded !==
                    undefined && (
                    <div
                      className={
                        styles.pointsEarned
                      }
                    >
                      +
                      {
                        result.pointsAwarded
                      }{" "}
                      puntos
                    </div>
                  )}

                  {isAccepted ? (
                    <button
                      type="button"
                      className={styles.resultPrimary}
                      onClick={() =>
                        router.push(
                          isWinner ? "/usuario/recompensas" : "/usuario/cazar-recompensas/capturas"
                        )
                      }
                    >
                      {isWinner ? "Ver mi recompensa" : "Ver mis capturas"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={
                        styles.resultPrimary
                      }
                      onClick={
                        startScanner
                      }
                    >
                      <RotateCcw />

                      Intentar de nuevo
                    </button>
                  )}

                  <button
                    type="button"
                    className={
                      styles.resultSecondary
                    }
                    onClick={
                      closeScanner
                    }
                  >
                    Volver al juego
                  </button>
                </section>
              )}
          </div>
        </div>,
          document.body
        )}
    </main>
  );
}
