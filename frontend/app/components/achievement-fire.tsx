"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const POLYGON: Array<[number, number]> = [
  [0, 0.62],
  [0.04, 0.12],
  [0.07, 0.58],
  [0.1, 0.32],
  [0.12, 0.63],
  [0.22, 0.1],
  [0.25, 0.58],
  [0.31, 0.1],
  [0.35, 0.6],
  [0.45, 0.2],
  [0.49, 0.62],
  [0.57, 0.16],
  [0.61, 0.61],
  [0.7, 0.08],
  [0.75, 0.58],
  [0.82, 0.07],
  [0.86, 0.6],
  [0.92, 0.78],
  [0.95, 0.95],
  [1, 0.95],
  [1, 1],
  [0, 1],
];

const COOL_COLOR = new THREE.Color("#32e7df");
const HOT_COLOR = new THREE.Color("#9cfaf3");
const FLAME_SPEED_SLOW = 1.9;
const FLAME_SPEED_FAST = 9.2;
const FLAME_BOOST_MS = 1500;

const DESKTOP_DOT_STEP = 9;
const MOBILE_DOT_STEP = 8;
const DESKTOP_DOT_SIZE = 2;
const MOBILE_DOT_SIZE = 1.55;

type DotField = {
  positions: Float32Array;
  colors: Float32Array;
  baseX: Float32Array;
  baseY: Float32Array;
  seeds: Float32Array;
};

type AchievementFireProps = {
  className?: string;
  speedBoostKey?: number;
};

function pointInsidePolygon(
  x: number,
  y: number,
  polygon: Array<[number, number]>
): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

function createDotField(width: number, height: number, step: number): DotField {
  const positions: number[] = [];
  const colors: number[] = [];
  const baseX: number[] = [];
  const baseY: number[] = [];
  const seeds: number[] = [];

  const halfW = width * 0.5;
  const halfH = height * 0.5;

  for (let py = 0; py <= height; py += step) {
    for (let px = 0; px <= width; px += step) {
      const nx = px / width;
      const ny = py / height;

      if (!pointInsidePolygon(nx, ny, POLYGON)) {
        continue;
      }

      const x = px - halfW;
      const y = halfH - py;

      positions.push(x, y, 0);
      colors.push(COOL_COLOR.r, COOL_COLOR.g, COOL_COLOR.b);
      baseX.push(x);
      baseY.push(y);
      seeds.push(Math.random() * 100);
    }
  }

  return {
    positions: Float32Array.from(positions),
    colors: Float32Array.from(colors),
    baseX: Float32Array.from(baseX),
    baseY: Float32Array.from(baseY),
    seeds: Float32Array.from(seeds),
  };
}

export default function AchievementFire({
  className,
  speedBoostKey = 0,
}: AchievementFireProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const speedCurrent = useRef(FLAME_SPEED_SLOW);
  const boostUntil = useRef(0);

  useEffect(() => {
    if (speedBoostKey > 0) {
      boostUntil.current = performance.now() + FLAME_BOOST_MS;
    }
  }, [speedBoostKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();

    const material = new THREE.PointsMaterial({
      size: DESKTOP_DOT_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const dotStep = mobile ? MOBILE_DOT_STEP : DESKTOP_DOT_STEP;
    material.size = mobile ? MOBILE_DOT_SIZE : DESKTOP_DOT_SIZE;

    let pointCount = 0;
    let halfHeight = 1;

    let positionAttr: THREE.Float32BufferAttribute | null = null;
    let colorAttr: THREE.Float32BufferAttribute | null = null;

    let positions: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let colors: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let baseX: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let baseY: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let seeds: Float32Array<ArrayBufferLike> = new Float32Array(0);

    const rebuild = (w: number, h: number) => {
      const field = createDotField(w, h, dotStep);

      positions = field.positions;
      colors = field.colors;
      baseX = field.baseX;
      baseY = field.baseY;
      seeds = field.seeds;

      pointCount = baseX.length;
      halfHeight = h * 0.5;

      positionAttr = new THREE.Float32BufferAttribute(positions, 3);
      colorAttr = new THREE.Float32BufferAttribute(colors, 3);

      geometry.setAttribute("position", positionAttr);
      geometry.setAttribute("color", colorAttr);
      geometry.computeBoundingSphere();
    };

    const resize = () => {
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);

      renderer.setSize(w, h);

      camera.left = -w * 0.5;
      camera.right = w * 0.5;
      camera.top = h * 0.5;
      camera.bottom = -h * 0.5;
      camera.updateProjectionMatrix();

      rebuild(w, h);
    };

    const clock = new THREE.Clock();
    let frame = 0;
    let disposed = false;

    const render = (timeMs: number) => {
      if (disposed || !positionAttr || !colorAttr) {
        return;
      }

      const target =
        timeMs < boostUntil.current ? FLAME_SPEED_FAST : FLAME_SPEED_SLOW;
      speedCurrent.current += (target - speedCurrent.current) * 0.1;
      const boostMix = THREE.MathUtils.clamp(
        (speedCurrent.current - FLAME_SPEED_SLOW) /
          (FLAME_SPEED_FAST - FLAME_SPEED_SLOW),
        0,
        1
      );

      const t = clock.elapsedTime * speedCurrent.current;

      for (let i = 0; i < pointCount; i += 1) {
        const i3 = i * 3;

        const x = baseX[i];
        const y = baseY[i];
        const seed = seeds[i];

        const yRatio = (y + halfHeight) / (halfHeight * 2);
        const baseHeat = 1 - yRatio;
        const flicker = 0.5 + 0.5 * Math.sin(t * 10 + seed * 7);

        const upward =
          (0.7 + yRatio * 2.4) * (0.5 + flicker * (0.8 + boostMix * 0.5));
        const sway =
          Math.sin(t * 4 + seed * 2 + y * 0.02) *
          (0.4 + yRatio * 1.2) *
          (1 + boostMix * 1.5);
        const turbulence =
          Math.sin(t * 7 + seed * 3) *
          (0.3 + yRatio * 1.1) *
          (1 + boostMix * 2.2);

        positions[i3] = x + sway;
        positions[i3 + 1] = y + upward + turbulence;
        positions[i3 + 2] = 0;

        const heat = THREE.MathUtils.clamp(baseHeat * 0.8 + flicker * 0.3 + boostMix * 0.14, 0, 1);
        const brightness = 0.86 + flicker * 0.2 + boostMix * 0.1;

        colors[i3] = THREE.MathUtils.clamp(
          (COOL_COLOR.r + (HOT_COLOR.r - COOL_COLOR.r) * heat) * brightness,
          0,
          1
        );
        colors[i3 + 1] = THREE.MathUtils.clamp(
          (COOL_COLOR.g + (HOT_COLOR.g - COOL_COLOR.g) * heat) * brightness,
          0,
          1
        );
        colors[i3 + 2] = THREE.MathUtils.clamp(
          (COOL_COLOR.b + (HOT_COLOR.b - COOL_COLOR.b) * heat) * brightness,
          0,
          1
        );
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      material.opacity = 0.85 + Math.sin(t * (5 + boostMix * 3)) * (0.1 + boostMix * 0.05);
      material.size =
        (mobile ? MOBILE_DOT_SIZE : DESKTOP_DOT_SIZE) *
        (1 + Math.sin(t * (2.2 + boostMix * 1.3)) * (0.07 + boostMix * 0.08));

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    resize();
    frame = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={className ?? "h-full w-full"} aria-hidden />;
}
