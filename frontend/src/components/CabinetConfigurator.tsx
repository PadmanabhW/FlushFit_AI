'use client';

import { useState } from 'react';
import type { CutListResponse, MaterialThickness } from '@/types/cabinet';

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelBadge({ label, index }: { label: string; index: number }) {
  return (
    <div
      className="panel-badge"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="panel-badge__icon">⬜</span>
      <span className="panel-badge__label">{label}</span>
    </div>
  );
}

function DoorBadge({ label, reveal, index }: { label: string; reveal: number; index: number }) {
  return (
    <div
      className="panel-badge panel-badge--door"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="panel-badge__icon">🚪</span>
      <span className="panel-badge__label">{label}</span>
      <span className="panel-badge__reveal">reveal: {(reveal * 16).toFixed(0)}/16&quot;</span>
    </div>
  );
}

function SectionCard({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-card">
      <div className="section-card__header">
        <span className="section-card__icon">{icon}</span>
        <h3 className="section-card__title">{title}</h3>
        <span className="section-card__count">{count}×</span>
      </div>
      <div className="section-card__panels">{children}</div>
    </div>
  );
}

// ─── Cabinet SVG Schematic ────────────────────────────────────────────────────
// Draws a proportionally accurate front-elevation of the cabinet box,
// computed directly from the cut-list data. No external images needed.

