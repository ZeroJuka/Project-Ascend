import React from 'react'
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { voiceTranscriptionService } from '../services/VoiceTranscriptionService'
import HomeScreen from '../screens/HomeScreen'
import TransactionsScreen from '../screens/TransactionsScreen'
import GoalsScreen from '../screens/GoalsScreen'
import ChatScreen from '../screens/ChatScreen'
import DashboardScreen from '../screens/DashboardScreen'

const Tab = createBottomTabNavigator()

function AIButton() {
  const navigation = useNavigation()
  const [isRecording, setIsRecording] = React.useState(false)

  const handlePressIn = async () => {
    try {
      setIsRecording(true)
      await voiceTranscriptionService.startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsRecording(false)
    }
  }

  const handlePressOut = async () => {
    try {
      setIsRecording(false)
      const transcription = await voiceTranscriptionService.stopRecording()
      
      if (transcription.trim()) {
        // Navigate to chat screen with the transcription
        navigation.navigate('Chat', { voiceMessage: transcription })
      }
    } catch (error) {
      console.error('Failed to process voice:', error)
    }
  }

  const handleTap = () => {
    navigation.navigate('Chat')
  }

  return (
    <TouchableOpacity
      style={[
        styles.aiButton,
        isRecording && styles.aiButtonRecording
      ]}
      onPress={handleTap}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={300}
    >
      <Ionicons
        name={isRecording ? 'mic' : 'sparkles'}
        size={28}
        color="#fff"
      />
      {isRecording && (
        <View style={styles.recordingIndicator} />
      )}
    </TouchableOpacity>
  )
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AI"
        component={View} // Dummy component since we handle this manually
        options={{
          tabBarIcon: () => <AIButton />,
          tabBarLabel: () => null,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            navigation.navigate('Chat')
          },
        })}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  aiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonRecording: {
    backgroundColor: '#FF6B6B',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
})