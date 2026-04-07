export type Stage = 'invoice' | 'charging' | 'prepped' | 'loaded';
export type Shop = 'Orlando' | 'Dallas';

export interface InventoryCase {
  id: string;
  type: string;
  letter: string;
  sort_order: number;
  shop: Shop;
  standard_light_count: number;
  actual_light_count: number;
  has_issue: boolean;
  issue_note?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  location?: string;
  load_by_date?: string;
  event_start_date?: string;
  event_end_date?: string;
  notes?: string;
  primary_shop?: Shop;
  google_doc_url?: string;
  archived_at?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  created_at: string;
}

export interface EventCard {
  id: string;
  event_id: string;
  inventory_case_id?: string;
  is_custom: boolean;
  custom_name?: string;
  custom_color?: string;
  stage?: Stage | null;
  notes?: string;
  approved_by?: string;
  prepped_by?: string;
  last_updated_by?: string;
  last_updated_at?: string;
  created_at: string;
  updated_at: string;
  inventory_case?: InventoryCase;
  images?: EventCardImage[];
}

export interface EventCardImage {
  id: string;
  event_card_id: string;
  url: string;
  storage_path: string;
  created_at: string;
}

// Unified display card for rendering
export interface DisplayCard {
  displayId: string;
  inventoryCaseId?: string;
  eventCardId?: string;
  type: string;
  letter: string;
  displayName: string;
  isCustom: boolean;
  customColor?: string;
  stage?: Stage | null;
  notes?: string;
  approved_by?: string;
  prepped_by?: string;
  images?: EventCardImage[];
  // Shop of the underlying inventory case
  caseShop?: Shop;
  // Light counts
  standardLightCount?: number;
  actualLightCount?: number;
  // Last updated
  last_updated_by?: string;
  last_updated_at?: string;
}

export interface ReturnIncident {
  id: string;
  event_id: string;
  inventory_case_id: string;
  type: 'ok' | 'missing' | 'note';
  missing_count?: number;
  note?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  last_updated_by?: string;
  last_updated_at?: string;
  // Joined
  inventory_case?: InventoryCase;
  event?: Event;
}

export const STAGES: Stage[] = ['invoice', 'charging', 'prepped', 'loaded'];
export const SHOPS: Shop[] = ['Orlando', 'Dallas'];

export const STAGE_META: Record<Stage, { label: string; weight: number }> = {
  invoice:  { label: 'Invoice',  weight: 0   },
  charging: { label: 'Charging', weight: 33  },
  prepped:  { label: 'Prepped',  weight: 66  },
  loaded:   { label: 'Loaded',   weight: 100 },
};

/** Readiness score: avg weight of all assigned (non-pool) cards */
export function calcReadiness(cards: DisplayCard[]): number {
  const assigned = cards.filter(c => c.stage !== null && c.stage !== undefined);
  if (assigned.length === 0) return 0;
  const total = assigned.reduce((sum, c) => sum + (STAGE_META[c.stage!]?.weight ?? 0), 0);
  return Math.round(total / assigned.length);
}

/** Standard light counts by case type */
export const STANDARD_COUNTS: Record<string, number> = {
  'Dacore': 24,
  'Pinspot': 36,
  'Dual Beam': 12,
  'Gobo': 8,
  'Super Spot': 6,
  'Pixel Brick': 18,
  'Pixel Tube': 24,
  'AX2': 12,
  'AX5': 8,
  'Plutos': 4,
  'Chandelier': 1,
  'Dome Lights': 6,
};