function CabinetSchematic({ result }: { result: CutListResponse }) {
  const { input, side_panels, bottom_panel, doors } = result;

  // SVG canvas dimensions
  const SVG_W = 520;
  const SVG_H = 320;
  const PAD   = 48;   // padding for dimension annotations

  // Scale cabinet to fit canvas (keeping aspect ratio)
  const scaleX = (SVG_W - PAD * 2) / input.width;
  const scaleY = (SVG_H - PAD * 2) / input.height;
  const scale  = Math.min(scaleX, scaleY);

  // Cabinet rect (front elevation)
  const cabW = input.width  * scale;
  const cabH = input.height * scale;
  const originX = PAD + (SVG_W - PAD * 2 - cabW) / 2;
  const originY = PAD + (SVG_H - PAD * 2 - cabH) / 2;

  // Material thickness in scaled px
  const t = input.material_thickness * scale;
  const reveal = 0.0625 * scale;  // 1/16" reveal
  const centerGap = 0.125 * scale; // 1/8" door gap

  // Door geometry (each of 2 leaves)
  const doorH  = doors[0].height * scale;
  const doorW  = doors[0].width  * scale;
  const doorY  = originY + reveal;  // top reveal
  const door1X = originX + reveal;  // left reveal
  const door2X = door1X + doorW + centerGap;

  // Stretcher at top
  const stretcherH = 3 * scale;  // 3" standard nailer

  // Dim line helpers
  const dimColor = '#c9956c';
  const dimFaint = 'rgba(201,149,108,0.3)';

  return (
    <div className="schematic">
      <div className="schematic__header">
        <span className="schematic__title">Front Elevation — Schematic</span>
        <span className="schematic__badge">Scale proportional</span>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="schematic__svg"
        aria-label={`Cabinet schematic: ${input.width}" wide × ${input.height}" tall`}
      >
        {/* ── Cabinet outer box ── */}
        <rect
          x={originX} y={originY} width={cabW} height={cabH}
          fill="none" stroke="#e0b48f" strokeWidth="1.5"
        />

        {/* ── Side panels (left & right) — filled ── */}
        <rect x={originX}            y={originY} width={t} height={cabH}
          fill="rgba(201,149,108,0.18)" stroke="#c9956c" strokeWidth="1" />
        <rect x={originX + cabW - t} y={originY} width={t} height={cabH}
          fill="rgba(201,149,108,0.18)" stroke="#c9956c" strokeWidth="1" />

        {/* ── Bottom panel ── */}
        <rect x={originX + t} y={originY + cabH - t} width={cabW - t * 2} height={t}
          fill="rgba(201,149,108,0.14)" stroke="#c9956c" strokeWidth="1" />

        {/* ── Top stretchers ── */}
        <rect x={originX + t} y={originY} width={cabW - t * 2} height={stretcherH}
          fill="rgba(201,149,108,0.1)" stroke="rgba(201,149,108,0.5)" strokeWidth="1"
          strokeDasharray="4 2"
        />

        {/* ── Door opening background ── */}
        <rect
          x={originX + t} y={originY + stretcherH}
          width={cabW - t * 2} height={cabH - t - stretcherH}
          fill="rgba(8,13,26,0.6)"
        />

        {/* ── Door 1 (left leaf) ── */}
        <rect
          x={door1X} y={doorY} width={doorW} height={doorH}
          fill="rgba(15,26,46,0.9)" stroke="#e0b48f" strokeWidth="1.2"
          rx="1"
        />
        {/* Door 1 handle */}
        <line
          x1={door1X + doorW - 6} y1={doorY + doorH * 0.42}
          x2={door1X + doorW - 6} y2={doorY + doorH * 0.58}
          stroke="#c9956c" strokeWidth="2" strokeLinecap="round"
        />

        {/* ── Door 2 (right leaf) ── */}
        <rect
          x={door2X} y={doorY} width={doorW} height={doorH}
          fill="rgba(15,26,46,0.9)" stroke="#e0b48f" strokeWidth="1.2"
          rx="1"
        />
        {/* Door 2 handle */}
        <line
          x1={door2X + 6} y1={doorY + doorH * 0.42}
          x2={door2X + 6} y2={doorY + doorH * 0.58}
          stroke="#c9956c" strokeWidth="2" strokeLinecap="round"
        />

        {/* ── Center gap indicator ── */}
        <line
          x1={door1X + doorW + centerGap / 2} y1={doorY + 8}
          x2={door1X + doorW + centerGap / 2} y2={doorY + doorH - 8}
          stroke={dimFaint} strokeWidth="1" strokeDasharray="2 2"
        />

        {/* ── WIDTH dimension (bottom) ── */}
        <line x1={originX} y1={originY + cabH + 18}
              x2={originX + cabW} y2={originY + cabH + 18}
              stroke={dimColor} strokeWidth="1" />
        <line x1={originX}        y1={originY + cabH + 13} x2={originX}        y2={originY + cabH + 23} stroke={dimColor} strokeWidth="1" />
        <line x1={originX + cabW} y1={originY + cabH + 13} x2={originX + cabW} y2={originY + cabH + 23} stroke={dimColor} strokeWidth="1" />
        <text x={originX + cabW / 2} y={originY + cabH + 34}
          textAnchor="middle" fill={dimColor} fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="600">
          {input.width}&quot;
        </text>

        {/* ── HEIGHT dimension (right side) ── */}
        <line x1={originX + cabW + 18} y1={originY}
              x2={originX + cabW + 18} y2={originY + cabH}
              stroke={dimColor} strokeWidth="1" />
        <line x1={originX + cabW + 13} y1={originY}        x2={originX + cabW + 23} y2={originY}        stroke={dimColor} strokeWidth="1" />
        <line x1={originX + cabW + 13} y1={originY + cabH} x2={originX + cabW + 23} y2={originY + cabH} stroke={dimColor} strokeWidth="1" />
        <text
          x={originX + cabW + 32} y={originY + cabH / 2}
          textAnchor="middle" fill={dimColor} fontSize="10" fontFamily="Space Grotesk, sans-serif" fontWeight="600"
          transform={`rotate(90, ${originX + cabW + 32}, ${originY + cabH / 2})`}
        >
          {input.height}&quot;
        </text>

        {/* ── Labels ── */}
        <text x={originX + t / 2} y={originY + cabH / 2}
          textAnchor="middle" fill="rgba(201,149,108,0.7)" fontSize="7"
          transform={`rotate(-90, ${originX + t / 2}, ${originY + cabH / 2})`}
        >SIDE</text>

        <text x={originX + cabW - t / 2} y={originY + cabH / 2}
          textAnchor="middle" fill="rgba(201,149,108,0.7)" fontSize="7"
          transform={`rotate(90, ${originX + cabW - t / 2}, ${originY + cabH / 2})`}
        >SIDE</text>

        <text x={originX + cabW / 2} y={originY + stretcherH / 2 + 3}
          textAnchor="middle" fill="rgba(201,149,108,0.55)" fontSize="7"
        >STRETCHERS</text>

        <text x={originX + cabW / 2} y={originY + cabH - t / 2 + 3}
          textAnchor="middle" fill="rgba(201,149,108,0.55)" fontSize="7"
        >BOTTOM</text>

        <text x={door1X + doorW / 2} y={doorY + doorH / 2}
          textAnchor="middle" fill="rgba(224,180,143,0.6)" fontSize="8" fontFamily="Space Grotesk, sans-serif"
        >DOOR</text>
        <text x={door2X + doorW / 2} y={doorY + doorH / 2}
          textAnchor="middle" fill="rgba(224,180,143,0.6)" fontSize="8" fontFamily="Space Grotesk, sans-serif"
        >DOOR</text>

        {/* ── Bottom panel dimension note ── */}
        <text x={originX + cabW / 2} y={originY - 10}
          textAnchor="middle" fill="rgba(138,155,192,0.7)" fontSize="8.5" fontFamily="Inter, sans-serif"
        >
          Bottom: {bottom_panel.label} · Side: {side_panels[0].label}
        </text>
      </svg>

      <p className="schematic__note">
        Front elevation · Frameless (European-style) full-overlay construction ·
        {' '}{input.material_thickness}&quot; material · 1/16&quot; reveal per edge
      </p>
    </div>
  );
}

