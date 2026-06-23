import EmployeeDetails from "./EmployeeDetails";
import SignaturePad from "./SignaturePad";

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
  canvasRef,
  signatureHandlers,
  onClearSignature,
  isGenerating,
  officer,
  onLogout,
  onOpenAccount,
  onOpenRecords,
}) {
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
            <div className="session-actions">
              <button
                type="button"
                className="logout-btn"
                onClick={onOpenRecords}
              >
                Records
              </button>
              <button
                type="button"
                className="logout-btn"
                onClick={onOpenAccount}
              >
                Account
              </button>
              <button type="button" className="logout-btn" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      <form id="ackForm" noValidate onSubmit={handleSubmit}>
        <EmployeeDetails formData={formData} onChange={onChange} />

        <SignaturePad
          canvasRef={canvasRef}
          handlers={signatureHandlers}
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
