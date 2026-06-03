"""
Parametrix AI — FastAPI Backend
Deterministic parametric math engine for frameless cabinet cut-list generation.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import math

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


# ─── Parametric Math Engine ───────────────────────────────────────────────────

DOOR_REVEAL_GAP: float = 0.0625   # 1/16 inch per side (full-overlay frameless)
STRETCHER_HEIGHT: float = 3.0      # Standard nailer height in inches
DOOR_GAP_CENTER: float = 0.125    # 1/8 inch gap between double doors


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
