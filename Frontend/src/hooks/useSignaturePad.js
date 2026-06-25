import { useCallback, useState } from "react";

/**
 * Holds the captured signature. The actual drawing now happens in a fullscreen
 * modal (SignatureModal) so a physical digital signature pad can use the whole
 * screen. This hook just stores the captured image.
 *
 * Returns:
 *  - signatureDataURL: current signature as a data URL (null if empty)
 *  - setSignature(url): store a captured signature image
 *  - clearSignature(): remove the current signature
 *  - isEmpty(): true when no signature has been captured
 */
export default function useSignaturePad() {
  const [signatureDataURL, setSignatureDataURL] = useState(null);

  const setSignature = useCallback((url) => setSignatureDataURL(url || null), []);
  const clearSignature = useCallback(() => setSignatureDataURL(null), []);
  const isEmpty = useCallback(() => !signatureDataURL, [signatureDataURL]);

  return { signatureDataURL, setSignature, clearSignature, isEmpty };
}
