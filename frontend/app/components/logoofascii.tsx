"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Lenis from "lenis";
import * as THREE from "three";

const SVG_WIDTH = 1318;
const SVG_HEIGHT = 322;
const SAMPLE_STEP = 4;
const ALPHA_THRESHOLD = 20;
const GREEN_THRESHOLD = 100;
const LOGO_COLOR = {
  r: 0,
  g: 1,
  b: 174 / 255,
};

type SvgSignProps = {
  className?: string;
};

type PointBuffers = {
  positionAttribute: THREE.Float32BufferAttribute;
  colorAttribute: THREE.Float32BufferAttribute;
  baseX: Float32Array;
  baseY: Float32Array;
};

function buildGeometryFromPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): PointBuffers {
  const positions: number[] = [];
  const colors: number[] = [];
  const baseX: number[] = [];
  const baseY: number[] = [];

  for (let y = 0; y < height; y += SAMPLE_STEP) {
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a < ALPHA_THRESHOLD || g < GREEN_THRESHOLD || g < r + 20 || g < b + 20) {
        continue;
      }

      const px = x - width / 2;
      const py = height / 2 - y;

      positions.push(px, py, 0);
      colors.push(LOGO_COLOR.r, LOGO_COLOR.g, LOGO_COLOR.b);
      baseX.push(px);
      baseY.push(py);
    }
  }

  return {
    positionAttribute: new THREE.Float32BufferAttribute(positions, 3),
    colorAttribute: new THREE.Float32BufferAttribute(colors, 3),
    baseX: Float32Array.from(baseX),
    baseY: Float32Array.from(baseY),
  };
}

function buildFallbackGeometry(): PointBuffers {
  const positions: number[] = [];
  const colors: number[] = [];
  const baseX: number[] = [];
  const baseY: number[] = [];
  const width = 260;
  const height = 64;

  const topProfile = (xRatio: number) => {
    if (xRatio < 0.4) {
      return (xRatio / 0.4) * 0.92;
    }
    if (xRatio < 0.52) {
      return 0.92 - ((xRatio - 0.4) / 0.12) * 0.58;
    }
    if (xRatio < 0.88) {
      const local = (xRatio - 0.52) / 0.36;
      return 0.34 - Math.floor(local * 7) * 0.042;
    }
    return Math.max(0.03, 0.085 - (xRatio - 0.88) * 0.6);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const xRatio = x / (width - 1);
      const yRatio = 1 - y / (height - 1);
      const inside = yRatio <= topProfile(xRatio);

      if (!inside || (x + y) % 2 !== 0) {
        continue;
      }

      const px = (x - width / 2) * 5;
      const py = (height / 2 - y) * 5;

      positions.push(px, py, 0);
      colors.push(LOGO_COLOR.r, LOGO_COLOR.g, LOGO_COLOR.b);
      baseX.push(px);
      baseY.push(py);
    }
  }

  return {
    positionAttribute: new THREE.Float32BufferAttribute(positions, 3),
    colorAttribute: new THREE.Float32BufferAttribute(colors, 3),
    baseX: Float32Array.from(baseX),
    baseY: Float32Array.from(baseY),
  };
}

export default function SvgSign({ className }: SvgSignProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollY = useMotionValue(0);
  const smoothScrollY = useSpring(scrollY, {
    stiffness: 85,
    damping: 20,
    mass: 0.7,
  });
  const parallaxY = useTransform(smoothScrollY, [0, 1400], [0, -22]);
  const parallaxScale = useTransform(smoothScrollY, [0, 1400], [1, 1.02]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2200);
    camera.position.z = 980;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 2.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      sizeAttenuation: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let buffers: PointBuffers | null = null;
    let frameId = 0;
    let disposed = false;
    let scrollOffset = 0;

    const removeLenisListener = lenis.on("scroll", (lenisState) => {
      scrollOffset = lenisState.scroll;
      scrollY.set(lenisState.scroll);
    });

    const setGeometry = (nextBuffers: PointBuffers) => {
      geometry.setAttribute("position", nextBuffers.positionAttribute);
      geometry.setAttribute("color", nextBuffers.colorAttribute);
      geometry.computeBoundingSphere();
      buffers = nextBuffers;
    };

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const render = (timeMs: number) => {
      lenis.raf(timeMs);

      if (disposed || !buffers) {
        return;
      }

      const t = timeMs * 0.0012;
      const scrollFactor = Math.min(1.15, scrollOffset / 1200);
      const positionArray = buffers.positionAttribute.array as Float32Array;
      const colorArray = buffers.colorAttribute.array as Float32Array;

      points.rotation.x = scrollFactor * 0.08;
      points.rotation.y = Math.sin(t * 0.9) * 0.05 + scrollFactor * 0.04;
      points.position.y = -scrollFactor * 12;

      for (let i = 0; i < buffers.baseY.length; i += 1) {
        const base = i * 3;
        const x = buffers.baseX[i];
        const y = buffers.baseY[i];
        const driftX = Math.sin(t * 4.2 + x * 0.021 + scrollOffset * 0.003) * 1.15;
        const driftY = Math.cos(t * 3.6 + y * 0.018 + x * 0.01) * 0.85;
        const wave = Math.sin(t * 6.4 + x * 0.028 + y * 0.016 + scrollOffset * 0.004) * 6.1;

        positionArray[base] = x + driftX;
        positionArray[base + 1] = y + driftY;
        positionArray[base + 2] = wave;
        colorArray[base] = LOGO_COLOR.r;
        colorArray[base + 1] = LOGO_COLOR.g;
        colorArray[base + 2] = LOGO_COLOR.b;
      }

      buffers.positionAttribute.needsUpdate = true;
      buffers.colorAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    const bootstrapFromSvg = () => {
      const image = new Image();

      image.onload = () => {
        if (disposed) {
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = SVG_WIDTH;
        canvas.height = SVG_HEIGHT;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          setGeometry(buildFallbackGeometry());
          resize();
          frameId = window.requestAnimationFrame(render);
          return;
        }

        context.clearRect(0, 0, SVG_WIDTH, SVG_HEIGHT);
        context.drawImage(image, 0, 0, SVG_WIDTH, SVG_HEIGHT);
        const pixels = context.getImageData(0, 0, SVG_WIDTH, SVG_HEIGHT).data;

        setGeometry(buildGeometryFromPixels(pixels, SVG_WIDTH, SVG_HEIGHT));
        resize();
        frameId = window.requestAnimationFrame(render);
      };

      image.onerror = () => {
        if (disposed) {
          return;
        }

        setGeometry(buildFallbackGeometry());
        resize();
        frameId = window.requestAnimationFrame(render);
      };

      image.src = "/logoofascii.svg";
    };

    bootstrapFromSvg();
    resize();
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      removeLenisListener();
      lenis.destroy();
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollY]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{ y: parallaxY, scale: parallaxScale }}
      className={className ?? "h-full w-full"}
      aria-hidden
    >
      <div ref={containerRef} className="h-full w-full" />
    </motion.div>
  );
}
