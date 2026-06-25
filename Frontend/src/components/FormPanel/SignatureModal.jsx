import { useCallback, useEffect, useRef } from "react";

/**
 * SignatureModal — Fullscreen signing surface.
 *
 * Opens the browser into fullscreen so a physical digital signature pad can use
 * the entire screen. Uses Pointer Events so it works with pen, touch, and mouse.
 * On "Done" it crops the drawing to its bounding box and returns a PNG data URL.
 */
export default function SignatureModal({ onCapture, onClose }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const boundsRef = useRef(null); // { minX, minY, maxX, maxY }

  /* ---------- size the canvas to the full screen ---------- */
  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
  }, []);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    sizeCanvas();

    // Try to enter real fullscreen for maximum drawing area.
    const el = overlayRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }

    const onResize = () => sizeCanvas();
    window.addEventListener("resize", onResize);

    const onKey = (e) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [sizeCanvas, handleCancel]);

  /* ---------- drawing ---------- */
  const pointFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const trackBounds = (x, y) => {
    const b = boundsRef.current;
    if (!b) {
      boundsRef.current = { minX: x, minY: y, maxX: x, maxY: y };
    } else {
      b.minX = Math.min(b.minX, x);
      b.minY = Math.min(b.minY, y);
      b.maxX = Math.max(b.maxX, x);
      b.maxY = Math.max(b.maxY, y);
    }
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const p = pointFromEvent(e);
    lastRef.current = p;
    trackBounds(p.x, p.y);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    hasInkRef.current = true;
    trackBounds(p.x, p.y);
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  /* ---------- actions ---------- */
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    boundsRef.current = null;
  };

  const handleDone = () => {
    if (!hasInkRef.current) {
      alert("Please sign before saving.");
      return;
    }

    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const b = boundsRef.current;
    const pad = 12;

    // Crop to the signature bounding box (in device pixels).
    const sx = Math.max(0, (b.minX - pad) * ratio);
    const sy = Math.max(0, (b.minY - pad) * ratio);
    const sw = Math.min(canvas.width - sx, (b.maxX - b.minX + pad * 2) * ratio);
    const sh = Math.min(canvas.height - sy, (b.maxY - b.minY + pad * 2) * ratio);

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    out.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    onCapture(out.toDataURL("image/png"));
    onClose();
  };

  return (
    <div className="sig-overlay" ref={overlayRef}>
      <div className="sig-toolbar">
        <span className="sig-hint">Sign anywhere below</span>
        <div className="sig-toolbar-actions">
          <button type="button" className="secondary-btn" onClick={handleClear}>
            Clear
          </button>
          <button type="button" className="secondary-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleDone}>
            Done
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="sig-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
