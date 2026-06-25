import { useState } from "react";
import SignatureModal from "./SignatureModal";

/**
 * SignaturePad — Shows the captured signature (or a prompt) and opens a
 * fullscreen signing surface when tapped, so a physical signature pad can use
 * the entire screen. Drawing logic lives in SignatureModal.
 */
export default function SignaturePad({ signatureDataURL, onCapture, onClear }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="form-section">
      <div className="section-heading">
        <div>
          <h2>Employee Signature</h2>
          <p>The signature will be added to the letter.</p>
        </div>
        {signatureDataURL && (
          <button type="button" className="secondary-btn" onClick={onClear}>
            Clear Signature
          </button>
        )}
      </div>

      <button
        type="button"
        className="sig-launch"
        onClick={() => setOpen(true)}
      >
        {signatureDataURL ? (
          <img
            src={signatureDataURL}
            alt="Signature"
            className="sig-preview-img"
          />
        ) : (
          <span className="sig-launch-text">
            ✍️ Tap here to sign (opens full screen)
          </span>
        )}
      </button>

      {open && (
        <SignatureModal onCapture={onCapture} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
