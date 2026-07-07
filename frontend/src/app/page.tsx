'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────────

type DoorStyle = 'wilmington' | 'laguna';
type CabinetFinish = 'white' | 'gray' | 'natural_wood';
type HardwareFinish = 'brushed_gold' | 'matte_black' | 'chrome';

interface ParsedSpecs {
  width: number;
  height: number;
  depth: number;
  confidence: string;
}

interface CutRow {
  quantity: number;
  width_in: number;
  height_in: number;
}

interface CutList {
  side_panels: CutRow;
  bottom_panel: CutRow;
  top_stretchers: CutRow;
  doors: CutRow;
}

interface DesignResult {
  specs: ParsedSpecs;
  cutList: CutList;
  imageUrl: string | null;
  doorStyle: DoorStyle;
  finish: CabinetFinish;
  hardware: HardwareFinish;
}

// ─── Static Config ────────────────────────────────────────────────────────────

const DOOR_STYLES: { id: DoorStyle; name: string; desc: string; price: string }[] = [
  { id: 'wilmington', name: 'Wilmington', desc: 'Classic inset panel', price: '$27.96/sq ft' },
  { id: 'laguna',     name: 'Laguna',     desc: 'Modern flat panel',   price: '$35.81/sq ft' },
];

const FINISHES: { id: CabinetFinish; name: string; hex: string; light?: boolean }[] = [
  { id: 'white',        name: 'White',        hex: '#EDE8E3', light: true },
  { id: 'gray',         name: 'Grey',         hex: '#8A9BB0' },
  { id: 'natural_wood', name: 'Natural Wood', hex: '#C49A6C' },
];

const HARDWARE: { id: HardwareFinish; name: string; hex: string; border?: boolean }[] = [
  { id: 'brushed_gold', name: 'Brushed Gold', hex: '#C9A84C' },
  { id: 'matte_black', name: 'Matte Black', hex: '#2A2A2A' },
  { id: 'chrome', name: 'Chrome', hex: '#B8BFC8', border: true },
];

// ─── Cabinet SVG Preview ─────────────────────────────────────────────────────

const FINISH_COLORS: Record<CabinetFinish, { fill: string; inner: string; edge: string; toeKick: string }> = {
  white:        { fill: '#EDE8E3', inner: '#D8D2C9', edge: '#BFB9B1', toeKick: '#CDCAC6' },
  gray:         { fill: '#8A9BB0', inner: '#7A8A9E', edge: '#5E6E82', toeKick: '#505E6A' },
  natural_wood: { fill: '#C49A6C', inner: '#B28658', edge: '#9A7044', toeKick: '#8A6038' },
};

const HW_COLORS: Record<HardwareFinish, { fill: string; stroke: string }> = {
  brushed_gold: { fill: '#C9A84C', stroke: '#9A7828' },
  matte_black:  { fill: '#1E1E1E', stroke: '#0A0A0A' },
  chrome:       { fill: '#C8CDD4', stroke: '#8A8F96' },
};

