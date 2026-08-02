"use client";

import { Gift } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "./ARBaseballReward.module.css";

interface Props {
  reward: string;
  code: string;
  onComplete: () => void;
}

export default function ARBaseballReward({ reward, code, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const progressRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [won, setWon] = useState(false);
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

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

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
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });

      renderer.renderLists.dispose();
      renderer.dispose();
    };
  }, []);

  function move(pointerY: number) {
    if (startY.current === null) return;

    const delta = Math.max(0, startY.current - pointerY);
    const nextProgress = Math.min(1, delta / 240);

    progressRef.current = nextProgress;
    setProgress(nextProgress);

    if (nextProgress >= 1 && !won) {
      setWon(true);
      window.setTimeout(onComplete, 2200);
    }
  }

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onPointerDown={(event) => {
        startY.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => move(event.clientY)}
      onPointerUp={() => {
        startY.current = null;
      }}
    >
      <div className={styles.aura} />
      <div className={styles.shadow} />

      <canvas ref={canvasRef} />

      {(!modelReady || modelFailed) && (
        <div
          className={styles.giftFallback}
          style={{ transform: `translate(-50%, -50%) scale(${1 + progress * 4.2})` }}
        >
          <Gift />
        </div>
      )}

      {!won ? (
        <div className={styles.prompt}>
          <strong>Hazla crecer</strong>
          <span>Desliza hacia arriba hasta llenar la pantalla</span>
          <div>
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      ) : (
        <>
          <div className={styles.confetti}>
            {Array.from({ length: 42 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: `${(index * 37) % 100}%`,
                  animationDelay: `${(index % 8) * 0.08}s`,
                }}
              />
            ))}
          </div>

          <div className={styles.prize}>
            <Gift className={styles.prizeGift} />
            <span>¡Premio desbloqueado!</span>
            <h2>{reward}</h2>
            <small>Código</small>
            <strong>{code}</strong>
          </div>
        </>
      )}
    </div>
  );
}
