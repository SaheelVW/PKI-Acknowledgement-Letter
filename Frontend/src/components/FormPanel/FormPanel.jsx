import EmployeeDetails from "./EmployeeDetails";
import SignaturePad from "./SignaturePad";
import { useEffect, useRef, useState } from "react";

/**
 * FormPanel — Left sidebar containing the form, signature pad, and action buttons.
 *
 * ✅ Original: <aside class="form-panel"> in index.html + form submit logic in app.js
 * ✅ Composes EmployeeDetails and SignaturePad sub-components.
 *
 * Key changes:
 * - Form submit handler delegated to parent via onSubmit prop.
 * - Reset handler delegated via onReset prop.
 * - All DOM manipulation replaced with props/callbacks.
 */
export default function FormPanel({
  formData,
  onChange,
  onSubmit,
  onReset,
  signatureDataURL,
  onCaptureSignature,
  onClearSignature,
  isGenerating,
  officer,
  onLogout,
  onOpenAccount,
  onOpenRecords,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the menu when clicking outside of it or pressing Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const runAndClose = (fn) => () => {
    setMenuOpen(false);
    fn();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <aside className="form-panel">
      <div className="panel-header">
        <h1>PKI Card Acknowledgment</h1>
        {officer && (
          <div className="session-bar">
            <span className="session-user">
              {officer.label}
              {officer.role === "admin" && (
                <span className="role-badge role-admin">admin</span>
              )}
            </span>
            <div className="menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="hamburger-btn"
                aria-label="Open menu"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
              </button>

              {menuOpen && (
                <div className="menu-dropdown" role="menu">
                  <button
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={runAndClose(onOpenAccount)}
                  >
                    Account
                  </button>
                  <button
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    onClick={runAndClose(onOpenRecords)}
                  >
                    Records
                  </button>
                  <button
                    type="button"
                    className="menu-item menu-item-danger"
                    role="menuitem"
                    onClick={runAndClose(onLogout)}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form id="ackForm" noValidate onSubmit={handleSubmit}>
        <EmployeeDetails formData={formData} onChange={onChange} />

        <SignaturePad
          signatureDataURL={signatureDataURL}
          onCapture={onCaptureSignature}
          onClear={onClearSignature}
        />

        <div className="actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onReset}
          >
            Reset Employee
          </button>
          <button
            type="submit"
            className="primary-btn"
            disabled={isGenerating}
          >
            Save PDF
          </button>
        </div>
      </form>
    </aside>
  );
}
