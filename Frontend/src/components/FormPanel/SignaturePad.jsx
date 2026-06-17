/**
 * SignaturePad — Canvas-based signature input.
 *
 * ✅ Original: <canvas id="signaturePad"> + drawing logic in app.js
 * ✅ Drawing logic extracted to useSignaturePad hook; this is a pure UI component.
 *
 * Key changes:
 * - Canvas event listeners converted to React synthetic event handlers.
 * - Touch events use onTouchStart/Move/End with passive={false} via ref effect.
 * - Clear button triggers hook's clearSignature().
 */
import { useEffect } from "react";

export default function SignaturePad({ canvasRef, handlers, onClear }) {
  // Attach non-passive touch listeners directly so we can call preventDefault()
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const opts = { passive: false };
    const touchStart = (e) => handlers.onTouchStart(e);
    const touchMove = (e) => handlers.onTouchMove(e);
    const touchEnd = (e) => handlers.onTouchEnd(e);

    canvas.addEventListener("touchstart", touchStart, opts);
    canvas.addEventListener("touchmove", touchMove, opts);
    canvas.addEventListener("touchend", touchEnd, opts);

    return () => {
      canvas.removeEventListener("touchstart", touchStart, opts);
      canvas.removeEventListener("touchmove", touchMove, opts);
      canvas.removeEventListener("touchend", touchEnd, opts);
    };
  }, [canvasRef, handlers]);

  return (
    <section className="form-section">
      <div className="section-heading">
        <div>
          <h2>Employee Signature</h2>
          <p>The signature will be added to the letter.</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onClear}>
          Clear Signature
        </button>
      </div>

      <canvas
        id="signaturePad"
        ref={canvasRef}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
      />
    </section>
  );
}
