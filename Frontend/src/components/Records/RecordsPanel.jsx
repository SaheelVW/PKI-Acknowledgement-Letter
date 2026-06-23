import { useState } from "react";
import { fetchLetters, openLetterFile } from "../../utils/api";

/**
 * RecordsPanel — Look up signed acknowledgment letters by employee ID.
 *
 * Enter an employee ID to see every saved PDF for that employee in a table
 * (employee ID, file, date). Files are streamed from the OneDrive-synced
 * folder on the server and opened in a new tab.
 */
export default function RecordsPanel({ officer, onBack, onLogout }) {
  const [empId, setEmpId] = useState("");
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    const id = empId.trim();
    if (!id) return;

    setLoading(true);
    setError("");
    setRows(null);
    try {
      const letters = await fetchLetters(id);
      setRows(letters);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (fileName) => {
    try {
      await openLetterFile(fileName);
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <aside className="form-panel records-panel">
      <div className="panel-header">
        <h1>Signed Letters Lookup</h1>
        {officer && (
          <div className="session-bar">
            <span className="session-user">{officer.label}</span>
            <div className="session-actions">
              <button type="button" className="logout-btn" onClick={onBack}>
                Back
              </button>
              <button type="button" className="logout-btn" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSearch} className="records-search">
        <label htmlFor="lookupEmpId">Employee ID</label>
        <div className="records-search-row">
          <input
            id="lookupEmpId"
            type="text"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            placeholder="Enter employee ID"
            autoComplete="off"
          />
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {error && <p className="records-error">{error}</p>}

      {rows && (
        <div className="records-results">
          <p className="records-count">
            {rows.length} signed letter{rows.length === 1 ? "" : "s"} found
            {empId.trim() ? ` for ${empId.trim()}` : ""}.
          </p>

          {rows.length > 0 && (
            <table className="records-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>File</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.fileName}>
                    <td>{row.empId}</td>
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => handleOpen(row.fileName)}
                        title="Open PDF"
                      >
                        {row.fileName}
                      </button>
                    </td>
                    <td>{formatDate(row.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </aside>
  );
}
