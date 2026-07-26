"use client";

import {
  useEffect,
  useRef,
} from "react";

import * as THREE from "three";
import {
  GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";

import styles from "./LoginBaseballScene.module.css";

export default function LoginBaseballScene() {
  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let animationFrame = 0;

    let baseballModel:
      | THREE.Object3D
      | null = null;

    let modelBaseScale = 1;

    const scene =
      new THREE.Scene();

    const camera =
      new THREE.PerspectiveCamera(
        38,
        1,
        0.1,
        100
      );

    const renderer =
      new THREE.WebGLRenderer({
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

    container.appendChild(
      renderer.domElement
    );

    scene.add(
      new THREE.AmbientLight(
        0xffffff,
        2.3
      )
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

    scene.add(mainLight);

    const warmLight =
      new THREE.DirectionalLight(
        0xf2bd45,
        2.1
      );

    warmLight.position.set(
      -4,
      1,
      2
    );

    scene.add(warmLight);

    function isCompactView() {
      return (
        window.innerWidth <=
        1200
      );
    }

    function isShortView() {
      return (
        window.innerHeight <=
        720
      );
    }

    function applyResponsiveModelSize() {
      if (!baseballModel) {
        return;
      }

      const compact =
        isCompactView();

      const short =
        isShortView();

      /*
       * Tamaño final recomendado.
       * En compacto queda más grande
       * que en las versiones anteriores,
       * pero sigue entrando completa.
       */
      const responsiveFactor =
        compact
          ? short
            ? 1.05
            : 1.22
          : 1;

      baseballModel.scale.setScalar(
        modelBaseScale *
          responsiveFactor
      );

      camera.position.set(
        0,
        0,
        compact
          ? short
            ? 4.55
            : 4.2
          : 4.8
      );
    }

    function resizeScene() {
      const currentContainer =
        containerRef.current;

      if (
        !currentContainer ||
        disposed
      ) {
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

      applyResponsiveModelSize();
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
          modelBaseScale =
            2.3 /
            largestDimension;
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

        applyResponsiveModelSize();
      },

      undefined,

      (error) => {
        console.error(
          "No fue posible cargar la pelota:",
          error
        );
      }
    );

    const clock =
      new THREE.Clock();

    function animate() {
      if (disposed) {
        return;
      }

      animationFrame =
        window.requestAnimationFrame(
          animate
        );

      const elapsed =
        clock.getElapsedTime();

      if (baseballModel) {
        baseballModel.rotation.y +=
          0.006;

        baseballModel.position.y =
          Math.sin(
            elapsed * 1.25
          ) *
          (isCompactView()
            ? 0.026
            : 0.045);
      }

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
              (material) =>
                material.dispose()
            );
          }
        }
      );

      renderer.renderLists.dispose();
      renderer.dispose();

      if (
        renderer.domElement
          .isConnected
      ) {
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div
      className={
        styles.sceneWrapper
      }
      aria-label="Pelota de béisbol tridimensional girando"
    >
      <div
        className={
          styles.glow
        }
      />

      <div
        ref={containerRef}
        className={
          styles.scene
        }
      />
    </div>
  );
}
