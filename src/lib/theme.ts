/**
 * Accent-color theming. Each preset is a full 50–900 ramp (space-separated RGB
 * triplets). `applyTheme` writes them to the `--brand-*` CSS variables that the
 * Tailwind `brand` palette reads, so buttons/links/active menu/brand recolor
 * app-wide (and on the login page) with no rebuild.
 */
type Ramp = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export const THEME_PRESETS: Record<string, { label: string; ramp: Ramp }> = {
  indigo: {
    label: 'Indigo',
    ramp: {
      50: '238 244 255', 100: '217 230 255', 200: '188 211 255', 300: '143 181 255',
      400: '91 141 250', 500: '59 111 224', 600: '47 89 189', 700: '38 74 156',
      800: '35 63 128', 900: '32 56 107',
    },
  },
  blue: {
    label: 'Blue',
    ramp: {
      50: '239 246 255', 100: '219 234 254', 200: '191 219 254', 300: '147 197 253',
      400: '96 165 250', 500: '59 130 246', 600: '37 99 235', 700: '29 78 216',
      800: '30 64 175', 900: '30 58 138',
    },
  },
  emerald: {
    label: 'Emerald',
    ramp: {
      50: '236 253 245', 100: '209 250 229', 200: '167 243 208', 300: '110 231 183',
      400: '52 211 153', 500: '16 185 129', 600: '5 150 105', 700: '4 120 87',
      800: '6 95 70', 900: '6 78 59',
    },
  },
  teal: {
    label: 'Teal',
    ramp: {
      50: '240 253 250', 100: '204 251 241', 200: '153 246 228', 300: '94 234 212',
      400: '45 212 191', 500: '20 184 166', 600: '13 148 136', 700: '15 118 110',
      800: '17 94 89', 900: '19 78 74',
    },
  },
  violet: {
    label: 'Violet',
    ramp: {
      50: '245 243 255', 100: '237 233 254', 200: '221 214 254', 300: '196 181 253',
      400: '167 139 250', 500: '139 92 246', 600: '124 58 237', 700: '109 40 217',
      800: '91 33 182', 900: '76 29 149',
    },
  },
  rose: {
    label: 'Rose',
    ramp: {
      50: '255 241 242', 100: '255 228 230', 200: '254 205 211', 300: '253 164 175',
      400: '251 113 133', 500: '244 63 94', 600: '225 29 72', 700: '190 18 60',
      800: '159 18 57', 900: '136 19 55',
    },
  },
  amber: {
    label: 'Amber',
    ramp: {
      50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77',
      400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 700: '180 83 9',
      800: '146 64 14', 900: '120 53 15',
    },
  },
};

export const THEME_KEYS = Object.keys(THEME_PRESETS);

/** Swatch color (the 600 shade) for a preset, as a CSS rgb() string. */
export function themeSwatch(key: string): string {
  const ramp = (THEME_PRESETS[key] ?? THEME_PRESETS.indigo).ramp;
  return `rgb(${ramp[600]})`;
}

/** Write a preset's ramp to the --brand-* CSS variables on <html>. */
export function applyTheme(key: string): void {
  const preset = THEME_PRESETS[key] ?? THEME_PRESETS.indigo;
  const root = document.documentElement;
  (Object.keys(preset.ramp) as unknown as (keyof Ramp)[]).forEach((shade) => {
    root.style.setProperty(`--brand-${shade}`, preset.ramp[shade]);
  });
}
