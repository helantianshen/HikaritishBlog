"use client";
import { useEffect, useRef } from 'react';

class Ripple {
  x: number;
  y: number;
  r = 0;
  maxR = 60;
  opacity = 0.6;
  velocity = 2.5;

  constructor(
    x: number,
    y: number,
    private readonly ctx: CanvasRenderingContext2D,
  ) {
    this.x = x;
    this.y = y;
  }

  update() {
    this.r += this.velocity;
    this.velocity *= 0.96;
    this.opacity -= 0.015;
  }

  draw() {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(129, 140, 248, ${this.opacity})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.r * 0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(129, 140, 248, ${this.opacity * 0.3})`;
    this.ctx.fill();
  }
}

export default function ClickEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ripples: Ripple[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleClick = (e: MouseEvent) => {
      ripples.push(new Ripple(e.clientX, e.clientY, ctx));
    };

    window.addEventListener('click', handleClick);

    let animationFrame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 增加全局模糊，让涟漪更有“云端”质感
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(129, 140, 248, 0.5)';

      for (let i = 0; i < ripples.length; i++) {
        ripples[i].update();
        ripples[i].draw();
        if (ripples[i].opacity <= 0) {
          ripples.splice(i, 1);
          i--;
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}