function SummaryStrip({ data }: { data: CutListResponse['summary'] }) {
  const stats = [
    { label: 'Total Parts', value: data.total_parts, unit: 'pcs' },
    { label: 'Sheet Area', value: data.sheet_area_sq_ft, unit: 'sq ft' },
    { label: '4×8 Sheets', value: data.sheets_needed_4x8, unit: 'sheets' },
    { label: 'Door Reveal', value: `1/16`, unit: '"' },
  ];
  return (
    <div className="summary-strip">
      {stats.map((s) => (
        <div key={s.label} className="summary-strip__item">
          <span className="summary-strip__value">
            {s.value}
            <span className="summary-strip__unit">{s.unit}</span>
          </span>
          <span className="summary-strip__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Configurator ────────────────────────────────────────────────────────

export default function CabinetConfigurator() {
  const [width, setWidth] = useState<string>('24');
  const [height, setHeight] = useState<string>('36');
  const [depth, setDepth] = useState<string>('24');
  const [thickness, setThickness] = useState<string>('0.75');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CutListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('http://localhost:8000/api/calculate-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: parseFloat(width),
          height: parseFloat(height),
          depth: parseFloat(depth),
          material_thickness: parseFloat(thickness) as MaterialThickness,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data: CutListResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error. Is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="configurator">
      {/* ── Form Card ── */}
      <div className="form-card">
        <div className="form-card__badge">Parametric Engine v1.0</div>
        <h2 className="form-card__title">Cabinet Configurator</h2>
        <p className="form-card__subtitle">
          Enter your target dimensions to generate a precise frameless cabinet cut-list.
        </p>

        <form onSubmit={handleSubmit} className="form" noValidate id="cabinet-form">
          <div className="form__grid">
            <div className="field">
              <label className="field__label" htmlFor="input-width">
                Target Width
              </label>
              <div className="field__input-wrap">
                <input
                  id="input-width"
                  type="number"
                  className="field__input"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  min="6"
                  max="120"
                  step="0.125"
                  required
                  placeholder="24"
                />
                <span className="field__unit">in</span>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="input-height">
                Target Height
              </label>
              <div className="field__input-wrap">
                <input
                  id="input-height"
                  type="number"
                  className="field__input"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  min="6"
                  max="120"
                  step="0.125"
                  required
                  placeholder="36"
                />
                <span className="field__unit">in</span>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="input-depth">
                Target Depth
              </label>
              <div className="field__input-wrap">
                <input
                  id="input-depth"
                  type="number"
                  className="field__input"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  min="6"
                  max="60"
                  step="0.125"
                  required
                  placeholder="24"
                />
                <span className="field__unit">in</span>
              </div>
            </div>

            <div className="field field--full">
              <label className="field__label" htmlFor="select-thickness">
                Material Thickness
              </label>
              <div className="field__input-wrap field__input-wrap--select">
                <select
                  id="select-thickness"
                  className="field__select"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  required
                >
                  <option value="">— Select thickness —</option>
                  <option value="0.5">1/2&quot; (12.7 mm)</option>
                  <option value="0.75">3/4&quot; (19.05 mm)</option>
                  <option value="1.0">1&quot; (25.4 mm)</option>
                </select>
                <span className="field__chevron">▾</span>
              </div>
            </div>
          </div>

          <button
            id="btn-generate"
            type="submit"
            className={`btn-generate ${loading ? 'btn-generate--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-generate__spinner" />
                Calculating…
              </>
            ) : (
              <>
                <span className="btn-generate__icon">⚡</span>
                Generate Specs
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-box" role="alert">
            <span className="error-box__icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Presets */}
        <div className="presets">
          <span className="presets__label">Quick presets:</span>
          {[
            { label: 'Base Cabinet', w: '24', h: '34.5', d: '24', t: '0.75' },
            { label: 'Wall Cabinet', w: '30', h: '30', d: '12', t: '0.75' },
            { label: 'Tall Pantry', w: '18', h: '84', d: '24', t: '0.75' },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              className="presets__chip"
              onClick={() => {
                setWidth(p.w);
                setHeight(p.h);
                setDepth(p.d);
                setThickness(p.t);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results Card ── */}
      <div className={`results-card ${result ? 'results-card--visible' : ''}`}>
        {!result ? (
          <div className="results-card__empty">
            <div className="results-card__empty-icon">📐</div>
            <p className="results-card__empty-title">Awaiting Specifications</p>
            <p className="results-card__empty-sub">
              Configure your cabinet dimensions and hit <em>Generate Specs</em> to get an
              instant, precision cut-list.
            </p>
          </div>
        ) : (
          <>
            <div className="results-header">
              <div>
                <h2 className="results-header__title">Cut-List Generated</h2>
                <p className="results-header__meta">
                  {result.input.width}&quot; W × {result.input.height}&quot; H ×{' '}
                  {result.input.depth}&quot; D · {result.input.material_thickness}&quot; material
                </p>
              </div>
              <span className="results-header__badge">✓ Ready</span>
            </div>

            <SummaryStrip data={result.summary} />

            {/* Cabinet schematic — front elevation SVG, drawn from cut-list data */}
            <CabinetSchematic result={result} />

            <div className="sections">
              <SectionCard title="Side Panels" count={result.side_panels.length} icon="🟫">
                {result.side_panels.map((p, i) => (
                  <PanelBadge key={i} label={p.label} index={i} />
                ))}
              </SectionCard>

              <SectionCard title="Bottom Panel" count={1} icon="🟤">
                <PanelBadge label={result.bottom_panel.label} index={0} />
              </SectionCard>

              <SectionCard title="Top Stretchers" count={result.top_stretchers.length} icon="🔩">
                {result.top_stretchers.map((p, i) => (
                  <PanelBadge key={i} label={p.label} index={i} />
                ))}
              </SectionCard>

              <SectionCard title="Doors" count={result.doors.length} icon="🚪">
                {result.doors.map((d, i) => (
                  <DoorBadge key={i} label={d.label} reveal={d.reveal_gap} index={i} />
                ))}
              </SectionCard>
            </div>

            {/* Construction Notes Toggle */}
            <button
              id="btn-notes-toggle"
              className="notes-toggle"
              onClick={() => setShowNotes((v) => !v)}
              type="button"
            >
              <span>{showNotes ? '▲' : '▼'}</span>
              Construction Notes ({result.construction_notes.length})
            </button>

            {showNotes && (
              <ul className="notes-list">
                {result.construction_notes.map((note, i) => (
                  <li key={i} className="notes-list__item">
                    <span className="notes-list__bullet">›</span>
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
