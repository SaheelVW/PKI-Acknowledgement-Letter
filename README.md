# PKI Card Acknowledgment System

A full-stack web application for managing PKI (Public Key Infrastructure) smart card issuance. RA officers can look up employees, capture a digital signature on a fullscreen signature pad, generate a signed acknowledgment letter as a PDF, and save it directly to a shared network location — all from a single browser-based interface.

## Features

- **Employee auto-fill** — Enter an employee ID and the name and location are populated automatically from SuccessFactors.
- **Fullscreen digital signature** — The signature pad opens in fullscreen mode so physical signature pad devices can use the entire screen. The captured signature is cropped and embedded into the letter.
- **Live letter preview** — The acknowledgment letter updates in real time as form fields change.
- **PDF generation & network save** — Generates a high-quality A4 PDF and saves it directly to a configured shared network path on the server machine, accessible to all authorised users on the local network.
- **Signed records lookup** — Search for any employee by ID to see a table of all their previously signed letters, each accessible as a clickable link.
- **Secure login** — JWT-based authentication with role-based access (RA Officer / Admin).
- **Admin panel** — Admins can add or remove RA officer accounts and reset passwords.
- **Random GID generation** — A unique 16-character alphanumeric GID is generated for each session.

## Data Pipeline

```
SuccessFactors (central HR platform)
        │
        ▼
  REST API call (OAuth 2.0)
        │
        ▼
  Backend fetches employee data
  { employeeId, name, location }
        │
        ▼
  Cached in-memory on the server
  (auto-refreshes every 5 minutes)
        │
        ▼
  React app fetches from /api/employees
  → powers the Employee ID auto-fill
```

Employee data (name, employee ID, location) is sourced live from **SuccessFactors** via its OData API using OAuth 2.0 client credentials. The backend caches the result and refreshes it automatically, so the data stays current without restarting the server.

## PDF Storage

Signed acknowledgment letters are saved as PDF files to a **shared network path** configured on the server machine (e.g. a mapped drive or UNC path on the local network). The path is set via the `PDF_SAVE_FOLDER` environment variable. All authorised users on the network can access the folder directly, and the Records page in the app lets officers look up and open any saved letter without leaving the browser.

## Tech Stack

### Frontend
- **React 18** — UI library
- **Vite 5** — Build tool and dev server
- **html2canvas** — DOM-to-canvas rendering for PDF generation
- **jsPDF** — Client-side PDF creation

### Backend
- **Node.js / Express** — REST API server
- **jsonwebtoken** — JWT-based authentication
- **xlsx** — Fallback Excel parsing (used during SuccessFactors migration)
- **dotenv** — Environment configuration

## Project Structure

```
project/
├── Backend/
│   ├── server.js                  # Main entry point — mounts routes, starts server
│   ├── config.js                  # Centralised environment config & constants
│   ├── users.js                   # Credential store (hashed passwords, user management)
│   ├── admins.js                  # Bootstrap admin accounts
│   ├── raOfficers.js              # Seed data for RA officer accounts
│   ├── middleware/
│   │   └── auth.js                # JWT auth middleware & admin-only guard
│   ├── routes/
│   │   ├── authRoutes.js          # POST /login, /change-password
│   │   ├── adminRoutes.js         # Admin user management
│   │   ├── employeeRoutes.js      # GET /employees, /health
│   │   └── letterRoutes.js        # GET /letters, /letters/file, POST /save-pdf
│   ├── services/
│   │   ├── employeeService.js     # SuccessFactors fetch, caching, auto-refresh
│   │   └── letterService.js       # PDF list, open, and save logic
│   └── data/
│       └── users.json             # Runtime user store (seeded on first run)
│
└── Frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                # Root component — state, PDF generation
        ├── main.jsx               # React entry point
        ├── components/
        │   ├── FormPanel/
        │   │   ├── FormPanel.jsx        # Left sidebar with hamburger menu
        │   │   ├── EmployeeDetails.jsx  # Employee info fields
        │   │   ├── SignaturePad.jsx     # Signature launch button & preview
        │   │   └── SignatureModal.jsx   # Fullscreen drawing surface
        │   ├── LetterPreview/
        │   │   ├── LetterPreview.jsx    # Preview wrapper
        │   │   └── LetterTemplate.jsx   # Acknowledgment letter layout
        │   ├── Records/
        │   │   └── RecordsPanel.jsx     # Signed letters lookup by employee ID
        │   ├── Account/
        │   │   └── AccountPanel.jsx     # Change password / account settings
        │   └── Login/
        │       └── Login.jsx            # Login screen
        ├── hooks/
        │   └── useSignaturePad.js       # Holds captured signature state
        ├── styles/
        │   └── app.css                  # Application styles
        └── utils/
            ├── api.js                   # Typed API client (auth, employees, letters)
            └── helpers.js               # GID generation, date formatting
```

## Environment Variables

Create a `.env` file in the `Backend/` folder:

```env
# Server
PORT=4000
HOST=127.0.0.1
JWT_SECRET=your-secret-here
TOKEN_EXPIRY=8h

# Employee data — SuccessFactors OAuth 2.0
SF_CLIENT_ID=your_client_id
SF_CLIENT_SECRET=your_client_secret
SF_API_URL=https://api.successfactors.eu
SF_ODATA_RESOURCE=/odata/v2/Employee
SF_COMPANY_ID=your_company_id

# How often to refresh the employee cache (ms). Default: 5 minutes.
EMPLOYEE_REFRESH_INTERVAL_MS=300000

# Shared network path where signed PDFs are saved
# Windows UNC example:  \\SERVER\PKI-Letters
# Mapped drive example: Z:\PKI-Letters
PDF_SAVE_FOLDER=\\\\SERVER\\PKI-Letters
```

## Getting Started

### Prerequisites

- Node.js 18+
- Access to the SuccessFactors API (OAuth credentials from your IT/admin team)
- A shared network folder writable by the server process

### Installation

```bash
# Backend
cd Backend
npm install

# Frontend
cd ../Frontend
npm install
```

### Development

```bash
# Terminal 1 — Backend
cd Backend
npm run dev

# Terminal 2 — Frontend
cd Frontend
npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:4000`.

### Production Build

```bash
cd Frontend
npm run build
```

## Usage

1. Log in with your RA officer or admin credentials.
2. Enter an **Employee ID** — name and location auto-fill from SuccessFactors.
3. Select the **letter type** (Regular / Soft Token), location, and confirm the date.
4. Tap the **signature area** — the pad opens fullscreen for the physical signature device.
5. Sign, then tap **Done** — the signature is captured and shown in the letter preview.
6. Click **Save PDF** — the letter is generated and saved to the shared network folder.
7. Use the **Records** page (hamburger menu → Records) to look up all signed letters for any employee.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | — | Authenticate and receive a JWT |
| POST | `/api/change-password` | Officer | Change own password |
| GET | `/api/employees` | Officer | Fetch employee list from SuccessFactors |
| GET | `/api/health` | — | Server health + employee cache status |
| GET | `/api/letters` | Officer | List saved PDFs, filter by employee ID |
| GET | `/api/letters/file` | Officer | Stream a saved PDF |
| POST | `/api/save-pdf` | Officer | Save a generated PDF to the network folder |
| GET | `/api/admin/users` | Admin | List all app users |
| POST | `/api/admin/users` | Admin | Create a new RA officer account |
| DELETE | `/api/admin/users` | Admin | Remove a user's access |
| POST | `/api/admin/users/reset-password` | Admin | Reset another user's password |

