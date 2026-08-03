"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import styles from "./CampaignBaseballScene.module.css";

export default function CampaignBaseballScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(0, 0, 4.8);

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;

      scene.add(new THREE.AmbientLight(0xffffff, 2.2));
      const main = new THREE.DirectionalLight(0xffffff, 3); main.position.set(3, 4, 5); scene.add(main);
      const warm = new THREE.DirectionalLight(0xf2bd45, 2.2); warm.position.set(-4, 1, 2); scene.add(warm);
      const rim = new THREE.DirectionalLight(0xe64b3c, 1.8); rim.position.set(2, -3, -4); scene.add(rim);

      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 1.24;
      controls.maxDistance = 8.5;
      controls.zoomSpeed = 0.85;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.1;

      const resize = () => {
        if (disposed || !renderer) return;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      new GLTFLoader().load(
        "/models/baseball.glb",
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          const largest = Math.max(size.x, size.y, size.z);
          if (largest > 0) model.scale.setScalar(2.3 / largest);
          model.rotation.set(0.18, -0.35, 0.08);
          scene.add(model);
          resize();
        },
        undefined,
        (error) => {
          console.error("No fue posible cargar la pelota 3D:", error);
          if (!disposed) setFailed(true);
        }
      );

      const animate = () => {
        if (disposed || !renderer) return;
        frame = window.requestAnimationFrame(animate);
        controls?.update();
        renderer.render(scene, camera);
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      window.addEventListener("resize", resize);
      resize();
      animate();

      return () => {
        disposed = true;
        window.cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        resizeObserver?.disconnect();
        controls?.dispose();
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material?.dispose());
          }
        });
        renderer?.dispose();
      };
    } catch (error) {
      console.error("WebGL no pudo iniciar:", error);
      setFailed(true);
      return () => { disposed = true; };
    }
  }, []);

  return (
    <div className={styles.sceneWrapper}>
      <div className={styles.glow} />
      <div ref={containerRef} className={styles.scene}>
        {!failed ? <canvas ref={canvasRef} aria-label="Pelota de béisbol interactiva" /> : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <img src="/images/logo-home-run.png" alt="Home Run Rewards" style={{ width: "min(58%, 260px)", height: "auto", objectFit: "contain" }} />
          </div>
        )}
      </div>
    </div>
  );
}
