/**
 * EmployeeDetails — The employee info form section.
 *
 * ✅ Original: <section class="form-section"> "Employee Details" in index.html
 * ✅ All inputs are controlled components driven by formData / onChange.
 *
 * Key changes:
 * - RA Officer is no longer selectable here — it defaults to the
 *   logged-in RA officer and is rendered directly on the letter.
 * - Each input fires onChange which the parent uses to update state.
 * - GID field is read-only (same as original).
 */
export default function EmployeeDetails({ formData, onChange }) {
  const handleChange = (e) => {
    onChange(e.target.id, e.target.value);
  };

  return (
    <section className="form-section">
      <h2>Employee Details</h2>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="empId">Employee ID</label>
          <input
            type="text"
            id="empId"
            required
            placeholder="Enter ID to auto-fill name & location"
            value={formData.empId}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="empName">Employee Name</label>
          <input
            type="text"
            id="empName"
            required
            value={formData.empName}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="gid">GID</label>
          <input
            type="text"
            id="gid"
            readOnly
            value={formData.gid}
          />
        </div>

        <div className="field">
          <label htmlFor="tokenType">Letter Type</label>
          <select
            id="tokenType"
            value={formData.tokenType || ""}
            onChange={handleChange}
          >
            <option value="">Regular</option>
            <option value="SOFT TOKEN">SOFT TOKEN</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="sessionLocation">Location</label>
          <select
            id="sessionLocation"
            required
            value={formData.sessionLocation}
            onChange={handleChange}
          >
            <option value="Pune">Pune</option>
            <option value="Gurgaon">Gurgaon</option>
            <option value="Bangalore">Bangalore</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="sessionDate">Date</label>
          <input
            type="date"
            id="sessionDate"
            required
            value={formData.sessionDate}
            onChange={handleChange}
          />
        </div>
      </div>
    </section>
  );
}
