// Types for Parametrix AI API

export interface CabinetInput {
  width: number;
  height: number;
  depth: number;
  material_thickness: number;
}

export interface PanelDimension {
  width: number;
  height: number;
  label: string;
}

export interface DoorDimension {
  width: number;
  height: number;
  label: string;
  reveal_gap: number;
}

export interface ParsedSpecs {
  width: number;
  height: number;
  depth: number;
  confidence: 'high' | 'medium' | 'low';
  raw_groq_text: string;
}
export interface CutListResponse {
  input: CabinetInput;
  construction_notes: string[];
  side_panels: PanelDimension[];
  bottom_panel: PanelDimension;
  top_stretchers: PanelDimension[];
  doors: DoorDimension[];
  summary: {
    total_parts: number;
    sheet_area_sq_ft: number;
    sheets_needed_4x8: number;
    door_reveal_gap_in: number;
  };
}

export interface ParseDesignResponse {
  parsed_specs: ParsedSpecs;
  manufacturing_cut_list: CutListResponse;
}

export type MaterialThickness = 0.5 | 0.75 | 1.0;
