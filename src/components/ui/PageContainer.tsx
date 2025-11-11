import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, StyleSheet } from 'react-native'
import Footer from '../Footer'
import { theme, spacing } from '../../utils/theme'
import { useResponsive } from '../../hooks/useResponsive'

type PageContainerProps = {
  title?: string
  activeScreen?: Parameters<typeof Footer>[0]['activeScreen']
  showProfileButton?: boolean
  onProfilePress?: () => void
  showFooter?: boolean
  children: React.ReactNode
}

type TesteContainerProps = {
  title?: string
  activeScreen?: Parameters<typeof Footer>[0]['activeScreen']
  showProfileButton?: boolean
  onProfilePress?: () => void
  showFooter?: boolean
  children: React.ReactNode
}


export default function PageContainer({ title, activeScreen, showProfileButton = true, onProfilePress, showFooter = true, children }: PageContainerProps) {
  const { grid } = useResponsive()
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header removido para visual moderno e limpo */}
      <View style={[
        styles.content,
        { paddingHorizontal: grid.containerPadding, paddingBottom: showFooter ? 88 : spacing.md }
      ]}
      >
        {children}
      </View>
      {showFooter && <Footer activeScreen={activeScreen} />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  // Como o header foi removido, reduzimos o espaçamento superior
  content: { flex: 1, paddingTop: spacing.md },
})