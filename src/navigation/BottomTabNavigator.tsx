import React from 'react'
import { TouchableOpacity, StyleSheet, View, Text, Platform, Dimensions, Alert } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const insets = useSafeAreaInsets()
  const [recordingTimer, setRecordingTimer] = React.useState<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clean up any active recording when component unmounts
      if (isRecording) {
        console.log('Cleaning up active recording on unmount')
        voiceTranscriptionService.forceStopRecording()
      }
      if (recordingTimer) {
        clearTimeout(recordingTimer)
      }
    }
  }, [])

  const handlePress = () => {
    // Simple tap navigates to chat
    navigation.navigate('Chat')
  }

  const handleLongPress = async () => {
    // Prevent multiple simultaneous recording attempts
    if (isRecording || voiceTranscriptionService.getIsRecording()) {
      console.log('Recording already in progress, ignoring long press')
      return
    }
    
    console.log('Long press detected - waiting 2 seconds before starting recording...')
    
    // Start a 2-second timer before recording begins
    const startTimer = setTimeout(async () => {
      try {
        console.log('2 seconds elapsed - starting voice recording...')
        setIsRecording(true)
        
        await voiceTranscriptionService.startRecording()
        console.log('Voice recording started successfully')
        
        // Auto-stop recording after 10 seconds for safety (total 12 seconds from press)
        const maxTimer = setTimeout(async () => {
          if (isRecording || voiceTranscriptionService.getIsRecording()) {
            console.log('Auto-stopping recording after 10 seconds of recording')
            await stopRecordingAndNavigate()
          }
        }, 10000)
        setRecordingTimer(maxTimer)
        
      } catch (error) {
        console.error('Failed to start recording:', error)
        setIsRecording(false)
        
        // Show user-friendly feedback
        Alert.alert(
          'Voice Recording',
          'Unable to start voice recording. Please ensure microphone permissions are granted and try again.',
          [{ text: 'OK' }]
        )
      }
    }, 1000) // Wait 1 second before starting recording
    
    setRecordingTimer(startTimer)
  }

  const handlePressOut = async () => {
    // Check if we have a pending start timer (user released before 2 seconds)
    if (recordingTimer && !isRecording) {
      console.log('User released before recording started - canceling start timer')
      clearTimeout(recordingTimer)
      setRecordingTimer(null)
      return
    }
    
    if (isRecording) {
      console.log('Handling press out - stopping recording')
      await stopRecordingAndNavigate()
    } else {
      console.log('Press out but not recording - ignoring')
    }
  }

  const stopRecordingAndNavigate = async () => {
    try {
      // Clear any pending timers
      if (recordingTimer) {
        clearTimeout(recordingTimer)
        setRecordingTimer(null)
      }
      
      console.log('Stopping recording and preparing to navigate...')
      setIsRecording(false)
      
      // Only try to stop recording if we actually have an active recording
      if (voiceTranscriptionService.getIsRecording()) {
        const transcription = await voiceTranscriptionService.stopRecording()
        
        if (transcription && transcription.trim()) {
          // Navigate to chat screen with the transcription
          console.log('Navigating to chat with transcription:', transcription)
          navigation.navigate('Chat', { voiceMessage: transcription })
        } else {
          console.log('No transcription available, navigating to chat without message')
          // Still navigate to chat even if no transcription
          navigation.navigate('Chat')
        }
      } else {
        console.log('No active recording to stop, just navigating to chat')
        // Just navigate to chat if no recording was active
        navigation.navigate('Chat')
      }
    } catch (error) {
      console.error('Failed to process voice:', error)
      // Still navigate to chat even if transcription failed
      navigation.navigate('Chat')
    } finally {
      setIsRecording(false)
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.aiButton,
        isRecording && styles.aiButtonRecording,
        { bottom: 20 + insets.bottom }
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      delayLongPress={500}
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
  const insets = useSafeAreaInsets()
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 10,
          borderRadius: 25,
          marginHorizontal: 16,
          marginBottom: 16,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 15,
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
            // Don't navigate here - AIButton handles its own navigation
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
    position: 'absolute',
    zIndex: 1000,
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