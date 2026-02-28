"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";

const LEFT_DOT = new THREE.Color("#7fd9cd");
const RIGHT_DOT = new THREE.Color("#8dd8ea");

const BG_COLOR_A = new THREE.Color("#e7eee3");
const BG_COLOR_B = new THREE.Color("#dceefe");
const BG_ACCENT = new THREE.Color("#d9fbef");

const BG_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BG_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uAccent;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv - 0.5;
    p.x *= uResolution.x / max(uResolution.y, 1.0);
    float t = uTime;

    float n1 = noise(uv * 5.4 + vec2(t * 0.8, -t * 0.7));
    float n2 = noise(uv * 10.6 + vec2(-t * 1.9, t * 1.4));
    float n3 = noise(uv * 18.0 + vec2(t * 2.6, t * 0.8));
    float n4 = noise((p + vec2(t * 0.25, -t * 0.18)) * 3.4);

    float baseMix = smoothstep(0.0, 1.0, uv.x * 0.86 + n1 * 0.22 - n2 * 0.11);
    vec3 color = mix(uColorA, uColorB, baseMix);

    float stream = sin((uv.y + n2 * 0.24) * 10.5 + t * 3.2 + n4 * 2.4) * 0.5 + 0.5;
    float stream2 = sin((uv.x + n1 * 0.28) * 8.5 - t * 2.4) * 0.5 + 0.5;
    float accent = smoothstep(0.6, 1.0, stream * 0.72 + stream2 * 0.28 + n3 * 0.32);
    color = mix(color, uAccent, accent * 0.34);

    float pulse = 0.5 + 0.5 * sin(t * 2.2 + n2 * 3.0 + length(p) * 5.2);
    color *= 0.92 + pulse * 0.1;

    float vignette = smoothstep(1.1, 0.2, distance(uv, vec2(0.5, 0.5)));
    color *= 0.94 + vignette * 0.09;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const DESKTOP_GAP = 4;
const MOBILE_GAP = 4;
const DESKTOP_SIZE = 1.1;
const MOBILE_SIZE = 0.95;

const TWINKLE_SPEED = 6.5;
const TWINKLE_STRENGTH = 0.08;

type AchievementDataPanelProps = {
  className?: string;
};

type GridData = {
  position: Float32Array;
  color: Float32Array;
  xNorm: Float32Array;
  yNorm: Float32Array;
  seeds: Float32Array;
};

function buildGrid(width: number, height: number, gap: number): GridData {
  const position: number[] = [];
  const color: number[] = [];
  const xNorm: number[] = [];
  const yNorm: number[] = [];
  const seeds: number[] = [];
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const safeW = Math.max(width, 1);
  const safeH = Math.max(height, 1);

  for (let py = 0; py <= height; py += gap) {
    for (let px = 0; px <= width; px += gap) {
      const x = px - halfW;
      const y = halfH - py;
      const nx = px / safeW;
      const ny = 1 - py / safeH;

      position.push(x, y, 0);
      color.push(LEFT_DOT.r, LEFT_DOT.g, LEFT_DOT.b);
      xNorm.push(nx);
      yNorm.push(ny);
      seeds.push(Math.random() * Math.PI * 2);
    }
  }

  return {
    position: Float32Array.from(position),
    color: Float32Array.from(color),
    xNorm: Float32Array.from(xNorm),
    yNorm: Float32Array.from(yNorm),
    seeds: Float32Array.from(seeds),
  };
}

export default function AchievementDataPanel({ className }: AchievementDataPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    const backgroundUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: BG_COLOR_A.clone() },
      uColorB: { value: BG_COLOR_B.clone() },
      uAccent: { value: BG_ACCENT.clone() },
    };

    const backgroundGeometry = new THREE.PlaneGeometry(1, 1);
    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: backgroundUniforms,
      vertexShader: BG_VERTEX_SHADER,
      fragmentShader: BG_FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      transparent: false,
    });
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.z = -1;
    backgroundMesh.renderOrder = 0;
    scene.add(backgroundMesh);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: DESKTOP_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      sizeAttenuation: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.renderOrder = 1;
    scene.add(points);

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const gap = mobile ? MOBILE_GAP : DESKTOP_GAP;
    material.size = mobile ? MOBILE_SIZE : DESKTOP_SIZE;

    let colorAttr: THREE.Float32BufferAttribute | null = null;
    let colors: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let xNorm: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let yNorm: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let seeds: Float32Array<ArrayBufferLike> = new Float32Array(0);
    let pointCount = 0;

    const setGrid = (width: number, height: number) => {
      const data = buildGrid(width, height, gap);
      pointCount = data.seeds.length;
      colors = data.color;
      xNorm = data.xNorm;
      yNorm = data.yNorm;
      seeds = data.seeds;

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.position, 3));
      colorAttr = new THREE.Float32BufferAttribute(data.color, 3);
      geometry.setAttribute("color", colorAttr);
      geometry.computeBoundingSphere();
    };

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);

      camera.left = -width * 0.5;
      camera.right = width * 0.5;
      camera.top = height * 0.5;
      camera.bottom = -height * 0.5;
      camera.updateProjectionMatrix();

      backgroundMesh.scale.set(width, height, 1);
      backgroundUniforms.uResolution.value.set(width, height);
      setGrid(width, height);
    };

    let frameId = 0;
    let disposed = false;
    const dotColor = new THREE.Color();

    const render = (timeMs: number) => {
      if (disposed || !colorAttr) {
        return;
      }

      const t = timeMs * 0.001 * TWINKLE_SPEED;
      backgroundUniforms.uTime.value = timeMs * 0.001;

      for (let i = 0; i < pointCount; i += 1) {
        const i3 = i * 3;
        const mix = xNorm[i] * 0.85 + yNorm[i] * 0.15;
        const twinkle =
          0.92 +
          (0.5 + 0.5 * Math.sin(t + seeds[i] + xNorm[i] * 3.2 + yNorm[i] * 2.4)) *
            TWINKLE_STRENGTH;

        dotColor.lerpColors(LEFT_DOT, RIGHT_DOT, mix);
        colors[i3] = THREE.MathUtils.clamp(dotColor.r * twinkle, 0, 1);
        colors[i3 + 1] = THREE.MathUtils.clamp(dotColor.g * twinkle, 0, 1);
        colors[i3 + 2] = THREE.MathUtils.clamp(dotColor.b * twinkle, 0, 1);
      }

      colorAttr.needsUpdate = true;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    };

    resize();
    frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      scene.remove(backgroundMesh);
      scene.remove(points);
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={className ?? "h-full w-full"}
      aria-hidden
    >
      <div ref={containerRef} className="h-full w-full" />
    </motion.div>
  );
}
