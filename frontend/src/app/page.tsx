'use client';

import React, { useState } from 'react';

// --- Type Definitions matching the backend API ---

interface ParsedSpecs {
  width: number;
  height: number;
  depth: number;
  confidence?: 'high' | 'medium' | 'low';
  raw_groq_text?: string;
}

// Adapting the actual backend schema names to the frontend
interface ComponentDimension {
  quantity: number;
  width_in: number;
  height_in: number;
  label: string;
}

interface ManufacturingCutList {
  side_panels: ComponentDimension;
  bottom_panel: ComponentDimension;
  top_stretchers: ComponentDimension;
  doors: ComponentDimension;
}

interface ParseDesignResponse {
  parsed_specs: ParsedSpecs;
  manufacturing_cut_list: ManufacturingCutList;
}

export default function ParametrixDashboard() {
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ParseDesignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch('http://localhost:8000/api/parse-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: promptText,
          material_thickness: 0.75 // Default as per backend requirement
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `HTTP error ${res.status}`);
      }

      const responseData: ParseDesignResponse = await res.json();
      setData(responseData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            Parametrix AI
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Natural language to parametric manufacturing data.</p>
        </header>

        {/* NLP Input Form */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <label htmlFor="nl-prompt" className="text-sm font-medium text-slate-300">
              Describe your cabinet dimensions
            </label>
            <textarea
              id="nl-prompt"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g. 'I need a 36 inch wide base cabinet, 30 tall and 21 deep'"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              disabled={loading}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !promptText.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center min-w-[200px]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing via Groq...
                  </>
                ) : (
                  "Generate Specs"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 p-4 rounded-lg flex items-center">
            <span className="mr-3">⚠️</span> {error}
          </div>
        )}

        {/* Results Grid */}
        {data && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Card: Extracted Specs (1 Column) */}
            <div className="col-span-1 bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-slate-200 border-b border-slate-700 pb-2">Extracted Specs</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Width</span>
                  <span className="font-mono text-emerald-400 text-lg">{data.parsed_specs.width}"</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Height</span>
                  <span className="font-mono text-emerald-400 text-lg">{data.parsed_specs.height}"</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Depth</span>
                  <span className="font-mono text-emerald-400 text-lg">{data.parsed_specs.depth}"</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Color</span>
                  {/* Since our API doesn't extract color, fallback to a placeholder or N/A */}
                  <span className="font-mono text-slate-300">N/A</span>
                </div>
              </div>
            </div>

            {/* Right Card: Workshop Cut-List (2 Columns) */}
            <div className="col-span-1 md:col-span-2 bg-slate-800/80 border border-slate-700 rounded-xl p-6 shadow-lg overflow-x-auto">
              <h3 className="text-xl font-bold mb-4 text-slate-200 border-b border-slate-700 pb-2">Workshop Cut-List</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/50">
                    <th className="pb-3 font-medium px-2">Component</th>
                    <th className="pb-3 font-medium px-2 text-center">Qty</th>
                    <th className="pb-3 font-medium px-2 text-right">Dimensions (H × W)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {/* Map the backend response keys directly to rows */}
                  {[
                    { name: 'Side Panels', part: data.manufacturing_cut_list.side_panels },
                    { name: 'Bottom Panel', part: data.manufacturing_cut_list.bottom_panel },
                    { name: 'Top Stretchers', part: data.manufacturing_cut_list.top_stretchers },
                    { name: 'Doors', part: data.manufacturing_cut_list.doors },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-4 px-2 font-medium text-slate-300">{row.name}</td>
                      <td className="py-4 px-2 text-center">
                        <span className="font-mono text-amber-400 text-lg">{row.part.quantity}</span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className="font-mono text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded">
                          {row.part.height_in}" × {row.part.width_in}"
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          </section>
        )}

      </div>
    </div>
  );
}
