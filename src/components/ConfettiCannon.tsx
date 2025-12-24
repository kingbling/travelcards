"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface ConfettiCannonProps {
  colors: string[];
  particleCount?: number;
  duration?: number;
}

interface ConfettiPiece {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  gravity: number;
}

export function ConfettiCannon({
  colors,
  particleCount = 150,
  duration = 4000,
}: ConfettiCannonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log("[CONFETTI] Initializing three.js confetti cannon");

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Position camera to see the full effect
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background

    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';

    containerRef.current.appendChild(canvas);

    console.log("[CONFETTI] Canvas added to DOM");

    // Confetti pieces
    const confettiPieces: ConfettiPiece[] = [];

    // Create confetti geometries
    const geometries = [
      new THREE.BoxGeometry(0.1, 0.15, 0.02), // Rectangle
      new THREE.CircleGeometry(0.08, 8), // Circle
      new THREE.TetrahedronGeometry(0.08), // Triangle/diamond
    ];

    // Create confetti pieces
    for (let i = 0; i < particleCount; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Random starting position (spread horizontally at bottom)
      mesh.position.x = (Math.random() - 0.5) * 6;
      mesh.position.y = -4;
      mesh.position.z = (Math.random() - 0.5) * 3;

      // Random velocity (shoot upward and outward from bottom)
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        0.2 + Math.random() * 0.25, // Strong upward force
        (Math.random() - 0.5) * 0.15
      );

      // Random angular velocity for spinning
      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      scene.add(mesh);
      confettiPieces.push({
        mesh,
        velocity,
        angularVelocity,
        gravity: 0.01 + Math.random() * 0.005,
      });
    }

    console.log(`[CONFETTI] Created ${confettiPieces.length} confetti pieces`);

    // Animation loop
    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Stop after duration
      if (elapsed > duration) {
        confettiPieces.forEach((piece) => scene.remove(piece.mesh));
        renderer.dispose();
        if (containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
        return;
      }

      // Update each confetti piece
      confettiPieces.forEach((piece) => {
        // Apply gravity
        piece.velocity.y -= piece.gravity;

        // Update position
        piece.mesh.position.add(piece.velocity);

        // Update rotation
        piece.mesh.rotation.x += piece.angularVelocity.x;
        piece.mesh.rotation.y += piece.angularVelocity.y;
        piece.mesh.rotation.z += piece.angularVelocity.z;

        // Fade out towards the end
        const fadeStart = duration * 0.7;
        if (elapsed > fadeStart) {
          const fadeProgress = (elapsed - fadeStart) / (duration - fadeStart);
          (piece.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - fadeProgress;
          (piece.mesh.material as THREE.MeshBasicMaterial).transparent = true;
        }
      });

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      confettiPieces.forEach((piece) => {
        piece.mesh.geometry.dispose();
        (piece.mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [colors, particleCount, duration]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        mixBlendMode: "normal",
      }}
    />
  );
}
