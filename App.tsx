import React from 'react'
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext'
import { I18nProvider } from './src/contexts/I18nContext'
import BottomTabNavigator from './src/navigation/BottomTabNavigator'
import AuthScreen from './src/screens/AuthScreen'
import ChatScreen from './src/screens/ChatScreen'
import UserScreen from './src/screens/UserScreen'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { user, loading } = useAuth()
  const { theme } = useSettings()

  if (loading) {
    return null // Or a loading screen
  }

  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="User" component={UserScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <I18nProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </I18nProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}
