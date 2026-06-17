# PKI Card Acknowledgment

A React-based web application for generating PKI (Public Key Infrastructure) card acknowledgment letters as PDF documents. Employees can fill in their details, sign digitally on a signature pad, preview the acknowledgment letter in real time, and save it as a PDF.

## Features

- **Employee auto-fill** — Enter an employee ID and the name/location are populated automatically from the database.
- **Digital signature pad** — Draw a signature directly in the browser using an HTML canvas.
- **Live letter preview** — The acknowledgment letter updates in real time as form fields change.
- **PDF export** — Generate a high-quality A4 PDF of the signed letter using html2canvas and jsPDF.
- **Random GID generation** — A 16-character alphanumeric GID is generated for each session.

## Data Pipeline

```
EMBARK (source system)
   │
   ▼
Excel files exported
   │
   ▼
Stored locally / on shared drive
   │
   ▼
Scheduled script triggers at a set time
   │
   ▼
Script reads Excel → inserts data into database
   │
   ▼
React app fetches employee data from database
```

1. **EMBARK** exports employee data in Excel format.
2. The Excel files are stored on a local machine or shared drive.
3. A **scheduled script** runs at a configured time, parses the Excel files, and inserts/updates records into the database.
4. The React application reads employee data from the database to power the auto-fill functionality.

## Tech Stack

- **React 18** — UI library
- **Vite 5** — Build tool and dev server
- **html2canvas** — DOM-to-canvas rendering for PDF generation
- **jsPDF** — Client-side PDF creation
- **xlsx** — Spreadsheet parsing (dev dependency)

## Project Structure

```
react-app/
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── App.jsx                  # Root component — state management & PDF generation
    ├── main.jsx                 # React entry point
    ├── components/
    │   ├── FormPanel/
    │   │   ├── FormPanel.jsx    # Left sidebar form container
    │   │   ├── EmployeeDetails.jsx  # Employee info fields
    │   │   └── SignaturePad.jsx # Canvas-based signature input
    │   └── LetterPreview/
    │       ├── LetterPreview.jsx    # Preview wrapper
    │       └── LetterTemplate.jsx   # Acknowledgment letter layout
    ├── hooks/
    │   └── useSignaturePad.js   # Custom hook for signature canvas logic
    ├── styles/
    │   └── app.css              # Application styles
    └── utils/
        ├── employees.js         # Employee dataset
        ├── helpers.js           # Utility functions (GID, date formatting)
        └── raOfficers.js        # RA officer list
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd react-app
npm install
```

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173` (default Vite port).

### Production Build

```bash
npm run build
npm run preview
```

## Usage

1. Enter an **Employee ID** — name and location auto-fill if the ID is found.
2. Select the **RA Officer** and confirm the session date/location.
3. Draw a **signature** on the canvas pad.
4. Review the live **letter preview** on the right.
5. Click **Save PDF** to download the acknowledgment as a PDF file.

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start Vite dev server with HMR     |
| `npm run build`   | Build for production                |
| `npm run preview` | Preview the production build locally|
