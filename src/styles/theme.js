// src/styles/theme.js
// Design tokens — deep navy / warm gold palette for a formal membership register.

export const Colors = {
  // Core brand
  navy:         '#0A1628',
  navyLight:    '#162440',
  navyMid:      '#1C3058',
  navySubtle:   '#243B6E',

  // Gold accents
  gold:         '#C9A84C',
  goldLight:    '#DDB96A',
  goldPale:     '#F5EDD2',
  goldFaint:    '#FBF7ED',

  // Surfaces
  white:        '#FFFFFF',
  offWhite:     '#F7F5F0',
  surface:      '#FFFFFF',
  surfaceRaised:'#FDFCFA',

  // Greyscale
  grey50:       '#F9F7F4',
  grey100:      '#EDEBE6',
  grey200:      '#DDD9D2',
  grey300:      '#C4BEB4',
  grey400:      '#A09891',
  grey500:      '#7A736A',
  grey600:      '#5A544D',
  grey700:      '#3D3830',

  // Semantic
  danger:       '#B83232',
  dangerLight:  '#FDEAEA',
  dangerBorder: '#E88080',
  success:      '#1E6B40',
  successLight: '#E6F4EC',
  successBorder:'#6DBF8A',
  warning:      '#A06820',
  warningLight: '#FEF3E2',

  // Input states
  inputBorder:      '#D4CFC8',
  inputBorderFocus: '#C9A84C',
  inputBg:          '#FFFFFF',
  inputBgFocus:     '#FFFDF7',

  // Misc
  divider:  '#E8E4DC',
  overlay:  'rgba(10,22,40,0.55)',
};

export const Typography = {
  sizes: {
    xs:   11,
    sm:   13,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  24,
    hero: 30,
  },
  weights: {
    regular: '400',
    medium:  '500',
    semibold:'600',
    bold:    '700',
    black:   '800',
  },
};

export const Spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const Radii = {
  xs:   3,
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  pill: 999,
};

export const Shadows = {
  subtle: {
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 3,
  },
  lifted: {
    shadowColor: '#0A1628',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 7,
  },
};

export default { Colors, Typography, Spacing, Radii, Shadows };
