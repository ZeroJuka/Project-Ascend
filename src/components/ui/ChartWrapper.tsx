import React from 'react'
import { View, StyleSheet } from 'react-native'
import { chartTheme, spacing, borderRadius, colors } from '../../utils/theme'

type ChartWrapperProps = {
  children: React.ReactNode
}

export default function ChartWrapper({ children }: ChartWrapperProps) {
  return <View style={styles.container}>{children}</View>
}

export const chartConfig = {
  backgroundGradientFrom: chartTheme.backgroundGradientFrom,
  backgroundGradientTo: chartTheme.backgroundGradientTo,
  color: chartTheme.color,
  labelColor: chartTheme.labelColor,
  fillShadowGradient: chartTheme.fillShadowGradient,
  fillShadowGradientOpacity: chartTheme.fillShadowGradientOpacity,
  decimalPlaces: chartTheme.decimalPlaces,
  propsForBackgroundLines: chartTheme.propsForBackgroundLines,
  propsForLabels: { fontSize: 10 },
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.light.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
})