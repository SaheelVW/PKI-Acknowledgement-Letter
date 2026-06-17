import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Custom hook encapsulating all canvas-based signature pad logic.
 *
 * Returns:
 *  - canvasRef: ref to attach to the <canvas> element
 *  - signatureDataURL: current signature as a data URL (null if empty)
 *  - clearSignature: function to clear the pad
 *  - handlers: object with onMouseDown, onMouseMove, onMouseUp,
 *              onTouchStart, onTouchMove, onTouchEnd to spread onto canvas
 */
export default function useSignaturePad() {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const emptyCanvasRef = useRef("");
  const [signatureDataURL, setSignatureDataURL] = useState(null);

  /* ---------- RESIZE ---------- */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    emptyCanvasRef.current = canvas.toDataURL();
    // Clear existing signature reference when resized
    setSignatureDataURL(null);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  /* ---------- DRAWING HELPERS ---------- */
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }, []);

  const startDrawing = useCallback(
    (e) => {
      drawingRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const p = getPoint(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    },
    [getPoint]
  );

  const draw = useCallback(
    (e) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const p = getPoint(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [getPoint]
  );

  const stopDrawing = useCallback(() => {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = canvas.toDataURL();
    if (img !== emptyCanvasRef.current) {
      setSignatureDataURL(img);
    }
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataURL(null);
  }, []);

  const isEmpty = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    return canvas.toDataURL() === emptyCanvasRef.current;
  }, []);

  const handlers = {
    onMouseDown: startDrawing,
    onMouseMove: draw,
    onMouseUp: stopDrawing,
    onTouchStart: startDrawing,
    onTouchMove: draw,
    onTouchEnd: stopDrawing,
  };

  return { canvasRef, signatureDataURL, clearSignature, isEmpty, handlers };
}
