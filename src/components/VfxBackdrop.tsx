import React, { useEffect, useRef } from 'react';

interface VfxBackdropProps {
  variant?: 'hero' | 'subtle';
  className?: string;
}

interface NodeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: 'blue' | 'cyan' | 'indigo';
}

export const VfxBackdrop: React.FC<VfxBackdropProps> = ({
  variant = 'hero',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999, active: false };

    const particleCount = variant === 'hero' ? 42 : 24;
    const maxLinkDist = variant === 'hero' ? 145 : 120;
    const particles: NodeParticle[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        const hues: Array<'blue' | 'cyan' | 'indigo'> = ['blue', 'cyan', 'indigo'];
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: 1.4 + Math.random() * 1.8,
            alpha: 0.35 + Math.random() * 0.45,
            hue: hues[i % hues.length],
          });
        }
      }
    };

    const getColor = (hue: NodeParticle['hue'], alpha: number) => {
      if (hue === 'cyan') return `rgba(56, 189, 248, ${alpha})`;
      if (hue === 'indigo') return `rgba(129, 140, 248, ${alpha})`;
      return `rgba(59, 130, 246, ${alpha})`;
    };

    const drawFrame = (timeMs: number) => {
      ctx.clearRect(0, 0, width, height);

      // Soft animated radial light bloom (GPU-friendly gradient fills)
      const t = timeMs * 0.00025;
      const g1x = width * (0.22 + Math.sin(t) * 0.08);
      const g1y = height * (0.28 + Math.cos(t * 0.8) * 0.08);
      const grad1 = ctx.createRadialGradient(g1x, g1y, 10, g1x, g1y, Math.max(width, height) * 0.55);
      grad1.addColorStop(0, variant === 'hero' ? 'rgba(37, 99, 235, 0.24)' : 'rgba(37, 99, 235, 0.12)');
      grad1.addColorStop(1, 'rgba(11, 25, 44, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const g2x = width * (0.8 + Math.cos(t * 1.1) * 0.07);
      const g2y = height * (0.72 + Math.sin(t * 0.9) * 0.07);
      const grad2 = ctx.createRadialGradient(g2x, g2y, 10, g2x, g2y, Math.max(width, height) * 0.48);
      grad2.addColorStop(0, variant === 'hero' ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.08)');
      grad2.addColorStop(1, 'rgba(11, 25, 44, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Update & draw constellation network
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
          p.x = Math.max(0, Math.min(width, p.x));
          p.y = Math.max(0, Math.min(height, p.y));
        }

        // Draw links to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLinkDist * maxLinkDist) {
            const dist = Math.sqrt(distSq);
            const linkAlpha = (1 - dist / maxLinkDist) * (variant === 'hero' ? 0.22 : 0.14);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${linkAlpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Subtle interactive pointer tether
        if (pointer.active) {
          const pdx = p.x - pointer.x;
          const pdy = p.y - pointer.y;
          const pDistSq = pdx * pdx + pdy * pdy;
          if (pDistSq < 160 * 160) {
            const pDist = Math.sqrt(pDistSq);
            const alpha = (1 - pDist / 160) * 0.34;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = getColor(p.hue, p.alpha);
        ctx.fill();
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= rect.width && pointer.y >= 0 && pointer.y <= rect.height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const loop = (now: number) => {
      if (!document.hidden) {
        drawFrame(now);
      }
      animId = window.requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    if (prefersReducedMotion) {
      drawFrame(0);
    } else {
      animId = window.requestAnimationFrame(loop);
    }

    return () => {
      window.cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
};
