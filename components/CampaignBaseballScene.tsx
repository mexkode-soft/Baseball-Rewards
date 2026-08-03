"use client";

import {
  useEffect,
  useRef,
} from "react";

import * as THREE from "three";

import {
  GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  OrbitControls,
} from "three/examples/jsm/controls/OrbitControls.js";

import styles from "./CampaignBaseballScene.module.css";

export default function CampaignBaseballScene() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    const canvas =
      canvasRef.current;

    if (
      !container ||
      !canvas
    ) {
      return;
    }

    let disposed = false;
    let animationFrame = 0;

    const scene =
      new THREE.Scene();

    const camera =
      new THREE.PerspectiveCamera(
        40,
        1,
        0.01,
        100
      );

    camera.position.set(
      0,
      0,
      4.8
    );

    /*
     * React crea el canvas.
     * Three.js solamente lo utiliza.
     */
    const renderer =
      new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.25;

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        2.2
      );

    scene.add(
      ambientLight
    );

    const mainLight =
      new THREE.DirectionalLight(
        0xffffff,
        3
      );

    mainLight.position.set(
      3,
      4,
      5
    );

    scene.add(
      mainLight
    );

    const warmLight =
      new THREE.DirectionalLight(
        0xf2bd45,
        2.2
      );

    warmLight.position.set(
      -4,
      1,
      2
    );

    scene.add(
      warmLight
    );

    const rimLight =
      new THREE.DirectionalLight(
        0xe64b3c,
        1.8
      );

    rimLight.position.set(
      2,
      -3,
      -4
    );

    scene.add(
      rimLight
    );

    const controls =
      new OrbitControls(
        camera,
        canvas
      );

    controls.enableDamping =
      true;

    controls.dampingFactor =
      0.08;

    controls.enablePan =
      false;

    controls.enableZoom =
      true;

    /*
     * Permite acercarse mucho más a la superficie
     * sin sacar la pelota del contenedor.
     */
    controls.minDistance =
      1.24;

    controls.maxDistance =
      8.5;

    controls.zoomSpeed =
      0.85;

    controls.zoomToCursor =
      true;

    controls.autoRotate =
      true;

    controls.autoRotateSpeed =
      1.1;

    let baseballModel:
      | THREE.Object3D
      | null = null;

    function resizeScene() {
      if (disposed) {
        return;
      }

      const currentContainer =
        containerRef.current;

      if (!currentContainer) {
        return;
      }

      const width =
        Math.max(
          currentContainer.clientWidth,
          1
        );

      const height =
        Math.max(
          currentContainer.clientHeight,
          1
        );

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
        false
      );
    }

    const loader =
      new GLTFLoader();

    loader.load(
      "/models/baseball.glb",

      (gltf) => {
        if (disposed) {
          return;
        }

        baseballModel =
          gltf.scene;

        const box =
          new THREE.Box3()
            .setFromObject(
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

        baseballModel.position.sub(
          center
        );

        const largestDimension =
          Math.max(
            size.x,
            size.y,
            size.z
          );

        if (
          largestDimension >
          0
        ) {
          const scale =
            2.3 /
            largestDimension;

          baseballModel.scale.setScalar(
            scale
          );
        }

        baseballModel.rotation.set(
          0.18,
          -0.35,
          0.08
        );

        baseballModel.traverse(
          (child) => {
            if (
              child instanceof
              THREE.Mesh
            ) {
              child.castShadow =
                true;

              child.receiveShadow =
                true;
            }
          }
        );

        scene.add(
          baseballModel
        );

        resizeScene();
      },

      undefined,

      (error) => {
        if (disposed) {
          return;
        }

        console.error(
          "No fue posible cargar la pelota:",
          error
        );
      }
    );

    function animate() {
      if (disposed) {
        return;
      }

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

    const resizeObserver =
      new ResizeObserver(
        resizeScene
      );

    resizeObserver.observe(
      container
    );

    window.addEventListener(
      "resize",
      resizeScene
    );

    resizeScene();
    animate();

    return () => {
      disposed = true;

      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        resizeScene
      );

      window.cancelAnimationFrame(
        animationFrame
      );

      controls.dispose();

      scene.traverse(
        (object) => {
          if (
            object instanceof
            THREE.Mesh
          ) {
            object.geometry?.dispose();

            const materials =
              Array.isArray(
                object.material
              )
                ? object.material
                : [
                    object.material,
                  ];

            materials.forEach(
              (material) => {
                material.dispose();
              }
            );
          }
        }
      );

      renderer.renderLists.dispose();
      renderer.dispose();

      /*
       * No usamos appendChild,
       * removeChild ni remove().
       * React controla el canvas.
       */
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={
        styles.sceneWrapper
      }
    >
      <div
        className={
          styles.glow
        }
      />

      <canvas
        ref={canvasRef}
        className={
          styles.scene
        }
        aria-label="Pelota de béisbol tridimensional interactiva"
      />

      <div
        className={
          styles.instructions
        }
      >
        <span
          className={
            styles.mouseIcon
          }
        >
          ↔
        </span>

        <div>
          <strong>
            Explora la pelota
          </strong>

          <p>
            Arrastra para girarla. Usa
            la rueda o pellizca con dos
            dedos para verla de cerca.
          </p>
        </div>
      </div>
    </div>
  );
}