'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CutListResponse, CabinetVisualization, MaterialThickness } from '@/types/cabinet';

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

function VisualizationPanel({ viz }: { viz: CabinetVisualization }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="viz-panel">
      <div className="viz-panel__header">
        <span className="viz-panel__title">Visual Reference</span>
        <span className={`viz-panel__badge viz-panel__badge--${viz.source}`}>
          {viz.source === 'stock' ? '📸 Stock Photo' : '✨ AI Generated'}
        </span>
      </div>

      <div className="viz-panel__img-wrap">
        {/* Skeleton shown while image loads */}
        {!imgLoaded && !imgError && <div className="viz-panel__skeleton" />}

        {imgError ? (
          <div className="viz-panel__error">
            <span>🖼</span>
            <p>Preview unavailable</p>
          </div>
        ) : (
          <Image
            src={viz.url}
            alt={viz.caption}
            width={800}
            height={480}
            className={`viz-panel__img ${imgLoaded ? 'viz-panel__img--loaded' : ''}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            unoptimized
          />
        )}
      </div>

      <p className="viz-panel__caption">{viz.caption}</p>

      {viz.source === 'stock' && (
        <p className="viz-panel__ai-notice">
          ⚡ Replace <code>get_cabinet_visualization()</code> in <code>backend/main.py</code> with
          your preferred AI image API to generate photorealistic renders.
        </p>
      )}
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

            {/* Visualization panel — stock photo now, AI render later */}
            <VisualizationPanel viz={result.visualization} />

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
