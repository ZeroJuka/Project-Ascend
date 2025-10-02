import React from 'react'
import { View, TextInput, StyleSheet, ViewStyle, TextInputProps } from 'react-native'
import { colors, spacing, borderRadius } from '../../utils/theme'

type InputProps = TextInputProps & {
  containerStyle?: ViewStyle
  left?: React.ReactNode
  right?: React.ReactNode
}

export default function Input({ containerStyle, left, right, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {left}
      <TextInput
        placeholderTextColor={colors.light.subtext}
        style={[styles.input, style]}
        {...props}
      />
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.light.text,
  },
})