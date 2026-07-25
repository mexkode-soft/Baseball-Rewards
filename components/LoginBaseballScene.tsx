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
    const wrapperElement =
      wrapperRef.current;

    const canvasElement =
      canvasRef.current;

    if (
      !wrapperElement ||
      !canvasElement
    ) {
      return;
    }

    let disposed = false;
    let animationFrameId = 0;

    let baseball:
      | THREE.Object3D
      | null = null;

    const initialWidth =
      wrapperElement.clientWidth || 430;

    const initialHeight =
      wrapperElement.clientHeight || 290;

    const scene =
      new THREE.Scene();

    const camera =
      new THREE.PerspectiveCamera(
        35,
        initialWidth / initialHeight,
        0.1,
        100
      );

    camera.position.set(
      0,
      0,
      3.65
    );

    /*
     * Three.js utilizará el canvas
     * que React ya creó.
     */
    const renderer =
      new THREE.WebGLRenderer({
        canvas: canvasElement,
        antialias: true,
        alpha: true,
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setSize(
      initialWidth,
      initialHeight,
      false
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
        2.35
      );

    scene.add(ambientLight);

    const frontLight =
      new THREE.DirectionalLight(
        0xffffff,
        3.4
      );

    frontLight.position.set(
      3,
      4,
      5
    );

    scene.add(frontLight);

    const goldLight =
      new THREE.PointLight(
        0xf2bd45,
        7,
        10
      );

    goldLight.position.set(
      -2,
      1.5,
      2.5
    );

    scene.add(goldLight);

    const redLight =
      new THREE.PointLight(
        0xe64b3c,
        2.7,
        8
      );

    redLight.position.set(
      2.5,
      -2,
      1
    );

    scene.add(redLight);

    const loader =
      new GLTFLoader();

    loader.load(
      "/models/baseball.glb",

      (gltf) => {
        if (disposed) {
          disposeModel(
            gltf.scene
          );

          return;
        }

        baseball = gltf.scene;

        const boundingBox =
          new THREE.Box3()
            .setFromObject(
              baseball
            );

        const modelSize =
          boundingBox.getSize(
            new THREE.Vector3()
          );

        const modelCenter =
          boundingBox.getCenter(
            new THREE.Vector3()
          );

        baseball.position.sub(
          modelCenter
        );

        const largestDimension =
          Math.max(
            modelSize.x,
            modelSize.y,
            modelSize.z
          );

        if (
          largestDimension > 0
        ) {
          const scale =
            2.75 /
            largestDimension;

          baseball.scale.setScalar(
            scale
          );
        }

        baseball.rotation.set(
          0.12,
          -0.3,
          0.08
        );

        baseball.traverse(
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

        scene.add(baseball);
      },

      undefined,

      (error) => {
        if (!disposed) {
          console.error(
            "No se pudo cargar baseball.glb:",
            error
          );
        }
      }
    );

    const clock =
      new THREE.Clock();

    function resizeScene() {
    if (disposed) {
        return;
    }

    const currentWrapper =
        wrapperRef.current;

    if (!currentWrapper) {
        return;
    }

    const currentWidth =
        currentWrapper.clientWidth;

    const currentHeight =
        currentWrapper.clientHeight;

    if (
        currentWidth <= 0 ||
        currentHeight <= 0
    ) {
        return;
    }

    camera.aspect =
        currentWidth / currentHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        currentWidth,
        currentHeight,
        false
    );
    }

    function animate() {
      if (disposed) {
        return;
      }

      animationFrameId =
        window.requestAnimationFrame(
          animate
        );

      const elapsed =
        clock.getElapsedTime();

      if (baseball) {
        baseball.rotation.y +=
          0.0065;

        baseball.rotation.x =
          0.12 +
          Math.sin(
            elapsed * 0.9
          ) *
            0.035;

        baseball.position.y =
          Math.sin(
            elapsed * 1.15
          ) *
          0.055;
      }

      goldLight.intensity =
        6.5 +
        Math.sin(
          elapsed * 1.7
        ) *
          0.75;

      renderer.render(
        scene,
        camera
      );
    }

    const resizeObserver =
      new ResizeObserver(() => {
        resizeScene();
      });

    resizeObserver.observe(
      wrapperElement
    );

    window.addEventListener(
      "resize",
      resizeScene
    );

    resizeScene();
    animate();

    return () => {
      disposed = true;

      window.removeEventListener(
        "resize",
        resizeScene
      );

      resizeObserver.disconnect();

      window.cancelAnimationFrame(
        animationFrameId
      );

      if (baseball) {
        scene.remove(baseball);

        disposeModel(
          baseball
        );

        baseball = null;
      }

      scene.clear();

      /*
       * Liberamos WebGL, pero no quitamos
       * el canvas del DOM. React lo hará.
       */
      renderer.renderLists.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      aria-label="Pelota de béisbol tridimensional giratoria"
    >
      <div
        className={styles.aura}
      />

      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
}

function disposeModel(
  model: THREE.Object3D
) {
  model.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh)
    ) {
      return;
    }

    child.geometry?.dispose();

    const materials =
      Array.isArray(
        child.material
      )
        ? child.material
        : [child.material];

    materials.forEach(
      (material) => {
        disposeMaterialTextures(
          material
        );

        material.dispose();
      }
    );
  });
}

function disposeMaterialTextures(
  material: THREE.Material
) {
  Object.values(material).forEach(
    (value) => {
      if (
        value instanceof
        THREE.Texture
      ) {
        value.dispose();
      }
    }
  );
}