"use client";

import { useEffect, useRef } from "react";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import styles from "./CampaignBaseballScene.module.css";

export default function CampaignBaseballScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );

    camera.position.set(0, 0, 4.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
      container.clientWidth,
      container.clientHeight
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        2.2
      );

    scene.add(ambientLight);

    const mainLight =
      new THREE.DirectionalLight(
        0xffffff,
        3
      );

    mainLight.position.set(3, 4, 5);
    scene.add(mainLight);

    const warmLight =
      new THREE.DirectionalLight(
        0xf2bd45,
        2.2
      );

    warmLight.position.set(-4, 1, 2);
    scene.add(warmLight);

    const rimLight =
      new THREE.DirectionalLight(
        0xe64b3c,
        1.8
      );

    rimLight.position.set(2, -3, -4);
    scene.add(rimLight);

    const controls = new OrbitControls(
      camera,
      renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    controls.enablePan = false;

    controls.enableZoom = true;
    controls.minDistance = 3.3;
    controls.maxDistance = 6.5;

    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;

    let baseballModel:
      | THREE.Object3D
      | null = null;

    const loader = new GLTFLoader();

    loader.load(
      "/models/baseball.glb",

      (gltf) => {
        baseballModel = gltf.scene;

        const box =
          new THREE.Box3().setFromObject(
            baseballModel
          );

        const size =
          box.getSize(
            new THREE.Vector3()
          );

        const center =
          box.getCenter(
            new THREE.Vector3()
          );

        baseballModel.position.sub(center);

        const largestDimension =
          Math.max(
            size.x,
            size.y,
            size.z
          );

        const scale =
          2.3 / largestDimension;

        baseballModel.scale.setScalar(scale);

        baseballModel.rotation.set(
          0.18,
          -0.35,
          0.08
        );

        baseballModel.traverse((child) => {
          if (
            child instanceof THREE.Mesh
          ) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(baseballModel);
      },

      undefined,

      (error) => {
        console.error(
          "No fue posible cargar la pelota:",
          error
        );
      }
    );

    let animationFrame = 0;

    function animate() {
      animationFrame =
        window.requestAnimationFrame(
          animate
        );

      controls.update();

      renderer.render(
        scene,
        camera
      );
    }

    animate();

    function handleResize() {
      if (!container) {
        return;
      }

      const width =
        container.clientWidth;

      const height =
        container.clientHeight;

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height
      );
    }

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );

      window.cancelAnimationFrame(
        animationFrame
      );

      controls.dispose();

      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh
        ) {
          object.geometry?.dispose();

          if (
            Array.isArray(
              object.material
            )
          ) {
            object.material.forEach(
              (material) =>
                material.dispose()
            );
          } else {
            object.material?.dispose();
          }
        }
      });

      renderer.dispose();

     if (
        renderer.domElement.isConnected
        ) {
        renderer.domElement.remove();
        }
    };
  }, []);

  return (
    <div className={styles.sceneWrapper}>
      <div className={styles.glow} />

      <div
        ref={containerRef}
        className={styles.scene}
        aria-label="Pelota de béisbol tridimensional interactiva"
      />

      <div className={styles.instructions}>
        <span className={styles.mouseIcon}>
          ↔
        </span>

        <div>
          <strong>
            Explora la pelota
          </strong>

          <p>
            Arrastra para girarla y usa la
            rueda para acercar o alejar.
          </p>
        </div>
      </div>
    </div>
  );
}