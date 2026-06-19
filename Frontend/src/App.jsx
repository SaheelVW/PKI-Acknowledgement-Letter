import { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import FormPanel from "./components/FormPanel/FormPanel";
import LetterPreview from "./components/LetterPreview/LetterPreview";
import Login from "./components/Login/Login";
import AccountPanel from "./components/Account/AccountPanel";
import useSignaturePad from "./hooks/useSignaturePad";
import { generateGID, getTodayISO } from "./utils/helpers";
import {
  getStoredOfficer,
  clearAuth,
  fetchEmployees,
  savePdfToServer,
} from "./utils/api";
import "./styles/app.css";

/**
 * App — Root component. Owns all shared state and orchestrates PDF generation.
 *
 * ✅ Original: app.js (global state + event wiring)
 * ✅ State lifted here; passed down via props to FormPanel and LetterPreview.
 *
 * Key changes:
 * - All global variables (fields, drawing state) → React useState / useRef.
 * - refreshPreview() is no longer needed — React re-renders on state change.
 * - savePDF() uses a ref to the letter page DOM node instead of getElementById.
 */

function buildInitialFormData() {
  return {
    empName: "",
    empId: "",
    gid: generateGID(),
    tokenType: "",
    sessionLocation: "Pune",
    raOfficer: "",
    sessionDate: getTodayISO(),
  };
}

export default function App() {
  const [officer, setOfficer] = useState(getStoredOfficer);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState(buildInitialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const letterPageRef = useRef(null);

  /* ---------- LOAD EMPLOYEES FROM BACKEND (after login) ---------- */
  useEffect(() => {
    if (!officer) return;

    // The logged-in RA officer's name/email is the default on the letter.
    setFormData((prev) => ({ ...prev, raOfficer: officer.displayValue || "" }));

    fetchEmployees()
      .then(setEmployees)
      .catch((err) => {
        console.error(err);
        if (/expired/i.test(err.message)) handleLogout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officer]);

  const handleLogout = useCallback(() => {
    clearAuth();
    setOfficer(null);
    setEmployees([]);
    setFormData(buildInitialFormData());
  }, []);

  // Signature pad hook
  const { canvasRef, signatureDataURL, clearSignature, isEmpty, handlers } =
    useSignaturePad();

  /* ---------- FORM FIELD CHANGE ---------- */
  const handleFieldChange = useCallback((fieldId, value) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Auto-fill name & location when employee ID matches
      if (fieldId === "empId") {
        const match = employees.find((e) => e.id === value.trim());
        if (match) {
          // "Firstname Middle Last" → "Last, Firstname"
          const parts = match.name.split(" ").filter(Boolean);
          const surname = parts.pop();
          const firstName = parts[0] || "";
          next.empName = firstName
            ? `${surname}, ${firstName}`
            : surname;

          // "VWGDS-Pune Congo" → "Pune"
          next.sessionLocation = match.location
            .replace(/^VW\w+-/, "")
            .split(/[\s-]/)[0];
        }
      }

      return next;
    });
  }, [employees]);

  /* ---------- RESET ---------- */
  const handleReset = useCallback(() => {
    setFormData({
      ...buildInitialFormData(),
      raOfficer: officer?.displayValue || "",
    });
    clearSignature();
  }, [clearSignature, officer]);

  /* ---------- PDF GENERATION ---------- */
  const handleSubmit = useCallback(async () => {
    // All employee details are mandatory — do not generate/save the PDF
    // until every required field has been filled in.
    const requiredFields = [
      { key: "empId", label: "Employee ID" },
      { key: "empName", label: "Employee Name" },
      { key: "gid", label: "GID" },
      { key: "sessionLocation", label: "Location" },
      { key: "sessionDate", label: "Date" },
    ];

    const missing = requiredFields.filter(
      (f) => !String(formData[f.key] || "").trim()
    );

    if (missing.length > 0) {
      alert(
        "Please fill in all required details before saving:\n\n" +
          missing.map((f) => `• ${f.label}`).join("\n")
      );
      return;
    }

    if (isEmpty()) {
      alert("Please add signature");
      return;
    }

    setIsGenerating(true);
    try {
      const pageEl = letterPageRef.current;
      if (!pageEl) return;

      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height / canvas.width) * imgWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      const tokenSuffix =
        formData.tokenType === "SOFT TOKEN" ? "_SOFT_TOKEN" : "";
      const fileName = `PKI_${formData.empName}_${formData.empId}${tokenSuffix}.pdf`;

      // Send the PDF to the backend which writes it directly to the
      // OneDrive-synced folder configured in PDF_SAVE_FOLDER.
      const pdfBase64 = pdf.output("datauristring").split(",")[1];
        try {
          await savePdfToServer(pdfBase64, fileName);
          alert(`✅ PDF saved successfully!\n\n${fileName}`);
        } catch (saveErr) {
          console.error("Save to server failed:", saveErr);
          // Fallback: download locally so the PDF is never lost
          pdf.save(fileName);
          alert(`⚠️ Could not save to server (${saveErr.message}).\n\nThe PDF has been downloaded to your Downloads folder instead.`);
        }
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert(`❌ Failed to generate PDF: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    }, [formData, isEmpty]);

  if (!officer) {
    return <Login onSuccess={setOfficer} />;
  }

  return (
    <div className="app-shell">
      <FormPanel
        formData={formData}
        onChange={handleFieldChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        canvasRef={canvasRef}
        signatureHandlers={handlers}
        onClearSignature={clearSignature}
        isGenerating={isGenerating}
        officer={officer}
        onLogout={handleLogout}
        onOpenAccount={() => setShowAccount(true)}
      />

      <LetterPreview
        formData={formData}
        signatureDataURL={signatureDataURL}
        letterPageRef={letterPageRef}
      />

      {showAccount && (
        <AccountPanel officer={officer} onClose={() => setShowAccount(false)} />
      )}
    </div>
  );
}
