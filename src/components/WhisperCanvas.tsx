import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
}

export function WhisperCanvas({
  intensity = 'ambient',
}: {
  intensity?: 'ambient' | 'active';
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;

    const count = intensity === 'active' ? 36 : 24;
    const linkDist = intensity === 'active' ? 145 : 120;
    const speedFactor = intensity === 'active' ? 0.55 : 0.3;

    const particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speedFactor,
        vy: (Math.random() - 0.5) * speedFactor,
        radius: 1.4 + Math.random() * 1.8,
        alpha: 0.28 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const renderFrame = () => {
      const isDark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, width, height);

      time += 0.015;

      // Soft ambient emerald aurora washes
      const cx1 = width * 0.5 + Math.cos(time * 0.6) * (width * 0.08);
      const cy1 = height * 0.42 + Math.sin(time * 0.5) * (height * 0.06);
      const grad1 = ctx.createRadialGradient(
        cx1,
        cy1,
        10,
        cx1,
        cy1,
        Math.max(width, height) * 0.52,
      );
      if (isDark) {
        grad1.addColorStop(0, intensity === 'active' ? 'rgba(0, 168, 132, 0.16)' : 'rgba(0, 168, 132, 0.10)');
        grad1.addColorStop(0.55, 'rgba(0, 92, 75, 0.05)');
        grad1.addColorStop(1, 'rgba(11, 20, 26, 0)');
      } else {
        grad1.addColorStop(0, intensity === 'active' ? 'rgba(0, 168, 132, 0.14)' : 'rgba(0, 168, 132, 0.08)');
        grad1.addColorStop(0.6, 'rgba(0, 128, 105, 0.03)');
        grad1.addColorStop(1, 'rgba(239, 234, 226, 0)');
      }
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles + connecting whisper threads
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          p.phase += 0.025;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        const pulseAlpha =
          p.alpha * (0.72 + 0.28 * Math.sin(p.phase));

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDist) {
            const lineAlpha =
              (1 - dist / linkDist) *
              (isDark ? (intensity === 'active' ? 0.22 : 0.12) : 0.14);
            ctx.strokeStyle = isDark
              ? `rgba(37, 211, 102, ${lineAlpha})`
              : `rgba(0, 128, 105, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = isDark
          ? `rgba(37, 211, 102, ${pulseAlpha})`
          : `rgba(0, 128, 105, ${pulseAlpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  );
}
