import { useEffect, useMemo, useState } from 'react'
import { Dimensions } from 'react-native'
import { breakpoints, spacing } from '../utils/theme'

export type Breakpoint = 'sm' | 'md' | 'lg'

export function useResponsive() {
  const [width, setWidth] = useState(Dimensions.get('window').width)

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWidth(window.width)
    })
    return () => {
      sub?.remove?.() //Tira esse listener da mudança
    }
  }, [])

  const bp: Breakpoint = width < breakpoints.sm ? 'sm' : width < breakpoints.md ? 'md' : 'lg'

  const containerPadding = useMemo(() => {
    switch (bp) {
      case 'sm':
        return spacing.sm
      case 'md':
        return spacing.md
      default:
        return spacing.lg
    }
  }, [bp])

  const maxContentWidth = useMemo(() => {
    switch (bp) {
      case 'sm':
        return Math.min(width, 480)
      case 'md':
        return Math.min(width, 720)
      default:
        return Math.min(width, 960)
    }
  }, [bp, width])

  const columns = useMemo(() => {
    switch (bp) {
      case 'sm':
        return 1
      case 'md':
        return 2
      default:
        return 3
    }
  }, [bp])

  const grid = useMemo(() => {
    return {
      columns,
      gutter: spacing.sm,
      containerPadding,
      maxContentWidth,
    }
  }, [columns, containerPadding, maxContentWidth])

  return {
    width,
    breakpoint: bp,
    isSmall: bp === 'sm',
    isMedium: bp === 'md',
    isLarge: bp === 'lg',
    containerPadding,
    maxContentWidth,
    columns,
    grid,
  }
}