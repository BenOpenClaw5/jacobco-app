export interface CaseColorDef {
  accent: string;
  bg: string;
  glow: string;
  border: string;
  text: string;
}

// Muted, editorial palette — restrained color identity on deep navy
export const CASE_TYPE_COLORS: Record<string, CaseColorDef> = {
  'Dacore': {
    accent: '#5B8DB8',
    bg: 'rgba(30, 60, 90, 0.25)',
    glow: 'rgba(91, 141, 184, 0.08)',
    border: 'rgba(91, 141, 184, 0.18)',
    text: '#7AAAD4',
  },
  'Pinspot': {
    accent: '#B88A5B',
    bg: 'rgba(90, 60, 20, 0.25)',
    glow: 'rgba(184, 138, 91, 0.08)',
    border: 'rgba(184, 138, 91, 0.18)',
    text: '#D4AA7A',
  },
  'Dual Beam': {
    accent: '#5B9B72',
    bg: 'rgba(20, 70, 40, 0.25)',
    glow: 'rgba(91, 155, 114, 0.08)',
    border: 'rgba(91, 155, 114, 0.18)',
    text: '#7ABB94',
  },
  'Gobo': {
    accent: '#8B6BB8',
    bg: 'rgba(60, 30, 100, 0.25)',
    glow: 'rgba(139, 107, 184, 0.08)',
    border: 'rgba(139, 107, 184, 0.18)',
    text: '#AA8ED4',
  },
  'Super Spot': {
    accent: '#B86B5B',
    bg: 'rgba(90, 30, 20, 0.25)',
    glow: 'rgba(184, 107, 91, 0.08)',
    border: 'rgba(184, 107, 91, 0.18)',
    text: '#D48A7A',
  },
  'Pixel Brick': {
    accent: '#5B8EB8',
    bg: 'rgba(20, 55, 85, 0.25)',
    glow: 'rgba(91, 142, 184, 0.08)',
    border: 'rgba(91, 142, 184, 0.18)',
    text: '#7AAEDD',
  },
  'Pixel Tube': {
    accent: '#5BB8D4',
    bg: 'rgba(15, 65, 95, 0.25)',
    glow: 'rgba(91, 184, 212, 0.08)',
    border: 'rgba(91, 184, 212, 0.18)',
    text: '#7AD4EE',
  },
  'AX2': {
    accent: '#B85BB8',
    bg: 'rgba(70, 20, 80, 0.25)',
    glow: 'rgba(184, 91, 184, 0.08)',
    border: 'rgba(184, 91, 184, 0.18)',
    text: '#D47AD4',
  },
  'AX5': {
    accent: '#5B72B8',
    bg: 'rgba(25, 35, 90, 0.25)',
    glow: 'rgba(91, 114, 184, 0.08)',
    border: 'rgba(91, 114, 184, 0.18)',
    text: '#7A94D4',
  },
  'Plutos': {
    accent: '#B8A05B',
    bg: 'rgba(80, 65, 15, 0.25)',
    glow: 'rgba(184, 160, 91, 0.08)',
    border: 'rgba(184, 160, 91, 0.18)',
    text: '#D4C07A',
  },
  'Chandelier': {
    accent: '#D4B85B',
    bg: 'rgba(100, 80, 10, 0.25)',
    glow: 'rgba(212, 184, 91, 0.1)',
    border: 'rgba(212, 184, 91, 0.2)',
    text: '#EED47A',
  },
  'Dome Lights': {
    accent: '#5BB8B8',
    bg: 'rgba(15, 70, 70, 0.25)',
    glow: 'rgba(91, 184, 184, 0.08)',
    border: 'rgba(91, 184, 184, 0.18)',
    text: '#7AD4D4',
  },
  'Circle brackets': {
    accent: '#8B8BB8',
    bg: 'rgba(40, 40, 80, 0.25)',
    glow: 'rgba(139, 139, 184, 0.08)',
    border: 'rgba(139, 139, 184, 0.18)',
    text: '#AAAADD',
  },
  'Air Wall Track': {
    accent: '#B85B72',
    bg: 'rgba(90, 20, 35, 0.25)',
    glow: 'rgba(184, 91, 114, 0.08)',
    border: 'rgba(184, 91, 114, 0.18)',
    text: '#D47A94',
  },
  'Clamp brackets tree': {
    accent: '#5BB85B',
    bg: 'rgba(20, 70, 20, 0.25)',
    glow: 'rgba(91, 184, 91, 0.08)',
    border: 'rgba(91, 184, 91, 0.18)',
    text: '#7ADD7A',
  },
};

export const DEFAULT_CASE_COLOR: CaseColorDef = {
  accent: 'rgba(255,255,255,0.5)',
  bg: 'rgba(255,255,255,0.04)',
  glow: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.1)',
  text: 'rgba(255,255,255,0.6)',
};

export function getCaseColor(type: string, customColor?: string): CaseColorDef {
  if (customColor) {
    return {
      accent: customColor,
      bg: `${customColor}18`,
      glow: `${customColor}10`,
      border: `${customColor}28`,
      text: customColor,
    };
  }
  return CASE_TYPE_COLORS[type] ?? DEFAULT_CASE_COLOR;
}

export const STAGE_COLORS = {
  invoice: {
    accent: 'rgba(255,255,255,0.55)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.1)',
    label: 'Invoice',
    dot: 'rgba(255,255,255,0.4)',
  },
  charging: {
    accent: 'rgba(100,160,230,0.8)',
    bg: 'rgba(60,100,180,0.06)',
    border: 'rgba(100,160,230,0.15)',
    label: 'Charging',
    dot: 'rgba(120,170,240,0.7)',
  },
  prepped: {
    accent: 'rgba(100,200,130,0.8)',
    bg: 'rgba(40,120,70,0.06)',
    border: 'rgba(100,200,130,0.15)',
    label: 'Prepped',
    dot: 'rgba(120,210,150,0.7)',
  },
  loaded: {
    accent: 'rgba(220,190,90,0.9)',
    bg: 'rgba(160,120,20,0.06)',
    border: 'rgba(220,190,90,0.18)',
    label: 'Loaded',
    dot: 'rgba(230,200,100,0.8)',
  },
};
