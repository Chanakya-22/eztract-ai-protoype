<div align="center">

```
███████╗███████╗████████╗██████╗  █████╗  ██████╗████████╗
██╔════╝╚══███╔╝╚══██╔══╝██╔══██╗██╔══██╗██╔════╝╚══██╔══╝
█████╗    ███╔╝    ██║   ██████╔╝███████║██║        ██║   
██╔══╝   ███╔╝     ██║   ██╔══██╗██╔══██║██║        ██║   
███████╗███████╗   ██║   ██║  ██║██║  ██║╚██████╗   ██║   
╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝   ╚═╝   
```

**AI-Powered Real Estate Plot Management**

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)

*Draw. Predict. Register. — All in one canvas.*

</div>

---

## What is this?

EZTract is a prototype admin tool for digitizing real estate layouts. Admins draw plot boundaries directly on a map image, get instant AI-driven price predictions, and register buyer details — all stored live in a cloud database.

Built for **Kumaran Nagar Layout** as a proof of concept.

---

## Features

```
┌─────────────────────────────────────────────────┐
│    Interactive canvas — draw plot boundaries   │
│    AI price prediction from plot dimensions    │
│    Live sync with Supabase (PostgreSQL)        │
│    Plot registry with status tracking          │
│    Click any plot to view full details         │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Konva.js, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy, Python 3.12 |
| Database | Supabase (PostgreSQL) |
| AI Logic | Spatial pricing engine (pixel → feet conversion) |

---

## Getting Started

**Prerequisites** — Python 3.12+, Node.js 18+, a Supabase project

### 1 · Backend

```bash
cd backend
python -m venv myvenv
myvenv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://postgres.[project-id]:[password]@[pooler-host]:5432/postgres
```

```bash
uvicorn app.main:app --reload
# → running on http://127.0.0.1:8000
```

### 2 · Frontend

```bash
cd frontend
npm install
npm run dev
# → running on http://localhost:3000
```

---

## How It Works

```
  Draw rectangle        AI calculates           Register &
  on layout map   →    dimensions + price   →   save to DB
       ↓                      ↓                     ↓
  Konva canvas         FastAPI endpoint        Supabase table
```

The AI engine converts pixel dimensions to real-world feet using a calibrated ratio, applies a base rate of ₹1,200/sqft, and adds premiums for large or wide-frontage plots.

---

## Project Structure

```
eztract-ai-prototype/
├── backend/
│   └── app/
│       ├── main.py        ← API routes + AI logic
│       ├── models.py      ← SQLAlchemy ORM models
│       ├── schemas.py     ← Pydantic request/response schemas
│       └── database.py    ← Supabase connection
└── frontend/
    └── src/
        ├── app/
        │   └── page.js    ← Main dashboard
        ├── components/
        │   └── PlotCanvas.js  ← Interactive map canvas
        └── services/
            └── api.js     ← Backend API calls
```

---

## Plot Status

| Status | Meaning |
|---|---|
| 🟢 Available | Open for booking |
| 🟡 Booked | Reserved, pending completion |
| 🔴 Sold | Completed transaction |

---

<div align="center">

Built by [Chanakya-22](https://github.com/Chanakya-22) · Prototype · 2026

</div>
