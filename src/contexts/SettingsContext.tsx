import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type ThemeMode = 'light' | 'dark'
type LanguageCode = 'en' | 'pt-BR'

interface SettingsContextType {
  theme: ThemeMode
  language: LanguageCode
  displayName: string | null
  avatarUri: string | null
  setTheme: (t: ThemeMode) => Promise<void>
  setLanguage: (l: LanguageCode) => Promise<void>
  setDisplayName: (n: string) => Promise<void>
  setAvatarUri: (u: string) => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const KEY_THEME = 'settings:theme'
const KEY_LANG = 'settings:language'
const KEY_NAME = 'settings:name'
const KEY_AVATAR = 'settings:avatar'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [language, setLanguageState] = useState<LanguageCode>('pt-BR')
  const [displayName, setDisplayNameState] = useState<string | null>(null)
  const [avatarUri, setAvatarUriState] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [t, l, n, a] = await Promise.all([
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_LANG),
          AsyncStorage.getItem(KEY_NAME),
          AsyncStorage.getItem(KEY_AVATAR),
        ])
        if (t === 'dark' || t === 'light') setThemeState(t)
        if (l === 'pt-BR' || l === 'en') setLanguageState(l)
        if (n && n.trim()) setDisplayNameState(n)
        if (a && a.trim()) setAvatarUriState(a)
      } catch {}
    })()
  }, [])

  const setTheme = async (t: ThemeMode) => {
    setThemeState(t)
    try { await AsyncStorage.setItem(KEY_THEME, t) } catch {}
  }

  const setLanguage = async (l: LanguageCode) => {
    setLanguageState(l)
    try { await AsyncStorage.setItem(KEY_LANG, l) } catch {}
  }

  const setDisplayName = async (n: string) => {
    setDisplayNameState(n)
    try { await AsyncStorage.setItem(KEY_NAME, n) } catch {}
  }

  const setAvatarUri = async (u: string) => {
    setAvatarUriState(u)
    try { await AsyncStorage.setItem(KEY_AVATAR, u) } catch {}
  }

  return (
    <SettingsContext.Provider value={{ theme, language, displayName, avatarUri, setTheme, setLanguage, setDisplayName, setAvatarUri }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
