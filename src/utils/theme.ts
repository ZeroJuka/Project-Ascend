export const colors = {
  // Brand
  primary: '#2563EB', // Blue 600
  secondary: '#22D3EE', // Cyan 400
  accent: '#60A5FA', // Blue 400
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  overlay: 'rgba(0,0,0,0.5)',
  
  // Light theme
  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    subtext: '#4B5563',
    card: '#FFFFFF',
    border: '#E5E7EB'
  },
  
  // Dark theme
  dark: {
    background: '#0B1220',
    text: '#E5E7EB',
    subtext: '#9CA3AF',
    card: '#111827',
    border: '#1F2937'
  }
};

// Default theme (light mode)
export const theme = {
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.light.background,
    text: colors.light.text,
    subtext: colors.light.subtext,
    card: colors.light.card,
    border: colors.light.border
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
};

export const borderRadius = {
  sm: 5,
  md: 10,
  lg: 15,
  xl: 20,
  round: 9999
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800'
};

// Elevation and shadow system for consistent depth
export const elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
};

// Responsive breakpoints (used by hooks or styles)
export const breakpoints = {
  sm: 360,
  md: 600,
  lg: 900,
};

// Unified chart theme used across analytics visualizations
export const chartTheme = {
  backgroundGradientFrom: colors.light.card,
  backgroundGradientTo: colors.light.card,
  color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  fillShadowGradient: colors.primary,
  fillShadowGradientOpacity: 0.3,
  decimalPlaces: 0,
  propsForBackgroundLines: {
    stroke: colors.light.border,
    strokeDasharray: '3,3',
  },
};

// Brand gradients for hero headers and cards
export const gradients = {
  brand: {
    from: '#93C5FD', // blue-300
    to: '#2563EB',   // blue-600
  },
  subtle: {
    from: '#FFFFFF',
    to: '#F1F5F9',
  },
  teal: {
    from: '#2DD4BF', // teal-400
    to: '#14B8A6',   // teal-500/600
  },
  info: {
    from: '#60A5FA', // blue-400
    to: '#2563EB',   // blue-600
  }
};