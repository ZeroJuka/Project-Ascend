import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'
import { colors, spacing, borderRadius, fontSize, elevation } from '../../utils/theme'

type ButtonProps = {
  title: string
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  style?: ViewStyle
  textStyle?: TextStyle
  disabled?: boolean
}

export default function Button({ title, onPress, variant = 'primary', style, textStyle, disabled }: ButtonProps) {
  const base = [styles.button, elevation.md]
  const variantStyle =
    variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[...base, variantStyle, disabled && styles.disabled, style]}
    >
      <Text style={[styles.text, variant === 'ghost' ? styles.textGhost : styles.textDefault, textStyle]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  textDefault: {
    color: colors.light.card === '#FFFFFF' ? '#fff' : colors.light.text
  },
  textGhost: {
    color: colors.light.text,
  },
  disabled: {
    opacity: 0.6,
  },
})