# FlushFit AI — CLAUDE.md

## Project Purpose

Custom cabinet design configurator for a cabinet-builder business.
The core value prop: **custom-sized cabinets at stock prices** ($3–5k retail, ~$1.5k to build).

Key problem being solved (see client photos): stock cabinets don't fit wall-to-wall, forcing ugly
filler pieces (quartz slabs, trim strips). FlushFit lets a customer enter their exact wall
dimensions, then auto-calculates perfectly-fitting cabinet sizes — no fillers needed.

---

## Architecture

```
parametrix-ai/
├── backend/          FastAPI (Python 3.10) — parametric math engine + Groq NLP
│   ├── main.py       All routes + models + math (single file for now)
│   ├── .env          GROQ_API_KEY (never commit)
│   └── requirements.txt
└── frontend/         Next.js 16 / React 19 / Tailwind 4 / TypeScript
    └── src/
        ├── app/
        │   ├── page.tsx            Main page (legacy Tailwind dashboard — semi-unused)
        │   └── layout.tsx
        ├── components/
        │   └── CabinetConfigurator.tsx  Primary UI component (use this)
        └── types/cabinet.ts        Shared API typedefs
```

---

## Running Locally

```bash
# Backend (port 8000)
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Frontend (port 3000)
cd frontend
npm run dev
```

CORS is already configured for localhost:3000 ↔ localhost:8000.

---

## Backend API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/api/calculate-cuts` | POST | Manual dims → cut list |
| `/api/parse-design` | POST | NLP text → Groq → dims → cut list |

### `/api/calculate-cuts` input
```json
{ "width": 24.0, "height": 36.0, "depth": 24.0, "material_thickness": 0.75 }
```

### `/api/parse-design` input
```json
{ "description": "36 inch wide base cabinet, 30 tall, 21 deep", "material_thickness": 0.75 }
```

Material thickness must be exactly `0.5`, `0.75`, or `1.0`.

---

## Cabinet Math Rules (Frameless / European-style)

These are hard constraints — never change without updating both backend math and frontend display:

- **Side panels** (2×): full exterior height × full exterior depth
- **Bottom panel** (1×): width `= exterior_width - (2 × material_thickness)`, depth = exterior depth
- **Top stretchers** (2×): same width as bottom panel, height = `3.0"` (nailer standard)
- **Doors** (2× leaves, full-overlay):
  - `door_height = exterior_height - (2 × 0.0625)"` (1/16" reveal per edge)
  - `door_width = (exterior_width - 0.125" center_gap - (2 × 0.0625)" reveal) / 2`
- Fraction display: `_fmt()` in `main.py` rounds to nearest 1/32" and returns fractional strings

---

## What's Built

- [x] Parametric cut-list math engine
- [x] Groq Llama3 NLP → dimension parsing
- [x] Manual dimension form + AI text form
- [x] SVG front-elevation schematic (proportional, annotated)
- [x] Quick presets (Base Cabinet, Wall Cabinet, Tall Pantry)
- [x] Construction notes, summary strip (parts, sq ft, sheets needed)

---

## What Needs to Be Built (Product Roadmap)

### Phase 1 — Style + Color Configurator
- Door style selector (Flat/Slab, Shaker, Chevron/V-groove, Glass-front)
- Cabinet finish/color picker (Navy, White, Gray, Black, Natural Wood, Custom)
- Hardware selector (handle style + finish: brushed gold, matte black, chrome)
- AI image generation: send style + color + dimensions to image gen API → render preview

### Phase 2 — Room Fitting Engine (Core Differentiator)
- Wall space input (total wall width, ceiling height, any obstacles: windows, doors, pipes)
- Multi-cabinet layout: how many cabinets fit, what sizes
- Auto-filler calculation: when space doesn't divide evenly, generate precise filler piece dims
- Base vs wall cabinet rows, corner units, tall pantry units
- 2D top-down floor plan view

### Phase 3 — Quote + Order Flow
- Itemized pricing (materials + labor estimate per cabinet)
- Customer saves/shares their design (URL or PDF)
- Order submission form → builder receives job sheet
- Admin dashboard: incoming orders with full cut lists + specs

### Phase 4 — Full 3D Visualization
- Three.js or Babylon.js real-time 3D cabinet render
- Configurable in-browser before ordering

---

## Key Business Rules

- Cabinets retail $3k–$5k; cost ~$500 materials + ~$1k labor = ~$1.5k cost
- Profit comes from custom sizing at no extra charge vs stock
- Builder needs: exact part dimensions, quantity, material type per order
- Customer needs: visualization (what will it look like), exact fit, simple ordering
- The "filler problem" in the client photos: 3" quartz pieces added to both sides because
  the stock cabinet was too narrow for the wall. FlushFit eliminates this by calculating
  exact custom sizes.

---

## Tech Notes

- Frontend: Next.js 16 has breaking changes vs earlier versions — read node_modules/next/dist/docs/ before modifying Next.js config
- AI model: Groq `llama3-8b-8192` with `temperature=0.0` and `response_format=json_object` for deterministic dimension parsing
- Tailwind 4 uses `@import "tailwindcss"` not the old `@tailwind base/components/utilities` syntax
- Backend is a single `main.py` — keep it that way until it genuinely outgrows one file
