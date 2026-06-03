"""
Parametrix AI — FastAPI Backend
Deterministic parametric math engine for frameless cabinet cut-list generation.
"""

import json
import math
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field, field_validator

# Load .env from the backend directory (safe no-op if the file doesn't exist)
load_dotenv()

# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Parametrix AI",
    description="Parametric cabinet cut-list generator API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq client — reads GROQ_API_KEY from environment / .env
_groq_client: Groq | None = None

def _get_groq() -> Groq:
    """Lazy-initialise the Groq client so the app starts even without a key."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="GROQ_API_KEY not set. Add it to backend/.env and restart.",
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class CabinetInput(BaseModel):
    """Input payload for cabinet cut-list calculation."""

    width: float = Field(
        ...,
        gt=0,
        le=120.0,
        description="Finished exterior width of the cabinet in inches",
        examples=[24.0],
    )
    height: float = Field(
        ...,
        gt=0,
        le=120.0,
        description="Finished exterior height of the cabinet in inches",
        examples=[36.0],
    )
    depth: float = Field(
        ...,
        gt=0,
        le=60.0,
        description="Finished exterior depth of the cabinet in inches",
        examples=[24.0],
    )
    material_thickness: float = Field(
        ...,
        description="Sheet material thickness in inches (0.5, 0.75, or 1.0)",
        examples=[0.75],
    )

    @field_validator("material_thickness")
    @classmethod
    def validate_thickness(cls, v: float) -> float:
        allowed = {0.5, 0.75, 1.0}
        if round(v, 4) not in allowed:
            raise ValueError(
                f"material_thickness must be one of {sorted(allowed)}, got {v}"
            )
        return round(v, 4)

    @field_validator("width")
    @classmethod
    def validate_width_gt_thickness(cls, v: float) -> float:
        return round(v, 4)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "width": 24.0,
                    "height": 36.0,
                    "depth": 24.0,
                    "material_thickness": 0.75,
                }
            ]
        }
    }


class PanelDimension(BaseModel):
    """Width × Height dimension for a single panel."""
    width: float = Field(..., description="Panel width in inches")
    height: float = Field(..., description="Panel height in inches")
    label: str = Field(..., description="Human-readable dimension string")


class DoorDimension(BaseModel):
    """Width × Height dimension for a door leaf."""
    width: float = Field(..., description="Door width in inches")
    height: float = Field(..., description="Door height in inches")
    label: str = Field(..., description="Human-readable dimension string")
    reveal_gap: float = Field(..., description="Reveal gap applied per side in inches")


class CutListResponse(BaseModel):
    """Fully structured cut-list for a frameless cabinet box."""

    # Input echo
    input: CabinetInput

    # Construction notes
    construction_notes: list[str]

    # Cut list components
    side_panels: list[PanelDimension] = Field(
        ...,
        description="2× Side Panels (left and right)",
    )
    bottom_panel: PanelDimension = Field(
        ...,
        description="1× Bottom Panel (dado-mounted or butt-joined)",
    )
    top_stretchers: list[PanelDimension] = Field(
        ...,
        description="2× Top Stretchers (front and rear nailers)",
    )
    doors: list[DoorDimension] = Field(
        ...,
        description="2× Door Leaves (full-overlay, frameless)",
    )

    # Summary
    summary: dict[str, int | float] = Field(
        ...,
        description="Quick stats about the cut-list",
    )


# ─── Models: /api/parse-design ─────────────────────────────────────────────────

class ParseDesignRequest(BaseModel):
    """Natural-language cabinet description to parse with Groq."""
    description: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Free-text cabinet description, e.g. '36 inch wide base cabinet, 30 tall, 21 deep'",
        examples=["I need a 36 wide by 30 tall base cabinet, 21 inches deep"],
    )
    material_thickness: float = Field(
        default=0.75,
        description="Sheet material thickness in inches (0.5, 0.75, or 1.0)",
    )

    @field_validator("material_thickness")
    @classmethod
    def validate_thickness(cls, v: float) -> float:
        allowed = {0.5, 0.75, 1.0}
        if round(v, 4) not in allowed:
            raise ValueError(f"material_thickness must be one of {sorted(allowed)}, got {v}")
        return round(v, 4)


class ParsedSpecs(BaseModel):
    """Dimensions extracted by Groq from natural-language input."""
    width:  float = Field(..., description="Exterior width in inches")
    height: float = Field(..., description="Exterior height in inches")
    depth:  float = Field(..., description="Exterior depth in inches")
    confidence: str = Field(
        default="high",
        description="Groq's self-reported confidence: high | medium | low"
    )
    raw_groq_text: str = Field(..., description="Exact text returned by Groq before JSON parsing")


class ParseDesignResponse(BaseModel):
    """Combined Groq parse + parametric cut-list in one response."""
    parsed_specs:          ParsedSpecs   = Field(..., description="Dimensions extracted by Groq")
    manufacturing_cut_list: dict         = Field(..., description="Full parametric cut-list")


# ─── Parametric Math Engine ───────────────────────────────────────────────────

DOOR_REVEAL_GAP: float = 0.0625   # 1/16 inch per side (full-overlay frameless)
STRETCHER_HEIGHT: float = 3.0      # Standard nailer height in inches
DOOR_GAP_CENTER: float = 0.125    # 1/8 inch gap between double doors


def calculate_cabinet_cuts(
    exterior_width: float,
    exterior_height: float,
    exterior_depth: float,
    thickness: float = 0.75,
) -> dict:
    """
    Standalone parametric math function \u2014 returns a plain dict.

    Called by /api/parse-design after Groq resolves natural-language dimensions.
    Same math as calculate_cut_list(); kept separate so the route can pass raw
    floats without constructing a CabinetInput Pydantic model.

    Components calculated:
      \u2022 2\u00d7 Side Panels    \u2014 full height \u00d7 full depth
      \u2022 1\u00d7 Bottom Panel   \u2014 (width - 2t) \u00d7 depth
      \u2022 2\u00d7 Top Stretchers \u2014 (width - 2t) \u00d7 4"
      \u2022 2\u00d7 Doors          \u2014 full-overlay frameless, 1/16" reveal per edge
    """
    W, H, D, t = exterior_width, exterior_height, exterior_depth, thickness
    STRETCHER_W = 4.0  # 4-inch nailer as specified

    # Side Panels (2\u00d7)
    side_w = round(D, 4)
    side_h = round(H, 4)

    # Bottom Panel (1\u00d7): spans between the two side panels
    bottom_w = round(W - 2 * t, 4)
    bottom_h = round(D, 4)

    # Top Stretchers (2\u00d7): same width as bottom, 4" tall
    stretcher_w = round(W - 2 * t, 4)
    stretcher_h = round(STRETCHER_W, 4)

    # Doors (2\u00d7 leaves): full-overlay with 1/16" reveal each exposed edge
    door_h = round(H - DOOR_REVEAL_GAP * 2, 4)
    door_w = round((W - DOOR_GAP_CENTER - DOOR_REVEAL_GAP * 2) / 2, 4)

    return {
        "inputs": {
            "exterior_width":  W,
            "exterior_height": H,
            "exterior_depth":  D,
            "material_thickness": t,
        },
        "side_panels": {
            "quantity": 2,
            "width_in":  side_w,
            "height_in": side_h,
            "label": f"{_fmt(side_w)} W \u00d7 {_fmt(side_h)} H",
        },
        "bottom_panel": {
            "quantity": 1,
            "width_in":  bottom_w,
            "height_in": bottom_h,
            "label": f"{_fmt(bottom_w)} W \u00d7 {_fmt(bottom_h)} H",
        },
        "top_stretchers": {
            "quantity": 2,
            "width_in":  stretcher_w,
            "height_in": stretcher_h,
            "label": f"{_fmt(stretcher_w)} W \u00d7 {_fmt(stretcher_h)} H",
            "note": "4\" nailer (front + rear)",
        },
        "doors": {
            "quantity": 2,
            "width_in":  door_w,
            "height_in": door_h,
            "label": f"{_fmt(door_w)} W \u00d7 {_fmt(door_h)} H",
            "reveal_gap_in": DOOR_REVEAL_GAP,
        },
        "summary": {
            "total_parts":       7,
            "sheet_area_sq_ft":  round(
                (2 * side_w * side_h + bottom_w * bottom_h
                 + 2 * stretcher_w * stretcher_h + 2 * door_w * door_h) / 144,
                2,
            ),
            "sheets_needed_4x8": math.ceil(
                (2 * side_w * side_h + bottom_w * bottom_h
                 + 2 * stretcher_w * stretcher_h + 2 * door_w * door_h) / 144 / 32
            ),
        },
    }



def _fmt(value: float) -> str:
    """Format a float to a clean fractional-looking string for labels."""
    # Round to nearest 1/32 inch for display
    rounded = round(value * 32) / 32
    whole = int(rounded)
    frac = rounded - whole
    if frac == 0:
        return f'{whole}"'
    # Express as fraction
    frac_map = {
        0.03125: "1/32", 0.0625: "1/16", 0.09375: "3/32",
        0.125: "1/8", 0.15625: "5/32", 0.1875: "3/16",
        0.21875: "7/32", 0.25: "1/4", 0.28125: "9/32",
        0.3125: "5/16", 0.34375: "11/32", 0.375: "3/8",
        0.40625: "13/32", 0.4375: "7/16", 0.46875: "15/32",
        0.5: "1/2", 0.53125: "17/32", 0.5625: "9/16",
        0.59375: "19/32", 0.625: "5/8", 0.65625: "21/32",
        0.6875: "11/16", 0.71875: "23/32", 0.75: "3/4",
        0.78125: "25/32", 0.8125: "13/16", 0.84375: "27/32",
        0.875: "7/8", 0.90625: "29/32", 0.9375: "15/16",
        0.96875: "31/32",
    }
    frac_str = frac_map.get(round(frac, 5), f"{frac:.4f}")
    return f'{whole} {frac_str}"' if whole else f'{frac_str}"'


def calculate_cut_list(inp: CabinetInput) -> CutListResponse:
    """
    Deterministic parametric math for a frameless (European-style) cabinet box.

    Construction assumptions:
      - Full-overlay doors with 1/16" reveal per exposed edge
      - Top is open (nailers only); bottom is captured between sides
      - Side panels run full height (top to bottom)
      - Bottom panel spans between the two sides (width reduced by 2× thickness)
      - Stretchers span between the two sides at the very top
      - Door pair covers full opening minus center gap and reveal gaps
    """
    t = inp.material_thickness
    W = inp.width
    H = inp.height
    D = inp.depth

    # ── Side Panels (2×) ──────────────────────────────────────────────────
    # Full height, full depth
    side_h = round(H, 4)
    side_w = round(D, 4)

    side_panels = [
        PanelDimension(
            width=side_w,
            height=side_h,
            label=f"{_fmt(side_w)} W × {_fmt(side_h)} H",
        )
        for _ in range(2)
    ]

    # ── Bottom Panel (1×) ─────────────────────────────────────────────────
    # Width = exterior width minus both side thicknesses (dado or butt-join)
    bottom_w = round(W - (2 * t), 4)
    bottom_h = round(D, 4)

    bottom_panel = PanelDimension(
        width=bottom_w,
        height=bottom_h,
        label=f"{_fmt(bottom_w)} W × {_fmt(bottom_h)} H",
    )

    # ── Top Stretchers / Nailers (2×) ────────────────────────────────────
    # Same width as bottom panel, standard height
    stretcher_w = round(W - (2 * t), 4)
    stretcher_h = round(STRETCHER_HEIGHT, 4)

    top_stretchers = [
        PanelDimension(
            width=stretcher_w,
            height=stretcher_h,
            label=f"{_fmt(stretcher_w)} W × {_fmt(stretcher_h)} H",
        )
        for _ in range(2)
    ]

    # ── Doors (2× leaves, full-overlay frameless) ─────────────────────────
    # Door height = cabinet height + (reveal_gap top and bottom)
    #   Full overlay: door extends REVEAL_GAP beyond opening on each side
    #   Opening height = H - bottom_thickness (bottom panel is inset)
    #   For simplicity, door covers full H + reveal on top, - reveal on bottom
    #   Standard frameless calculation:
    #     door_height = H + (DOOR_REVEAL_GAP * 2)  ... but we keep it flush
    #   Industry standard: door_height = H - (DOOR_REVEAL_GAP * 2)
    #   (gap top = REVEAL_GAP, gap bottom = REVEAL_GAP)
    door_h = round(H - (DOOR_REVEAL_GAP * 2), 4)

    # Door width (each leaf):
    # Full opening width = W
    # Subtract center gap and reveal gaps on both outside edges
    # Each door = (W - center_gap - 2 * reveal_side) / 2
    door_w_each = round((W - DOOR_GAP_CENTER - (DOOR_REVEAL_GAP * 2)) / 2, 4)

    doors = [
        DoorDimension(
            width=door_w_each,
            height=door_h,
            label=f"{_fmt(door_w_each)} W × {_fmt(door_h)} H",
            reveal_gap=DOOR_REVEAL_GAP,
        )
        for _ in range(2)
    ]

    # ── Construction Notes ────────────────────────────────────────────────
    notes = [
        f"Material thickness: {_fmt(t)} sheet goods",
        f"Construction: Full-overlay frameless (European-style) box",
        f"Door reveal: {_fmt(DOOR_REVEAL_GAP)} per exposed edge",
        f"Door gap (center): {_fmt(DOOR_GAP_CENTER)} between leaves",
        f"Stretcher height: {_fmt(STRETCHER_HEIGHT)} (front + rear nailers)",
        "Grain direction: Height of panel runs vertically unless noted",
        "Hardware: Concealed cup hinges, 6-way adjustable",
        "Fasteners: Confirm pocket-screw spacing before assembly",
    ]

    # ── Summary ───────────────────────────────────────────────────────────
    total_parts = 2 + 1 + 2 + 2  # sides + bottom + stretchers + doors
    # Rough sheet area in square feet
    area_sides = 2 * (side_w * side_h)
    area_bottom = bottom_w * bottom_h
    area_stretchers = 2 * (stretcher_w * stretcher_h)
    area_doors = 2 * (door_w_each * door_h)
    total_sq_in = area_sides + area_bottom + area_stretchers + area_doors
    total_sq_ft = round(total_sq_in / 144, 2)

    summary = {
        "total_parts": total_parts,
        "sheet_area_sq_ft": total_sq_ft,
        "sheets_needed_4x8": math.ceil(total_sq_ft / 32),
        "door_reveal_gap_in": DOOR_REVEAL_GAP,
    }

    return CutListResponse(
        input=inp,
        construction_notes=notes,
        side_panels=side_panels,
        bottom_panel=bottom_panel,
        top_stretchers=top_stretchers,
        doors=doors,
        summary=summary,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "Parametrix AI", "version": "1.0.0"}


@app.post(
    "/api/calculate-cuts",
    response_model=CutListResponse,
    tags=["Cabinet"],
    summary="Generate parametric cut-list for a frameless cabinet box",
)
async def calculate_cuts(payload: CabinetInput) -> CutListResponse:
    """
    Calculate the exact cut dimensions for a frameless cabinet box.

    Returns 2 Side Panels, 1 Bottom Panel, 2 Top Stretchers, and 2 Doors
    based on the provided exterior dimensions and material thickness.
    """
    try:
        return calculate_cut_list(payload)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")


# ─── Route: /api/parse-design ──────────────────────────────────────────────────

_GROQ_SYSTEM_PROMPT = """\
You are a precision woodworking assistant. Your only job is to extract cabinet
dimensions from the user's natural-language description.

