import React, { useEffect, useRef } from 'react';

export interface ShapeGridProps {
  squareSize?: number;
  speed?: number;
  direction?: 'diagonal' | 'up' | 'down' | 'left' | 'right';
  borderColor?: string;
  hoverFillColor?: string;
  className?: string;
}

export const ShapeGrid: React.FC<ShapeGridProps> = ({
  squareSize = 36,
  speed = 0.5,
  direction = 'diagonal',
  borderColor = 'rgba(70, 60, 95, 0.35)',
  hoverFillColor = 'rgba(245, 158, 11, 0.25)',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  const hoveredSquareRef = useRef<{ c: number; r: number; alpha: number } | null>(null);
  const trailsRef = useRef<Array<{ c: number; r: number; alpha: number }>>([]);
  const animFrameRef = useRef<number | null>(null);

  // Pre-generate stable ambient filled squares relative to grid indices
  const ambientFillsRef = useRef<Map<string, { alpha: number; maxAlpha: number; speed: number }>>(
    new Map()
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      hoveredSquareRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    let gridOffset = { x: 0, y: 0 };

    const draw = () => {
      // Continuous smooth scrolling movement
      const effectiveSpeed = Math.max(0.1, speed) * 0.45;
      if (direction === 'diagonal') {
        gridOffset.x = (gridOffset.x - effectiveSpeed + squareSize) % squareSize;
        gridOffset.y = (gridOffset.y - effectiveSpeed + squareSize) % squareSize;
      } else if (direction === 'right') {
        gridOffset.x = (gridOffset.x + effectiveSpeed) % squareSize;
      } else if (direction === 'left') {
        gridOffset.x = (gridOffset.x - effectiveSpeed + squareSize) % squareSize;
      } else if (direction === 'down') {
        gridOffset.y = (gridOffset.y + effectiveSpeed) % squareSize;
      } else if (direction === 'up') {
        gridOffset.y = (gridOffset.y - effectiveSpeed + squareSize) % squareSize;
      }

      ctx.clearRect(0, 0, width, height);

      const numCols = Math.ceil(width / squareSize) + 2;
      const numRows = Math.ceil(height / squareSize) + 2;

      // Find currently hovered grid cell
      let currentHovered: { c: number; r: number } | null = null;
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const hc = Math.floor((mx - gridOffset.x) / squareSize);
        const hr = Math.floor((my - gridOffset.y) / squareSize);
        currentHovered = { c: hc, r: hr };

        // Add or update trail
        const existingTrail = trailsRef.current.find((t) => t.c === hc && t.r === hr);
        if (existingTrail) {
          existingTrail.alpha = 1.0;
        } else {
          trailsRef.current.push({ c: hc, r: hr, alpha: 1.0 });
        }
      }

      // Fade out trails
      for (let i = 0; i < trailsRef.current.length; i++) {
        trailsRef.current[i].alpha *= 0.92;
      }
      trailsRef.current = trailsRef.current.filter((t) => t.alpha > 0.03);

      // Render square cells (clean, seamless grid matching user's image)
      ctx.lineWidth = 1;

      for (let c = -1; c < numCols; c++) {
        for (let r = -1; r < numRows; r++) {
          const x = c * squareSize + gridOffset.x;
          const y = r * squareSize + gridOffset.y;

          // Stable pseudo-random ambient square fill (like the top-left square in user's image)
          const seed = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
          const isAmbientFilled = (seed - Math.floor(seed)) > 0.88;

          const isDirectlyHovered =
            currentHovered && currentHovered.c === c && currentHovered.r === r;

          const trail = trailsRef.current.find((t) => t.c === c && t.r === r);

          if (isDirectlyHovered) {
            ctx.fillStyle = hoverFillColor;
            ctx.fillRect(x, y, squareSize, squareSize);
          } else if (trail) {
            ctx.fillStyle = `rgba(245, 158, 11, ${trail.alpha * 0.22})`;
            ctx.fillRect(x, y, squareSize, squareSize);
          } else if (isAmbientFilled) {
            // Subtle ambient darker/tinted tile like in the user's screenshot
            ctx.fillStyle = 'rgba(25, 20, 38, 0.4)';
            ctx.fillRect(x, y, squareSize, squareSize);
          }

          // Shared sharp grid border
          ctx.strokeStyle = isDirectlyHovered
            ? 'rgba(245, 158, 11, 0.6)'
            : trail
            ? `rgba(245, 158, 11, ${trail.alpha * 0.4})`
            : borderColor;

          ctx.strokeRect(x, y, squareSize, squareSize);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [squareSize, speed, direction, borderColor, hoverFillColor]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      {/* Soft gradient mask that keeps squares crisp throughout the screen */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 95% 85% at 50% 30%, transparent 45%, rgba(7, 11, 18, 0.5) 85%, rgba(7, 11, 18, 0.9) 100%)',
        }}
      />
    </div>
  );
};
export default ShapeGrid;
