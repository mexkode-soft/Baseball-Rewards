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
    await stopScanner();

    try {
      const scanResult = await validateQrPayload(payload, campaignId);
      setResult(scanResult);
      setPoints(await readDemoPoints());
      setScannerState("result");
    } catch (error) {
      console.error("Error validando QR:", error);
      setResult({
        ok: false,
        status: "invalid",
        message: error instanceof Error ? error.message : "No fue posible validar este QR.",
      });
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
      } = await import(
        "html5-qrcode"
      );

      await stopScanner();

      const scanner =
        new Html5Qrcode(
          readerId,
          {
            verbose: false,
          }
        );

      scannerRef.current =
        scanner;

      await scanner.start(
        {
          facingMode:
            "environment",
        },
        {
          fps: 12,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1,
        },
        (decodedText) => {
          void processPayload(
            decodedText
          );
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
          className={
            styles.cameraButton
          }
          onClick={
            startScanner
          }
          disabled={
            !campaign
          }
        >
          <Camera />

          Abrir cámara
        </button>


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
                      ? "¡Home run!"
                      : result.status ===
                          "not_winner"
                        ? "Sigue participando"
                        : "Código no aceptado"}
                  </span>

                  <h2>
                    {
                      result.message
                    }
                  </h2>

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
                      className={
                        styles.resultPrimary
                      }
                      onClick={() =>
                        router.push(
                          "/usuario/cazar-recompensas/capturas"
                        )
                      }
                    >
                      Ver mis capturas
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