Always respond with ONLY a valid JSON object — no prose, no markdown fences.

Required fields:
  width   — exterior cabinet width  in inches (float)
  height  — exterior cabinet height in inches (float)
  depth   — exterior cabinet depth  in inches (float)
  confidence — your certainty: "high", "medium", or "low"

Rules:
- Convert feet to inches (1 foot = 12 inches).
- If a dimension is missing from the description, use the industry standard:
    width=24, height=34.5 (base) or 30 (wall), depth=24 (base) or 12 (wall).
- Round to the nearest 0.125 inch.
- Return confidence "low" if you had to guess more than one dimension.

Example output:
{"width": 36.0, "height": 30.0, "depth": 21.0, "confidence": "high"}
"""


@app.post(
    "/api/parse-design",
    response_model=ParseDesignResponse,
    tags=["AI Parser"],
    summary="Parse a natural-language cabinet description, then compute cut-list",
)
async def parse_design(payload: ParseDesignRequest) -> ParseDesignResponse:
    """
    Two-step pipeline:
      1. Groq LLM parses the free-text description → structured {width, height, depth}.
      2. Those values are fed into calculate_cabinet_cuts() → manufacturing_cut_list.

    Returns both parsed_specs and manufacturing_cut_list in a single JSON response.
    """
    # ── Step 1: Groq LLM parse ───────────────────────────────────────────
    groq = _get_groq()

    try:
        chat = groq.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": _GROQ_SYSTEM_PROMPT},
                {"role": "user",   "content": payload.description},
            ],
            temperature=0.0,      # deterministic — we want math, not creativity
            max_tokens=128,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}")

    raw_text = chat.choices[0].message.content or ""

    # ── Parse the JSON returned by Groq ─────────────────────────────────────
    try:
        groq_data: dict = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail=f"Groq returned non-JSON: {raw_text[:200]}",
        )

    # Validate required keys are numeric
    missing = [k for k in ("width", "height", "depth") if k not in groq_data]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Groq response missing required keys: {missing}. Got: {groq_data}",
        )

    try:
        w = float(groq_data["width"])
        h = float(groq_data["height"])
        d = float(groq_data["depth"])
        confidence = str(groq_data.get("confidence", "high"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Groq returned non-numeric dimension: {exc}")

    parsed_specs = ParsedSpecs(
        width=w,
        height=h,
        depth=d,
        confidence=confidence,
        raw_groq_text=raw_text,
    )

    # ── Step 2: Parametric math engine ────────────────────────────────────
    cut_list_dict = calculate_cabinet_cuts(
        exterior_width=w,
        exterior_height=h,
        exterior_depth=d,
        thickness=payload.material_thickness,
    )

    return ParseDesignResponse(
        parsed_specs=parsed_specs,
        manufacturing_cut_list=cut_list_dict,
    )
