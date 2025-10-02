import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize } from '../../utils/theme'

type ChipProps = {
  label: string
  active?: boolean
  onPress?: () => void
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Chip({ label, active, onPress, style, textStyle }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active ? styles.active : styles.inactive, style]}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive, textStyle]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  active: {
    backgroundColor: colors.primary,
  },
  inactive: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  textActive: {
    color: '#fff',
  },
  textInactive: {
    color: colors.light.subtext,
  },
})