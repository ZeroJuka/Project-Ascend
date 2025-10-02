import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../utils/theme'

type BadgeProps = {
  children: React.ReactNode
  style?: ViewStyle
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info'
}

export default function Badge({ children, style, tone = 'brand' }: BadgeProps) {
  const toneStyles = {
    brand: { backgroundColor: '#1F2937', borderColor: '#374151', color: colors.primary },
    success: { backgroundColor: '#042F2E', borderColor: '#064E3B', color: colors.success },
    warning: { backgroundColor: '#3F2F0E', borderColor: '#A16207', color: colors.warning },
    danger: { backgroundColor: '#3F0F0F', borderColor: '#7F1D1D', color: colors.danger },
    info: { backgroundColor: '#0B2545', borderColor: '#1E3A8A', color: colors.info },
  }[tone]

  return (
    <View style={[styles.base, { backgroundColor: toneStyles.backgroundColor, borderColor: toneStyles.borderColor }, style]}>
      <Text style={[styles.text, { color: toneStyles.color }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
  },
})