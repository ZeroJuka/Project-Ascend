import React from 'react'
import { View, StyleSheet, ViewProps } from 'react-native'
import { colors, spacing, borderRadius, elevation } from '../../utils/theme'

type CardProps = ViewProps & {
  children: React.ReactNode
}

export default function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, elevation.sm, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
})