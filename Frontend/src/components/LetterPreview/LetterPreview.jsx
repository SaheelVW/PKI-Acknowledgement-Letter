import LetterTemplate from "./LetterTemplate";

/**
 * LetterPreview — The right-side preview panel containing the A4 letter.
 *
 * ✅ Original: <main class="preview-stage"> section in index.html
 * ✅ New React component wrapping the toolbar and LetterTemplate.
 *
 * Key changes:
 * - letterPageRef forwarded so parent can use it for PDF generation via html2canvas.
 * - All dynamic data passed as props to LetterTemplate (no DOM queries).
 */
export default function LetterPreview({ formData, signatureDataURL, letterPageRef }) {
  return (
    <main className="preview-stage">
      <div className="preview-toolbar">
        <div>
          <p className="eyebrow">Exact Template Preview</p>
          <h2>A4 Letter View</h2>
        </div>
        <span className="preview-badge">Matches PDF layout</span>
      </div>

      <div className="page" id="letterPage" ref={letterPageRef}>
        <LetterTemplate
          empName={formData.empName}
          empId={formData.empId}
          gid={formData.gid}
          raOfficer={formData.raOfficer}
          sessionLocation={formData.sessionLocation}
          sessionDate={formData.sessionDate}
          signatureDataURL={signatureDataURL}
        />
      </div>
    </main>
  );
}
