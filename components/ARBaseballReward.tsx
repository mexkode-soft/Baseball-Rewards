"use client";

import { Gift, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "./ARBaseballReward.module.css";

interface Props {
  reward: string;
  code: string;
  onComplete: () => void | Promise<void>;
}

interface Point { x: number; y: number; }

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function ARBaseballReward({ reward, code, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartProgressRef = useRef(0);
  const progressRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [won, setWon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let disposed = false;
    let frame = 0;
    let baseScale = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 5.6;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffdd88, 4);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xf2bd45, 2.4);
    rimLight.position.set(-3, 1, -2);
    scene.add(rimLight);

    let model: THREE.Object3D | null = null;
    new GLTFLoader().load(
      "/models/baseball.glb",
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y = 0.82;
        baseScale = 1.05 / Math.max(size.x, size.y, size.z, 0.001);
        model.scale.setScalar(baseScale);
        scene.add(model);
        setModelReady(true);
      },
      undefined,
      (error) => {
        console.warn("No fue posible cargar la pelota 3D:", error);
        if (!disposed) setModelFailed(true);
      }
    );

    const resize = () => {
      const width = Math.max(wrap.clientWidth, 1);
      const height = Math.max(wrap.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();

    const animate = () => {
      if (disposed) return;
      frame = window.requestAnimationFrame(animate);
      if (model) {
        model.rotation.y += 0.009;
        model.rotation.x += 0.003;
        model.scale.setScalar(baseScale * (1 + progressRef.current * 5.4));
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.renderLists.dispose();
      renderer.dispose();
    };
  }, []);

  function setInteractionProgress(value: number) {
    if (won) return;
    const next = Math.max(0, Math.min(1, value));
    progressRef.current = next;
    setProgress(next);
    if (next >= 1) setWon(true);
  }

  function beginPinch() {
    const points = Array.from(pointersRef.current.values());
    if (points.length !== 2) {
      pinchStartDistanceRef.current = null;
      return;
    }
    pinchStartDistanceRef.current = distance(points[0], points[1]);
    pinchStartProgressRef.current = progressRef.current;
  }

  function updatePinch() {
    if (won || !modelReady) return;
    const points = Array.from(pointersRef.current.values());
    const startDistance = pinchStartDistanceRef.current;
    if (points.length !== 2 || !startDistance || startDistance <= 0) return;
    const currentDistance = distance(points[0], points[1]);
    const expansion = currentDistance - startDistance;
    setInteractionProgress(pinchStartProgressRef.current + expansion / Math.max(220, startDistance * 1.45));
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (won || !modelReady) return;
    event.preventDefault();
    // Rueda hacia arriba = acercar/aumentar; hacia abajo = reducir.
    setInteractionProgress(progressRef.current + (-event.deltaY * 0.0014));
  }

  function removePointer(pointerId: number) {
    pointersRef.current.delete(pointerId);
    beginPinch();
  }

  async function goToRewards() {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete();
      window.location.assign("/usuario/recompensas");
    } catch (error) {
      console.error("No fue posible guardar la recompensa:", error);
      setSaving(false);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onWheel={handleWheel}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" || !modelReady) return;
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        event.currentTarget.setPointerCapture(event.pointerId);
        beginPinch();
      }}
      onPointerMove={(event) => {
        if (!pointersRef.current.has(event.pointerId)) return;
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        updatePinch();
      }}
      onPointerUp={(event) => removePointer(event.pointerId)}
      onPointerCancel={(event) => removePointer(event.pointerId)}
      onLostPointerCapture={(event) => removePointer(event.pointerId)}
    >
      <div className={styles.aura} />
      <div className={styles.shadow} />
      <canvas ref={canvasRef} />

      {!modelReady && !modelFailed ? (
        <div className={styles.modelLoader} aria-live="polite">
          <LoaderCircle />
          <strong>Cargando pelota…</strong>
        </div>
      ) : null}

      {modelFailed ? (
        <div className={styles.giftFallback} style={{ transform: `translate(-50%, -50%) scale(${1 + progress * 4.2})` }}>
          <Gift />
        </div>
      ) : null}

      {!won ? (
        <div className={styles.prompt}>
          <strong>Hazla crecer</strong>
          <span>En computadora usa la rueda del mouse. En celular pellizca con dos dedos para ampliar o reducir.</span>
          <div><i style={{ width: `${progress * 100}%` }} /></div>
        </div>
      ) : (
        <>
          <div className={styles.confetti}>
            {Array.from({ length: 42 }, (_, index) => (
              <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 8) * 0.08}s` }} />
            ))}
          </div>
          <div className={styles.prize}>
            <Gift className={styles.prizeGift} />
            <span>¡Premio desbloqueado!</span>
            <h2>{reward}</h2>
            <small>Código</small>
            <strong>{code}</strong>
            <button type="button" className={styles.rewardsButton} onClick={() => void goToRewards()} disabled={saving}>
              {saving ? "Guardando recompensa..." : "Ir a mis recompensas"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
