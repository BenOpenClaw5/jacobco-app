export interface CaseColorDef {
  accent: string;
  bg: string;
  glow: string;
  border: string;
  text: string;
}

export const CASE_TYPE_COLORS: Record<string, CaseColorDef> = {
  'Dacore': {
    accent: '#4A82B8',
    bg: '#0E1923',
    glow: 'rgba(74, 130, 184, 0.18)',
    border: 'rgba(74, 130, 184, 0.22)',
    text: '#6EA8D8',
  },
  'Pinspot': {
    accent: '#C4813A',
    bg: '#1E1208',
    glow: 'rgba(196, 129, 58, 0.18)',
    border: 'rgba(196, 129, 58, 0.22)',
    text: '#D4A060',
  },
  'Dual Beam': {
    accent: '#3D8B5C',
    bg: '#0A1912',
    glow: 'rgba(61, 139, 92, 0.18)',
    border: 'rgba(61, 139, 92, 0.22)',
    text: '#5CAA7A',
  },
  'Gobo': {
    accent: '#8A5ABF',
    bg: '#160F22',
    glow: 'rgba(138, 90, 191, 0.18)',
    border: 'rgba(138, 90, 191, 0.22)',
    text: '#A87ED4',
  },
  'Super Spot': {
    accent: '#C4603A',
    bg: '#1E100A',
    glow: 'rgba(196, 96, 58, 0.18)',
    border: 'rgba(196, 96, 58, 0.22)',
    text: '#D47E5C',
  },
  'Pixel Brick': {
    accent: '#3A8FC4',
    bg: '#0A1820',
    glow: 'rgba(58, 143, 196, 0.18)',
    border: 'rgba(58, 143, 196, 0.22)',
    text: '#60AADC',
  },
  'Pixel Tube': {
    accent: '#2AAAD4',
    bg: '#081820',
    glow: 'rgba(42, 170, 212, 0.18)',
    border: 'rgba(42, 170, 212, 0.22)',
    text: '#50C4E8',
  },
  'AX2': {
    accent: '#B06AC4',
    bg: '#1A0E22',
    glow: 'rgba(176, 106, 196, 0.18)',
    border: 'rgba(176, 106, 196, 0.22)',
    text: '#C88ED8',
  },
  'AX5': {
    accent: '#5A7FD4',
    bg: '#0C1220',
    glow: 'rgba(90, 127, 212, 0.18)',
    border: 'rgba(90, 127, 212, 0.22)',
    text: '#7A9FE4',
  },
  'Plutos': {
    accent: '#C4A040',
    bg: '#1C1608',
    glow: 'rgba(196, 160, 64, 0.18)',
    border: 'rgba(196, 160, 64, 0.22)',
    text: '#D4BA60',
  },
  'Chandelier': {
    accent: '#D4B040',
    bg: '#201806',
    glow: 'rgba(212, 176, 64, 0.2)',
    border: 'rgba(212, 176, 64, 0.24)',
    text: '#E4CC70',
  },
  'Dome Lights': {
    accent: '#3DAAAA',
    bg: '#081A1A',
    glow: 'rgba(61, 170, 170, 0.18)',
    border: 'rgba(61, 170, 170, 0.22)',
    text: '#60C4C4',
  },
  'Circle brackets': {
    accent: '#7878B8',
    bg: '#101020',
    glow: 'rgba(120, 120, 184, 0.18)',
    border: 'rgba(120, 120, 184, 0.22)',
    text: '#9898CC',
  },
  'Air Wall Track': {
    accent: '#C44A5A',
    bg: '#1E0A10',
    glow: 'rgba(196, 74, 90, 0.18)',
    border: 'rgba(196, 74, 90, 0.22)',
    text: '#D46878',
  },
  'Clamp brackets tree': {
    accent: '#5AAA5A',
    bg: '#0C1A0C',
    glow: 'rgba(90, 170, 90, 0.18)',
    border: 'rgba(90, 170, 90, 0.22)',
    text: '#7ACA7A',
  },
};

export const DEFAULT_CASE_COLOR: CaseColorDef = {
  accent: '#888898',
  bg: '#14141C',
  glow: 'rgba(136, 136, 152, 0.15)',
  border: 'rgba(136, 136, 152, 0.2)',
  text: '#AAAABC',
};

export function getCaseColor(type: string, customColor?: string): CaseColorDef {
  if (customColor) {
    return {
      accent: customColor,
      bg: '#14141C',
      glow: `${customColor}28`,
      border: `${customColor}38`,
      text: customColor,
    };
  }
  return CASE_TYPE_COLORS[type] ?? DEFAULT_CASE_COLOR;
}

export const STAGE_COLORS = {
  invoice: {
    accent: '#B8956A',
    bg: '#1A1510',
    border: 'rgba(184, 149, 106, 0.2)',
    label: 'Invoice',
    dot: '#C4A370',
  },
  charging: {
    accent: '#4A90C4',
    bg: '#0E1820',
    border: 'rgba(74, 144, 196, 0.2)',
    label: 'Charging',
    dot: '#5AABDC',
  },
  prepped: {
    accent: '#4AB068',
    bg: '#0E1C14',
    border: 'rgba(74, 176, 104, 0.2)',
    label: 'Prepped',
    dot: '#5AC878',
  },
  loaded: {
    accent: '#C4944A',
    bg: '#1E1608',
    border: 'rgba(196, 148, 74, 0.2)',
    label: 'Loaded',
    dot: '#D4AE60',
  },
};
