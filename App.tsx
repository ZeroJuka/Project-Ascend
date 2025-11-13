import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import BottomTabNavigator from './src/navigation/BottomTabNavigator'
import AuthScreen from './src/screens/AuthScreen'
import ChatScreen from './src/screens/ChatScreen'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return null // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} />
            <Stack.Screen name="Chat" component={ChatScreen} />
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
      <StatusBar style="auto" />
      <AppNavigator />
    </AuthProvider>
  )
}