import { formatDate } from "../../utils/helpers";

/**
 * LetterTemplate — The acknowledgment letter content.
 *
 * ✅ Original: template.js (LETTER_TEMPLATE HTML string)
 * ✅ Converted to a React component with props instead of data-preview attributes.
 *
 * Key changes:
 * - data-preview="..." placeholders replaced with React props
 * - dangerouslySetInnerHTML removed — uses JSX directly
 * - signatureDataURL rendered as an <img> when available
 */
export default function LetterTemplate({
  empName,
  empId,
  gid,
  raOfficer,
  sessionLocation,
  sessionDate,
  signatureDataURL,
}) {
  // Split RA officer value into name line and email line
  const raLines = (raOfficer || "").split("\n");
  const raName = raLines[0] || "";
  const raEmail = raLines[1] || "";

  const placeDate = `${sessionLocation || "[Location]"}, ${formatDate(sessionDate)}`;

  return (
    <div className="outer-border">
      <div className="content-area">
        {/* ── TITLE ── */}
        <div className="title">Acknowledgement of Receipt</div>

        <div className="subtitle">
          for {empName || "[Employee Name]"} / Volkswagen Group Digital Solutions
          India Pvt. Ltd.
        </div>

        <div className="divider"></div>

        {/* ── INFO BOX ── */}
        <div className="inner-box">
          <div className="row">
            <div className="label">Name of applicant:</div>
            <div className="content">
              <div className="triple">
                <div>
                  <span>{empName || "[Employee Name]"}</span>
                </div>
                <div>
                  <span>{empId || "[Employee ID]"}</span>
                </div>
                <div>
                  <span>{gid || "[GID]"}</span>
                </div>
              </div>
              <div className="triple-labels">
                <div>name</div>
                <div>employee number</div>
                <div>GID</div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="label">Name of proxy:</div>
            <div className="content">
              <div className="triple">
                <div></div>
                <div></div>
                <div></div>
              </div>
              <div className="triple-labels">
                <div>name</div>
                <div>employee number</div>
                <div></div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="label">RA officer:</div>
            <div className="content">
              <div className="ra-text">
                <div>{raName || "[RA Officer]"}</div>
                <div className="ra-email">{raEmail}</div>
              </div>
              <div className="single-line"></div>
            </div>
          </div>
        </div>

        {/* ── PARAGRAPHS ── */}
        <div className="paragraph">
          This acknowledgement is used to verify the handing over of the
          Volkswagen PKI card and the corresponding PIN letter to the applicant
          or his/her proxy. For the purpose of auditing the signed document will
          be archived at the registration authority, the trust center, or at an
          agency instructed by the operator of the certificate authority.
        </div>

        <div className="paragraph">
          Remarks concerning data protection:
        </div>

        <div className="paragraph">
          The personal data in the VCD (date, name, and location of birth, GID,
          email address, UPN) are collected and used in order to create and
          administer PKI cards and the related certificates. The certificates –
          containing the owner's name, GID, certificate serial number, email
          address, and the UPN – are published to anyone in the Volkswagen
          Intranet.
        </div>

        <div className="paragraph">
          More information about data privacy:
          <br />
          https://datenschutz.volkswagen.de/?lang=en
        </div>

        <div className="paragraph">
          I have read and taken note of the "Reference sheet for the Volkswagen
          PKI Card handling". Internally in the Volkswagen Group the electronic
          signature created a Volkswagen PKI Card can be considered equivalent to
          a manual signature. So the PKI card and the PIN letter must be handled
          with special attention. It is not allowed to forward the card or to
          make the PINs known to someone else. I confirm the receipt of the PKI
          Card and the PIN letter.
        </div>

        {/* ── SIGNATURE ── */}
        <div className="signature-section">
          <div className="signature-line">
            <div className="signature-left">{placeDate}</div>
            {signatureDataURL && (
              <img
                id="signaturePreview"
                src={signatureDataURL}
                alt="Signature"
                style={{ display: "block" }}
              />
            )}
          </div>
          <div className="signature-labels">
            <div>place, date</div>
            <div>signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
