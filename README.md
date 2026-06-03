# Parametrix AI — Cabinet Cut-List Generator

A parametric cabinet design tool that calculates precise cut dimensions for frameless cabinet boxes.

## Architecture

```
parametrix-ai/
├── backend/     # FastAPI (Python) — parametric math engine
└── frontend/    # Next.js — interactive configurator UI
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API

`POST /api/calculate-cuts`

```json
{
  "width": 24.0,
  "height": 36.0,
  "depth": 24.0,
  "material_thickness": 0.75
}
```
