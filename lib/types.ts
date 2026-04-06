export type Stage = 'invoice' | 'charging' | 'prepped' | 'loaded';

export interface InventoryCase {
  id: string;
  type: string;
  letter: string;
  sort_order: number;
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
  displayId: string; // unique key for rendering
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
}

export const STAGES: Stage[] = ['invoice', 'charging', 'prepped', 'loaded'];

export const STAGE_META: Record<Stage, { label: string; weight: number }> = {
  invoice: { label: 'Invoice', weight: 0 },
  charging: { label: 'Charging', weight: 33 },
  prepped: { label: 'Prepped', weight: 66 },
  loaded: { label: 'Loaded', weight: 100 },
};
