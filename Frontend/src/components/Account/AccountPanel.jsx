import { useEffect, useState } from "react";
import {
  changePassword,
  fetchUsers,
  adminAddOfficer,
  adminRemoveUser,
} from "../../utils/api";

/**
 * AccountPanel — A modal dialog opened from the session bar.
 *
 * Every logged-in user can change their own password here.
 * Admins additionally get an "RA officers" section to assign new
 * officers (a default password is generated) and revoke access.
 */
export default function AccountPanel({ officer, onClose }) {
  const isAdmin = officer?.role === "admin";

  /* ---- change own password ---- */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwMessage({ type: "success", text: "Password updated" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwMessage({ type: "error", text: err.message });
    } finally {
      setPwBusy(false);
    }
  };

  /* ---- admin: RA officer management ---- */
  const [users, setUsers] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adminMessage, setAdminMessage] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);

  const loadUsers = () => {
    fetchUsers()
      .then(setUsers)
      .catch((err) => setAdminMessage({ type: "error", text: err.message }));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    setAdminMessage(null);
    setAdminBusy(true);
    try {
      const { defaultPassword } = await adminAddOfficer(
        newEmail.trim(),
        newName.trim()
      );
      setAdminMessage({
        type: "success",
        text: `Officer added. Default password: ${defaultPassword}`,
      });
      setNewName("");
      setNewEmail("");
      loadUsers();
    } catch (err) {
      setAdminMessage({ type: "error", text: err.message });
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRemove = async (username) => {
    if (!window.confirm(`Revoke access for ${username}?`)) return;
    setAdminMessage(null);
    try {
      await adminRemoveUser(username);
      setAdminMessage({ type: "success", text: `Removed ${username}` });
      loadUsers();
    } catch (err) {
      setAdminMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Account</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="account-meta">
          <span className="account-name">{officer.label}</span>
          <span className={`role-badge ${isAdmin ? "role-admin" : ""}`}>
            {officer.role}
          </span>
        </div>

        {/* Change own password */}
        <form className="account-section" onSubmit={handleChangePassword}>
          <h3>Change password</h3>
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {pwMessage && (
            <div className={`account-msg ${pwMessage.type}`}>
              {pwMessage.text}
            </div>
          )}
          <button type="submit" className="primary-btn" disabled={pwBusy}>
            {pwBusy ? "Saving…" : "Update password"}
          </button>
        </form>

        {/* Admin-only: RA officer management */}
        {isAdmin && (
          <div className="account-section admin-section">
            <h3>Admin · RA officers</h3>

            <form className="officer-add" onSubmit={handleAddOfficer}>
              <div className="field">
                <label htmlFor="newName">Officer name</label>
                <input
                  type="text"
                  id="newName"
                  placeholder="Surname, Firstname"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="newEmail">Email</label>
                <input
                  type="email"
                  id="newEmail"
                  placeholder="firstname.lastname@vwgds.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="primary-btn" disabled={adminBusy}>
                {adminBusy ? "Assigning…" : "Assign officer"}
              </button>
              <p className="field-hint">
                A login is created with the default password{" "}
                <code>vwgds@12345</code>.
              </p>
            </form>

            {adminMessage && (
              <div className={`account-msg ${adminMessage.type}`}>
                {adminMessage.text}
              </div>
            )}

            <ul className="officer-list">
              {users.map((u) => (
                <li key={u.username} className="officer-row">
                  <div className="officer-info">
                    <span className="officer-name">{u.label}</span>
                    <span className="officer-email">{u.username}</span>
                  </div>
                  {u.role === "admin" ? (
                    <span className="role-badge role-admin">admin</span>
                  ) : (
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemove(u.username)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
