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
  const wrapperRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper =
      wrapperRef.current;

    const canvas =
      canvasRef.current;

    if (
      !wrapper ||
      !canvas
    ) {
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

    /*
     * React es propietario del canvas.
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

      const responsiveFactor =
        compact
          ? short
            ? 0.92
            : 1.08
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
            ? 4.9
            : 4.55
          : 4.8
      );
    }

    function resizeScene() {
      if (disposed) {
        return;
      }

      const currentWrapper =
        wrapperRef.current;

      if (!currentWrapper) {
        return;
      }

      const width =
        Math.max(
          currentWrapper.clientWidth,
          1
        );

      const height =
        Math.max(
          currentWrapper.clientHeight,
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
          gltf.scene.traverse(
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
        if (!disposed) {
          console.error(
            "No fue posible cargar la pelota:",
            error
          );
        }
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
            ? 0.02
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
      wrapper
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

      /*
       * No eliminamos el canvas.
       * React se encarga de desmontarlo.
       */
      renderer.renderLists.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
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

      <canvas
        ref={canvasRef}
        className={
          styles.scene
        }
      />
    </div>
  );
}