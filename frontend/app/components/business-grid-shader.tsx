"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    float base = 0.03 + uv.x * 0.045 + uv.y * 0.04;
    float cloudA = noise(uv * vec2(5.0 * aspect, 5.0) + vec2(t * 0.28, -t * 0.2));
    float cloudB = noise(uv * vec2(11.0 * aspect, 11.0) + vec2(-t * 0.5, t * 0.35));
    float bg = clamp(base + cloudA * 0.08 + cloudB * 0.045, 0.0, 0.22);

    vec2 grid = uv * vec2(86.0 * aspect, 86.0);
    vec2 cell = fract(grid) - 0.5;
    vec2 gid = floor(grid);

    float square = 1.0 - step(0.185, max(abs(cell.x), abs(cell.y)));
    float flicker = 0.86 + 0.14 * sin(t * 5.8 + gid.x * 0.23 + gid.y * 0.17);
    float pulse = 0.82 + 0.18 * sin(t * 2.4 + cloudA * 5.0);
    float dot = square * flicker * pulse;

    vec3 color = vec3(bg + dot * 0.88);
    gl_FragColor = vec4(color, 1.0);
  }
`;

type BusinessGridShaderProps = {
  className?: string;
};

export default function BusinessGridShader({ className }: BusinessGridShaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
      transparent: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };

    let frameId = 0;
    let disposed = false;

    const render = (timeMs: number) => {
      if (disposed) {
        return;
      }

      uniforms.uTime.value = timeMs * 0.001;
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
      scene.remove(mesh);
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