function CabinetSVGPreview({
  width, height, doorStyle, finish, hardware,
}: {
  width: number; height: number;
  doorStyle: DoorStyle; finish: CabinetFinish; hardware: HardwareFinish;
}) {
  const VW = 380;
  const aspectRatio = Math.min(Math.max(height / width, 0.7), 2.0);
  const VH = Math.round(VW * aspectRatio) + 20;

  const MX = 28, MY = 20;
  const DEPTH = 10;
  const TOE = 22;
  const cabW = VW - MX * 2 - DEPTH;
  const cabH = VH - MY * 2 - DEPTH;

  const REVEAL = 5;
  const GAP = 6;
  const doorH = cabH - TOE - REVEAL * 2;
  const doorW = (cabW - REVEAL * 2 - GAP) / 2;
  const d1X = MX + REVEAL;
  const d2X = d1X + doorW + GAP;
  const dY  = MY + REVEAL;

  const fc = FINISH_COLORS[finish] ?? FINISH_COLORS.white;
  const hw = HW_COLORS[hardware];

  // Hardware bar: vertical, 1/3 from the center-facing edge of each door
  const handleH = Math.min(doorH * 0.28, 55);
  const handleW = 4;
  const hY = dY + (doorH - handleH) / 2;
  const h1X = d1X + doorW - doorW * 0.25 - handleW / 2;  // left door: right side
  const h2X = d2X + doorW * 0.25 - handleW / 2;          // right door: left side

  const renderDoorFace = (x: number, y: number, w: number, h: number) => {
    // Finish overlay: natural wood = transparent (show raw photo),
    // white/grey = strong tint to simulate spray-painted finish
    const overlayOpacity = finish === 'natural_wood' ? 0.08 : 0.70;
    return (
      <g>
        <image href={`/doors/${doorStyle}.jpg`} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
        <rect x={x} y={y} width={w} height={h} fill={fc.fill} opacity={overlayOpacity} />
        {/* door edge outline */}
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={fc.edge} strokeWidth="0.8" opacity="0.5" />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width={VW} height={VH} fill="#0D1117" />

      {/* 3-D depth: right face */}
      <polygon
        points={`${MX+cabW},${MY} ${MX+cabW+DEPTH},${MY-DEPTH} ${MX+cabW+DEPTH},${MY+cabH-DEPTH} ${MX+cabW},${MY+cabH}`}
        fill="#1A1E26"
      />
      {/* 3-D depth: top face */}
      <polygon
        points={`${MX},${MY} ${MX+DEPTH},${MY-DEPTH} ${MX+cabW+DEPTH},${MY-DEPTH} ${MX+cabW},${MY}`}
        fill="#2A2E38"
      />

      {/* Cabinet carcass front */}
      <rect x={MX} y={MY} width={cabW} height={cabH} fill="#161B24" />

      {/* Toe kick recess */}
      <rect x={MX+8} y={MY+cabH-TOE+4} width={cabW-16} height={TOE-4} fill="#0A0D12" rx="1" />

      {/* Door faces */}
      {renderDoorFace(d1X, dY, doorW, doorH)}
      {renderDoorFace(d2X, dY, doorW, doorH)}

      {/* Door outlines */}
      <rect x={d1X} y={dY} width={doorW} height={doorH} fill="none" stroke={fc.edge} strokeWidth="0.75" opacity="0.7" />
      <rect x={d2X} y={dY} width={doorW} height={doorH} fill="none" stroke={fc.edge} strokeWidth="0.75" opacity="0.7" />

      {/* Hardware handles */}
      <rect x={h1X} y={hY} width={handleW} height={handleH} fill={hw.fill} stroke={hw.stroke} strokeWidth="0.5" rx="1.5" />
      <rect x={h2X} y={hY} width={handleW} height={handleH} fill={hw.fill} stroke={hw.stroke} strokeWidth="0.5" rx="1.5" />

      {/* Subtle light sheen on doors */}
      <rect x={d1X} y={dY} width={doorW*0.4} height={doorH} fill="white" fillOpacity="0.03" />
      <rect x={d2X} y={dY} width={doorW*0.4} height={doorH} fill="white" fillOpacity="0.03" />

      {/* Dimension label */}
      <text x={MX + cabW/2} y={VH - 5} textAnchor="middle" fill="#374151" fontSize="9" fontFamily="monospace">
        {width}&quot; W × {height}&quot; H
      </text>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractApiError(errData: unknown, status: number): string {
  if (typeof errData === 'object' && errData !== null) {
    const detail = (errData as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join('; ');
    }
  }
  return `HTTP error ${status}`;
}

const FINISH_LABELS: Record<CabinetFinish, string> = {
  white: 'White', gray: 'Grey', natural_wood: 'Natural Wood',
};
const STYLE_LABELS: Record<DoorStyle, string> = {
  wilmington: 'Wilmington', laguna: 'Laguna',
};
const HW_LABELS: Record<HardwareFinish, string> = {
  brushed_gold: 'Brushed Gold', matte_black: 'Matte Black', chrome: 'Chrome',
};

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

type CabinetTypeId = 'base' | 'wall' | 'tall';
type ObstacleTypeId = 'door' | 'window' | 'utility';

interface WallObstacle {
  position_x: number;
  width: number;
  type: ObstacleTypeId;
}

interface RoomCabinet {
  index: number;
  position_x: number;
  width: number;
  height: number;
  depth: number;
  cut_list: {
    side_panels: CutRow;
    bottom_panel: CutRow;
    top_stretchers: CutRow;
    doors: CutRow;
    summary: { total_parts: number; sheet_area_sq_ft: number };
  };
}

interface RoomResult {
  wall_width: number;
  num_cabinets: number;
  cabinet_height: number;
  cabinet_depth: number;
  cabinet_type: CabinetTypeId;
  cabinets: RoomCabinet[];
  obstacles: WallObstacle[];
  notes: string[];
  total_sheet_area_sq_ft: number;
  sheets_needed_4x8: number;
}

const CABINET_TYPES: { id: CabinetTypeId; name: string; desc: string }[] = [
  { id: 'base',  name: 'Base',  desc: '34.5" H × 24" D' },
  { id: 'wall',  name: 'Wall',  desc: '30" H × 12" D' },
  { id: 'tall',  name: 'Tall',  desc: '84" H × 24" D' },
];

// ─── Phase 3 Types ────────────────────────────────────────────────────────────

interface Quote {
  material_cost: number;
  labor_cost: number;
  total_build_cost: number;
  retail_price: number;
  price_per_cabinet: number;
  deposit_50pct: number;
}

interface SubmittedOrder {
  order_id: string;
  submitted_at: string;
  status: string;
  customer: { name: string; phone: string; email: string; notes: string };
  design: {
    wall_width: number; cabinet_type: string; door_style: string;
    finish: string; hardware: string; num_cabinets: number;
    cabinet_height: number; cabinet_depth: number;
    total_sheet_area_sq_ft: number; sheets_needed_4x8: number;
  };
  quote: Quote;
}

// Client-side pricing mirrors the backend constants
const PRICE_PER_SHEET = 85;
const LABOR_PER_CAB   = 120;
const RETAIL_MARKUP   = 2.5;

function calcQuote(numCabinets: number, sheetsNeeded: number): Quote {
  const material = sheetsNeeded * PRICE_PER_SHEET;
  const labor    = numCabinets  * LABOR_PER_CAB;
  const retail   = (material + labor) * RETAIL_MARKUP;
  return {
    material_cost:     +material.toFixed(2),
    labor_cost:        +labor.toFixed(2),
    total_build_cost:  +(material + labor).toFixed(2),
    retail_price:      +retail.toFixed(2),
    price_per_cabinet: numCabinets ? +(retail / numCabinets).toFixed(2) : 0,
    deposit_50pct:     +(retail * 0.5).toFixed(2),
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-amber-400 bg-amber-950/50 border-amber-500/30',
  confirmed:   'text-blue-400 bg-blue-950/50 border-blue-500/30',
  in_progress: 'text-indigo-400 bg-indigo-950/50 border-indigo-500/30',
  completed:   'text-emerald-400 bg-emerald-950/50 border-emerald-500/30',
  cancelled:   'text-red-400 bg-red-950/50 border-red-500/30',
};

// ─── Wall Elevation SVG ───────────────────────────────────────────────────────

const OBSTACLE_COLORS: Record<ObstacleTypeId, { fill: string; label: string }> = {
  door:    { fill: '#1A2535', label: 'DOOR' },
  window:  { fill: '#0F1E2E', label: 'WINDOW' },
  utility: { fill: '#1C1A20', label: 'UTILITY' },
};

function WallElevationSVG({
  wallWidth, numCabinets, cabinets, cabinetHeight, cabinetType,
  doorStyle, finish, hardware, obstacles,
}: {
  wallWidth: number; numCabinets: number;
  cabinets: { position_x: number; width: number }[];
  cabinetHeight: number; cabinetType: CabinetTypeId;
  doorStyle: DoorStyle; finish: CabinetFinish; hardware: HardwareFinish;
  obstacles: WallObstacle[];
}) {
  const VW = 680;
  const MX = 36;
  const ANNO = 34;
  // Aspect ratio from real dimensions; clamp to readable height
  const CAB_SVG_H = Math.min(Math.max(cabinetHeight / wallWidth * (VW - MX * 2), 130), 280);
  const VH = CAB_SVG_H + MX + ANNO + 16;

  const totalW = VW - MX * 2;
  const scale = totalW / wallWidth; // pixels per inch

  const COUNTERTOP = cabinetType === 'base' ? 7 : 0;
  const TOE = cabinetType !== 'wall' ? 14 : 0;
  const doorSvgH = CAB_SVG_H - COUNTERTOP - TOE;
  const fc = FINISH_COLORS[finish];
  const hw = HW_COLORS[hardware];
  const REVEAL = 2;
  const GAP = 2;

  const renderDoorFace = (x: number, y: number, w: number, h: number) => {
    switch (doorStyle) {
      default:
        return (
          <g>
            <image href={`/doors/${doorStyle}.jpg`} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
            <rect x={x} y={y} width={w} height={h} fill={fc.fill} opacity={finish === 'natural_wood' ? 0.08 : 0.70} />
            <rect x={x} y={y} width={w} height={h} fill="none" stroke={fc.edge} strokeWidth="0.6" opacity="0.5" />
          </g>
        );
    }
  };

  const renderCabinetAtPos = (cab: { position_x: number; width: number }, i: number) => {
    const cabX = MX + cab.position_x * scale;
    const cabW = cab.width * scale;
    const cabY = MX;

    const doorW = (cabW - REVEAL * 2 - GAP) / 2;
    const d1X = cabX + REVEAL;
    const d2X = d1X + doorW + GAP;
    const dY = cabY + COUNTERTOP + REVEAL;
    const dH = doorSvgH - REVEAL * 2;
    const hH = Math.min(dH * 0.25, 28);
    const hW = Math.max(cabW * 0.025, 2);
    const hY = dY + (dH - hH) / 2;
    const h1X = d1X + doorW - doorW * 0.22 - hW / 2;
    const h2X = d2X + doorW * 0.22 - hW / 2;

    return (
      <g key={i}>
        <rect x={cabX} y={cabY} width={cabW} height={CAB_SVG_H} fill="#161B24" />
        {cabinetType === 'base' && <rect x={cabX} y={cabY} width={cabW} height={COUNTERTOP} fill="#2A2F3A" />}
        {TOE > 0 && <rect x={cabX+3} y={cabY+CAB_SVG_H-TOE+2} width={cabW-6} height={TOE-2} fill="#0A0D12" rx="1" />}
        {renderDoorFace(d1X, dY, doorW, dH)}
        {renderDoorFace(d2X, dY, doorW, dH)}
        <rect x={d1X} y={dY} width={doorW} height={dH} fill="none" stroke={fc.edge} strokeWidth="0.5" opacity="0.6" />
        <rect x={d2X} y={dY} width={doorW} height={dH} fill="none" stroke={fc.edge} strokeWidth="0.5" opacity="0.6" />
        <rect x={h1X} y={hY} width={hW} height={hH} fill={hw.fill} stroke={hw.stroke} strokeWidth="0.4" rx="1" />
        <rect x={h2X} y={hY} width={hW} height={hH} fill={hw.fill} stroke={hw.stroke} strokeWidth="0.4" rx="1" />
        {i > 0 && <line x1={cabX} y1={cabY} x2={cabX} y2={cabY+CAB_SVG_H} stroke="#0A0D12" strokeWidth="1.5" />}
        {/* Per-cabinet width label below */}
        <line x1={cabX} y1={MX+CAB_SVG_H+8} x2={cabX+cabW} y2={MX+CAB_SVG_H+8} stroke="#374151" strokeWidth="0.7" />
        <line x1={cabX} y1={MX+CAB_SVG_H+5} x2={cabX} y2={MX+CAB_SVG_H+11} stroke="#374151" strokeWidth="0.7" />
        <line x1={cabX+cabW} y1={MX+CAB_SVG_H+5} x2={cabX+cabW} y2={MX+CAB_SVG_H+11} stroke="#374151" strokeWidth="0.7" />
        <text x={cabX+cabW/2} y={MX+CAB_SVG_H+21} textAnchor="middle" fill="#4B5563" fontSize="9" fontFamily="monospace">
          {cab.width}&quot;
        </text>
      </g>
    );
  };

  const renderObstacle = (obs: WallObstacle, i: number) => {
    const obsX = MX + obs.position_x * scale;
    const obsW = Math.min(obs.width * scale, totalW - obs.position_x * scale);
    const obsY = MX;
    const oc = OBSTACLE_COLORS[obs.type];
    const labelY = obsY + CAB_SVG_H / 2;

    return (
      <g key={`obs-${i}`}>
        <rect x={obsX} y={obsY} width={obsW} height={CAB_SVG_H} fill={oc.fill} />
        {/* Hatch lines */}
        {Array.from({ length: Math.ceil(obsW / 12) + 1 }, (_, j) => (
          <line key={j}
            x1={obsX + j * 12 - CAB_SVG_H} y1={obsY + CAB_SVG_H}
            x2={obsX + j * 12} y2={obsY}
            stroke="#1E2D40" strokeWidth="1" opacity="0.6"
          />
        ))}
        <rect x={obsX} y={obsY} width={obsW} height={CAB_SVG_H} fill="none" stroke="#1E3050" strokeWidth="1" strokeDasharray="4,3" />
        <text x={obsX + obsW / 2} y={labelY - 6} textAnchor="middle" fill="#374151" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {oc.label}
        </text>
        <text x={obsX + obsW / 2} y={labelY + 6} textAnchor="middle" fill="#2D3748" fontSize="8" fontFamily="monospace">
          {obs.width}&quot;
        </text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width={VW} height={VH} fill="#0D1117" />
      {/* Wall background */}
      <rect x={MX} y={MX} width={totalW} height={CAB_SVG_H} fill="#12171F" />
      {/* Obstacles first (behind nothing, but visually distinct) */}
      {obstacles.map((obs, i) => renderObstacle(obs, i))}
      {/* Cabinets */}
      {cabinets.map((cab, i) => renderCabinetAtPos(cab, i))}
      {/* Outer wall border */}
      <rect x={MX} y={MX} width={totalW} height={CAB_SVG_H} fill="none" stroke="#1E2530" strokeWidth="1" />
      {/* Floor line */}
      <line x1={MX-6} y1={MX+CAB_SVG_H} x2={MX+totalW+6} y2={MX+CAB_SVG_H} stroke="#1E2530" strokeWidth="1.5" />
      {/* Total wall dimension */}
      <line x1={MX} y1={VH-6} x2={MX+totalW} y2={VH-6} stroke="#374151" strokeWidth="0.75" />
      <line x1={MX} y1={VH-10} x2={MX} y2={VH-2} stroke="#374151" strokeWidth="0.75" />
      <line x1={MX+totalW} y1={VH-10} x2={MX+totalW} y2={VH-2} stroke="#374151" strokeWidth="0.75" />
      <text x={MX+totalW/2} y={VH-10} textAnchor="middle" fill="#6B7280" fontSize="10" fontFamily="monospace">
        {wallWidth}&quot; wall · {numCabinets} cabinet{numCabinets !== 1 ? 's' : ''}
        {obstacles.length > 0 ? ` · ${obstacles.length} obstacle${obstacles.length !== 1 ? 's' : ''}` : ''}
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FlushFitDashboard() {
  const [activeTab, setActiveTab] = useState<'designer' | 'planner' | 'orders'>('designer');

  // Cabinet designer state
  const [description, setDescription] = useState('');
  const [doorStyle, setDoorStyle] = useState<DoorStyle>('wilmington');
  const [finish, setFinish] = useState<CabinetFinish>('white');
  const [hardware, setHardware] = useState<HardwareFinish>('matte_black');
  const [loadingStep, setLoadingStep] = useState<'idle' | 'parsing' | 'visualizing'>('idle');
  const [result, setResult] = useState<DesignResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Room planner state
  const [wallWidth, setWallWidth] = useState('');
  const [cabinetType, setCabinetType] = useState<CabinetTypeId>('base');
  const [roomResult, setRoomResult] = useState<RoomResult | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Phase 3 — Order form
  const [orderName,  setOrderName]  = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderEmail, setOrderEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [orderId,     setOrderId]     = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Phase 3 — Builder orders view
  const [orders,        setOrders]        = useState<SubmittedOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Obstacle state
  const [obstacles, setObstacles] = useState<WallObstacle[]>([]);
  const [newObsX, setNewObsX] = useState('');
  const [newObsW, setNewObsW] = useState('');
  const [newObsType, setNewObsType] = useState<ObstacleTypeId>('door');

  const addObstacle = () => {
    const x = parseFloat(newObsX);
    const w = parseFloat(newObsW);
    if (isNaN(x) || isNaN(w) || w <= 0) return;
    setObstacles(prev => [...prev, { position_x: x, width: w, type: newObsType }]);
    setNewObsX('');
    setNewObsW('');
  };

  const isLoading = loadingStep !== 'idle';

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoadingStep('parsing');
    setError(null);
    setResult(null);
    try {
      // Step 1: Parse natural language → dimensions + cut list
      const parseRes = await fetch(`${API}/api/parse-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, material_thickness: 0.75 }),
      });

      if (!parseRes.ok) {
        const errData = await parseRes.json();
        throw new Error(extractApiError(errData, parseRes.status));
      }

      const parseData = await parseRes.json();
      const specs: ParsedSpecs = parseData.parsed_specs;
      const cutList: CutList = parseData.manufacturing_cut_list;

      // Step 2: Generate AI visualization (optional — gracefully skipped if no key)
      setLoadingStep('visualizing');
      let imageUrl: string | null = null;

      try {
        const vizRes = await fetch(`${API}/api/generate-visualization`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            width: specs.width,
            height: specs.height,
            depth: specs.depth,
            door_style: doorStyle,
            finish,
            hardware,
          }),
        });
        if (vizRes.ok) {
          const vizData = await vizRes.json();
          imageUrl = vizData.image_url ?? null;
        }
      } catch {
        // visualization is optional — SVG preview always renders
      }

      setResult({ specs, cutList, imageUrl, doorStyle, finish, hardware });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoadingStep('idle');
    }
  };

  const handlePlanRoom = async () => {
    const w = parseFloat(wallWidth);
    if (!wallWidth || isNaN(w) || w <= 0) return;
    setRoomLoading(true);
    setRoomError(null);
    setRoomResult(null);
    try {
      const res = await fetch(`${API}/api/plan-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wall_width: w, cabinet_type: cabinetType, obstacles }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(extractApiError(errData, res.status));
      }
      setRoomResult(await res.json());
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setRoomLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!roomResult || !orderName.trim() || !orderPhone.trim() || !orderEmail.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${API}/api/submit-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: orderName, phone: orderPhone, email: orderEmail, notes: orderNotes },
          design: {
            wall_width:             roomResult.wall_width,
            cabinet_type:           roomResult.cabinet_type,
            door_style:             doorStyle,
            finish,
            hardware,
            num_cabinets:           roomResult.num_cabinets,
            cabinet_height:         roomResult.cabinet_height,
            cabinet_depth:          roomResult.cabinet_depth,
            total_sheet_area_sq_ft: roomResult.total_sheet_area_sq_ft,
            sheets_needed_4x8:      roomResult.sheets_needed_4x8,
          },
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(extractApiError(errData, res.status));
      }
      const data = await res.json();
      setOrderId(data.order_id);
      setOrderName(''); setOrderPhone(''); setOrderEmail(''); setOrderNotes('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API}/api/orders`);
      if (res.ok) setOrders(await res.json());
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/orders/${id}/status?status=${status}`, { method: 'PATCH' });
    fetchOrders();
  };

  const activeFinish = FINISHES.find(f => f.id === finish)!;

  return (
    <div className="min-h-screen bg-[#080810] text-slate-100 font-sans flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-slate-800/60">
        <div className="flex items-center gap-5">
          <span className="text-lg font-bold tracking-tight text-white">
            FlushFit <span className="text-indigo-400">AI</span>
          </span>
          {/* Tab switcher */}
          <div className="flex bg-slate-900/60 border border-slate-800/60 rounded-lg p-0.5 gap-0.5">
            {(['designer', 'planner', 'orders'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'orders') fetchOrders(); }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab === 'designer' ? 'Cabinet Designer' : tab === 'planner' ? 'Room Planner' : 'Orders'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Left: Configuration Panel ────────────────────────────────────── */}
        <aside className="w-full lg:w-[380px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/60 overflow-y-auto">
          <div className="p-6 space-y-8">

            {activeTab === 'designer' && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                1 · Describe your cabinet
              </p>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={isLoading}
                placeholder={'e.g. "36 inch wide base cabinet, 34.5 tall, 24 deep"'}
                className="w-full bg-slate-900/70 border border-slate-700/50 rounded-xl p-3.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/70 focus:border-indigo-500/50 resize-none transition-all"
              />
            </section>
            )}

            {/* Step 2 — Door Style */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                2 · Door style
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DOOR_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setDoorStyle(s.id)}
                    className={`flex flex-col rounded-xl border overflow-hidden transition-all ${
                      doorStyle === s.id
                        ? 'border-indigo-500/70 shadow-lg shadow-indigo-900/20'
                        : 'border-slate-700/40 hover:border-slate-600/60'
                    }`}
                  >
                    {/* Real product photo */}
                    <div className="w-full aspect-[3/4] bg-slate-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/doors/${s.id}.jpg`}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Label */}
                    <div className={`px-2.5 py-2 text-left ${doorStyle === s.id ? 'bg-indigo-950/60' : 'bg-slate-900/60'}`}>
                      <p className={`text-xs font-semibold ${doorStyle === s.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {s.name}
                      </p>
                      <p className={`text-[9px] font-mono mt-0.5 ${doorStyle === s.id ? 'text-indigo-400' : 'text-slate-600'}`}>
                        {s.price}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3 — Finish */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                3 · Finish
              </p>
              <div className="flex items-center gap-3">
                {FINISHES.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFinish(f.id)}
                    title={f.name}
                    className={`relative w-9 h-9 rounded-full transition-all duration-150 ${
                      finish === f.id
                        ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#080810] scale-110'
                        : 'ring-1 ring-slate-700/60 hover:scale-105'
                    }`}
                    style={{ backgroundColor: f.hex }}
                  >
                    {finish === f.id && (
                      <svg viewBox="0 0 16 16" className="absolute inset-0 w-full h-full p-2" fill="none">
                        <path
                          d="M3 8l3.5 3.5L13 4"
                          stroke={f.light ? '#374151' : 'white'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-2">{activeFinish.name}</p>
            </section>

            {/* Step 4 — Hardware */}
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                4 · Hardware
              </p>
              <div className="flex flex-wrap gap-2">
                {HARDWARE.map(h => (
                  <button
                    key={h.id}
                    onClick={() => setHardware(h.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                      hardware === h.id
                        ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-300'
                        : 'border-slate-700/40 bg-slate-900/40 text-slate-500 hover:border-slate-600/60 hover:text-slate-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: h.hex,
                        border: h.border ? '1px solid #4B5563' : undefined,
                      }}
                    />
                    {h.name}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Room Planner inputs (planner tab only) ── */}
            {activeTab === 'planner' && (<>
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  1 · Wall width
                </p>
                <div className="relative">
                  <input
                    type="number"
                    min="12" max="600" step="0.125"
                    value={wallWidth}
                    onChange={e => setWallWidth(e.target.value)}
                    disabled={roomLoading}
                    placeholder="e.g. 143.5"
                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-xl p-3.5 pr-14 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/70 focus:border-indigo-500/50 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-600">inches</span>
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  2 · Cabinet type
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CABINET_TYPES.map(ct => (
                    <button
                      key={ct.id}
                      onClick={() => setCabinetType(ct.id)}
                      className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all ${
                        cabinetType === ct.id
                          ? 'border-indigo-500/70 bg-indigo-950/60'
                          : 'border-slate-700/40 bg-slate-900/40 hover:border-slate-600/60'
                      }`}
                    >
                      <span className={`text-xs font-semibold ${cabinetType === ct.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {ct.name}
                      </span>
                      <span className="text-[9px] text-slate-600">{ct.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Obstacles */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  3 · Obstacles
                  <span className="ml-2 text-slate-700 font-normal normal-case">(doors, windows, pipes)</span>
                </p>

                {/* Existing obstacles list */}
                {obstacles.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {obstacles.map((obs, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            obs.type === 'door' ? 'bg-blue-950/60 text-blue-400' :
                            obs.type === 'window' ? 'bg-cyan-950/60 text-cyan-400' :
                            'bg-orange-950/60 text-orange-400'
                          }`}>{obs.type}</span>
                          <span className="text-xs text-slate-400 truncate">
                            at {obs.position_x}&quot; · {obs.width}&quot; wide
                          </span>
                        </div>
                        <button
                          onClick={() => setObstacles(prev => prev.filter((_, j) => j !== i))}
                          className="text-slate-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                        >
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                            <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add obstacle form */}
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['door', 'window', 'utility'] as ObstacleTypeId[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setNewObsType(t)}
                        className={`py-1.5 rounded-lg border text-[10px] font-medium capitalize transition-all ${
                          newObsType === t
                            ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-300'
                            : 'border-slate-700/40 bg-slate-900/40 text-slate-500 hover:border-slate-600/60'
                        }`}
                      >{t}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number" min="0" step="0.5"
                        value={newObsX}
                        onChange={e => setNewObsX(e.target.value)}
                        placeholder="From left"
                        className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg p-2.5 pr-7 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">&quot;</span>
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number" min="1" step="0.5"
                        value={newObsW}
                        onChange={e => setNewObsW(e.target.value)}
                        placeholder="Width"
                        className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg p-2.5 pr-7 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-600">&quot;</span>
                    </div>
                    <button
                      onClick={addObstacle}
                      disabled={!newObsX || !newObsW}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium transition-all flex-shrink-0"
                    >Add</button>
                  </div>
                </div>
              </section>
            </>)}

            {/* CTA — Designer */}
            {activeTab === 'designer' && (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !description.trim()}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800/80 disabled:text-slate-600 text-white flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-900/30"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {loadingStep === 'parsing' ? 'Parsing with Groq…' : 'Generating…'}
                    </>
                  ) : 'Generate Visualization'}
                </button>
                {error && (
                  <div className="bg-red-950/40 border border-red-500/25 text-red-300 text-xs p-3.5 rounded-xl leading-relaxed">
                    {error}
                  </div>
                )}
              </>
            )}

            {/* CTA — Room Planner */}
            {activeTab === 'planner' && (
              <>
                <button
                  onClick={handlePlanRoom}
                  disabled={roomLoading || !wallWidth}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800/80 disabled:text-slate-600 text-white flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-900/30"
                >
                  {roomLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Planning layout…
                    </>
                  ) : 'Plan Room Layout'}
                </button>
                {roomError && (
                  <div className="bg-red-950/40 border border-red-500/25 text-red-300 text-xs p-3.5 rounded-xl leading-relaxed">
                    {roomError}
                  </div>
                )}
              </>
            )}

          </div>
        </aside>

        {/* ── Right: Preview + Results ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">

          {/* ── DESIGNER TAB ── */}
          {activeTab === 'designer' && (
            <div className="flex flex-col xl:flex-row gap-6 h-full">
              {/* Live SVG preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Live Preview</p>
                  {!result && <p className="text-[10px] text-slate-600">Click Generate to get cut specs →</p>}
                </div>
                <div className="rounded-2xl overflow-hidden border border-slate-700/30 bg-[#0D1117]">
                  <CabinetSVGPreview
                    width={result?.specs.width ?? 36}
                    height={result?.specs.height ?? 34.5}
                    doorStyle={doorStyle}
                    finish={finish}
                    hardware={hardware}
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[STYLE_LABELS[doorStyle], FINISH_LABELS[finish], HW_LABELS[hardware]].map(label => (
                    <span key={label} className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/40 text-xs text-slate-400">{label}</span>
                  ))}
                </div>
              </div>

              {/* Cut list sidebar */}
              <div className="w-full xl:w-64 flex-shrink-0 space-y-4">
                {isLoading && (
                  <>
                    {[1, 2].map(i => (
                      <div key={i} className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4 space-y-3 animate-pulse">
                        <div className="h-2.5 w-24 bg-slate-800 rounded" />
                        {[1,2,3,4].map(j => (
                          <div key={j} className="flex justify-between">
                            <div className="h-2 w-16 bg-slate-800 rounded" />
                            <div className="h-2 w-20 bg-slate-800 rounded" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
                {result && !isLoading && (
                  <>
                    <div className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">Dimensions</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Width',  value: result.specs.width },
                          { label: 'Height', value: result.specs.height },
                          { label: 'Depth',  value: result.specs.depth },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-xs text-slate-600">{label}</span>
                            <span className="font-mono text-emerald-400 text-sm">{value}&quot;</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                          <span className="text-xs text-slate-600">Confidence</span>
                          <span className={`text-xs font-medium ${result.specs.confidence === 'high' ? 'text-emerald-400' : result.specs.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'}`}>
                            {result.specs.confidence}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">Cut List</p>
                      <div className="space-y-2.5">
                        {([
                          { name: 'Side Panels', row: result.cutList.side_panels },
                          { name: 'Bottom Panel', row: result.cutList.bottom_panel },
                          { name: 'Stretchers',   row: result.cutList.top_stretchers },
                          { name: 'Doors',        row: result.cutList.doors },
                        ] as { name: string; row: CutRow }[]).map(({ name, row }) => (
                          <div key={name} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded bg-slate-800 text-slate-500 text-[9px] flex items-center justify-center flex-shrink-0 font-mono">{row.quantity}×</span>
                              <span className="text-xs text-slate-500 truncate">{name}</span>
                            </div>
                            <span className="font-mono text-emerald-400 text-[11px] flex-shrink-0">{row.height_in}&quot; × {row.width_in}&quot;</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── ROOM PLANNER TAB ── */}
          {activeTab === 'planner' && (
            <div className="flex flex-col gap-6">
              {/* Wall elevation — live preview with current style */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  Wall Elevation
                  {roomResult && <span className="ml-2 text-indigo-400 normal-case font-normal">— {roomResult.num_cabinets} cabinet{roomResult.num_cabinets !== 1 ? 's' : ''}</span>}
                </p>
                <div className="rounded-2xl overflow-hidden border border-slate-700/30 bg-[#0D1117]">
                  <WallElevationSVG
                    wallWidth={roomResult?.wall_width ?? (parseFloat(wallWidth) || 144)}
                    numCabinets={roomResult?.num_cabinets ?? 0}
                    cabinets={roomResult?.cabinets ?? []}
                    cabinetHeight={roomResult?.cabinet_height ?? 34.5}
                    cabinetType={cabinetType}
                    doorStyle={doorStyle}
                    finish={finish}
                    hardware={hardware}
                    obstacles={roomResult?.obstacles ?? obstacles}
                  />
                </div>
              </div>

              {/* Loading skeleton */}
              {roomLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4 space-y-2">
                      <div className="h-2.5 w-16 bg-slate-800 rounded" />
                      <div className="h-4 w-12 bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {roomResult && !roomLoading && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Cabinets', value: String(roomResult.num_cabinets), unit: 'pcs' },
                      { label: 'Cabinet W', value: String(roomResult.cabinets[0]?.width ?? '—'), unit: '"' },
                      { label: 'Sheet Area', value: String(roomResult.total_sheet_area_sq_ft), unit: 'sq ft' },
                      { label: 'Sheets 4×8', value: String(roomResult.sheets_needed_4x8), unit: 'sheets' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                        <p className="font-mono text-emerald-400 text-lg mt-1">{value}<span className="text-xs text-slate-600 ml-1">{unit}</span></p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 space-y-1.5">
                    {roomResult.notes.map((note, i) => (
                      <p key={i} className={`text-xs ${i === 0 ? 'text-indigo-300 font-medium' : i === 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {i === 1 ? '✓ ' : ''}{note}
                      </p>
                    ))}
                  </div>

                  {/* Per-cabinet cut list (first cabinet as representative) */}
                  <div className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                      Cut List — Cabinet #1 <span className="text-slate-600 font-normal normal-case">({roomResult.cabinets[0]?.width}&quot; wide)</span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {([
                        { name: 'Side Panels', row: roomResult.cabinets[0].cut_list.side_panels },
                        { name: 'Bottom Panel', row: roomResult.cabinets[0].cut_list.bottom_panel },
                        { name: 'Stretchers',   row: roomResult.cabinets[0].cut_list.top_stretchers },
                        { name: 'Doors',        row: roomResult.cabinets[0].cut_list.doors },
                      ] as { name: string; row: CutRow }[]).map(({ name, row }) => (
                        <div key={name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-slate-800 text-slate-500 text-[9px] flex items-center justify-center flex-shrink-0 font-mono">{row.quantity}×</span>
                            <span className="text-xs text-slate-500 truncate">{name}</span>
                          </div>
                          <span className="font-mono text-emerald-400 text-[11px] flex-shrink-0">{row.height_in}&quot; × {row.width_in}&quot;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* ── Quote + Order Form ── */}
                  {(() => {
                    const q = calcQuote(roomResult.num_cabinets, roomResult.sheets_needed_4x8);
                    return (
                      <>
                        {/* Quote card */}
                        <div className="bg-slate-900/50 border border-indigo-500/20 rounded-xl p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-400 mb-4">Quote Estimate</p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Materials ({roomResult.sheets_needed_4x8} sheets)</span>
                              <span className="text-slate-300">${q.material_cost}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Labor ({roomResult.num_cabinets} cabinets)</span>
                              <span className="text-slate-300">${q.labor_cost}</span>
                            </div>
                          </div>
                          <div className="border-t border-slate-700/40 pt-3 flex items-end justify-between">
                            <div>
                              <p className="text-[10px] text-slate-500">Retail Price</p>
                              <p className="text-2xl font-bold text-white">${q.retail_price.toLocaleString()}</p>
                              <p className="text-xs text-slate-600 mt-0.5">${q.price_per_cabinet} per cabinet · 50% deposit ${q.deposit_50pct.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500">Build cost</p>
                              <p className="text-sm text-slate-400">${q.total_build_cost}</p>
                            </div>
                          </div>
                        </div>

                        {/* Order form */}
                        {orderId ? (
                          <div className="bg-emerald-950/40 border border-emerald-500/25 rounded-xl p-5 text-center">
                            <p className="text-emerald-400 font-semibold text-sm">Order submitted!</p>
                            <p className="font-mono text-emerald-300 text-lg mt-1">{orderId}</p>
                            <p className="text-slate-500 text-xs mt-2">The builder will be in touch shortly.</p>
                            <button
                              onClick={() => setOrderId(null)}
                              className="mt-3 text-xs text-slate-500 hover:text-slate-300 underline"
                            >Submit another</button>
                          </div>
                        ) : (
                          <div className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-4">Request a Quote</p>
                            <div className="space-y-3">
                              {[
                                { label: 'Full name',     val: orderName,  set: setOrderName,  ph: 'John Smith',         type: 'text' },
                                { label: 'Phone',         val: orderPhone, set: setOrderPhone, ph: '(555) 000-0000',     type: 'tel' },
                                { label: 'Email',         val: orderEmail, set: setOrderEmail, ph: 'john@example.com',   type: 'email' },
                              ].map(({ label, val, set, ph, type }) => (
                                <div key={label}>
                                  <label className="text-[10px] text-slate-500 mb-1 block">{label}</label>
                                  <input
                                    type={type}
                                    value={val}
                                    onChange={e => set(e.target.value)}
                                    placeholder={ph}
                                    className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                                  />
                                </div>
                              ))}
                              <div>
                                <label className="text-[10px] text-slate-500 mb-1 block">Notes (optional)</label>
                                <textarea
                                  rows={2}
                                  value={orderNotes}
                                  onChange={e => setOrderNotes(e.target.value)}
                                  placeholder="Special requests, delivery notes..."
                                  className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 resize-none transition-all"
                                />
                              </div>
                              {submitError && (
                                <p className="text-red-400 text-xs">{submitError}</p>
                              )}
                              <button
                                onClick={handleSubmitOrder}
                                disabled={submitting || !orderName.trim() || !orderPhone.trim() || !orderEmail.trim()}
                                className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800/80 disabled:text-slate-600 text-white flex items-center justify-center gap-2 transition-all"
                              >
                                {submitting ? (
                                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Submitting…</>
                                ) : `Submit Order · $${q.retail_price.toLocaleString()}`}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* ── ORDERS TAB ── */}
          {activeTab === 'orders' && (
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Incoming Orders</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Builder view — all submitted requests</p>
                </div>
                <button
                  onClick={fetchOrders}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 transition-all"
                >Refresh</button>
              </div>

              {ordersLoading && (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-slate-900/50 border border-slate-700/35 rounded-xl p-4 animate-pulse h-16" />
                  ))}
                </div>
              )}

              {!ordersLoading && orders.length === 0 && (
                <div className="text-center py-16 text-slate-600">
                  <p className="text-sm">No orders yet.</p>
                  <p className="text-xs mt-1">Orders submitted from the Room Planner will appear here.</p>
                </div>
              )}

              {!ordersLoading && orders.length > 0 && (
                <div className="space-y-3">
                  {[...orders].reverse().map(order => (
                    <div key={order.order_id} className="bg-slate-900/50 border border-slate-700/35 rounded-xl overflow-hidden">
                      {/* Summary row */}
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
                        onClick={() => setExpandedOrder(expandedOrder === order.order_id ? null : order.order_id)}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="font-mono text-indigo-400 text-sm flex-shrink-0">{order.order_id}</span>
                          <span className="text-slate-300 text-sm font-medium truncate">{order.customer.name}</span>
                          <span className="text-slate-500 text-xs hidden sm:block truncate">{order.customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-mono text-emerald-400 text-sm">${order.quote.retail_price.toLocaleString()}</span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                            {order.status}
                          </span>
                          <svg viewBox="0 0 16 16" className={`w-4 h-4 text-slate-600 transition-transform ${expandedOrder === order.order_id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {expandedOrder === order.order_id && (
                        <div className="border-t border-slate-700/40 px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                          {/* Customer */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Customer</p>
                            <p className="text-sm text-slate-300">{order.customer.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{order.customer.phone}</p>
                            <p className="text-xs text-slate-500">{order.customer.email}</p>
                            {order.customer.notes && <p className="text-xs text-slate-600 mt-2 italic">"{order.customer.notes}"</p>}
                          </div>
                          {/* Design */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Design</p>
                            <div className="space-y-1">
                              {[
                                ['Wall', `${order.design.wall_width}"`],
                                ['Cabinets', `${order.design.num_cabinets} × ${order.design.cabinet_type}`],
                                ['Size', `${order.design.cabinet_height}" H × ${order.design.cabinet_depth}" D`],
                                ['Style', `${order.design.door_style.replace('_',' ')} / ${order.design.finish.replace('_',' ')}`],
                                ['Hardware', order.design.hardware.replace('_',' ')],
                                ['Sheets', `${order.design.sheets_needed_4x8} × 4×8`],
                              ].map(([k,v]) => (
                                <div key={k} className="flex justify-between text-xs">
                                  <span className="text-slate-600">{k}</span>
                                  <span className="text-slate-300 capitalize">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Quote + actions */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Quote</p>
                            <div className="space-y-1 mb-4">
                              {[
                                ['Materials', `$${order.quote.material_cost}`],
                                ['Labor',     `$${order.quote.labor_cost}`],
                                ['Retail',    `$${order.quote.retail_price.toLocaleString()}`],
                                ['Deposit',   `$${order.quote.deposit_50pct.toLocaleString()}`],
                              ].map(([k,v]) => (
                                <div key={k} className="flex justify-between text-xs">
                                  <span className="text-slate-600">{k}</span>
                                  <span className={k === 'Retail' ? 'text-emerald-400 font-medium' : 'text-slate-300'}>{v}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Update status</p>
                            <div className="flex flex-wrap gap-1.5">
                              {['confirmed','in_progress','completed','cancelled'].map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateOrderStatus(order.order_id, s)}
                                  disabled={order.status === s}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium capitalize border transition-all disabled:opacity-40 ${STATUS_COLORS[s] ?? ''}`}
                                >{s.replace('_',' ')}</button>
                              ))}
                            </div>
                            <p className="text-[10px] text-slate-700 mt-3">{new Date(order.submitted_at).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
