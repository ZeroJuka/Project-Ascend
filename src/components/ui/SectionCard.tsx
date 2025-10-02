import React from 'react'
import { View, Text, StyleSheet, ViewProps } from 'react-native'
import { colors, spacing, borderRadius, theme } from '../../utils/theme'

type SectionCardProps = ViewProps & {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

export default function SectionCard({ title, subtitle, right, style, children, ...rest }: SectionCardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {(title || right) && (
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.subtext,
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    // spacing handled by children
  },
})