import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'

export async function setupNotifications(): Promise<boolean> {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;



  if (Platform.OS === 'android' && isExpoGo) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      })
      
      // Channel is required for Android notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    } catch (e) {
      console.warn('Failed to set notification handler/channel in Expo Go', e)
    }

    return true; 
  }

  // Standard setup for iOS and Android Builds
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
    } catch (error) {
       console.log('Error setting notification channel:', error)
    }
  }

  // ... rest of the function

  // Local notifications work on simulators too, so we try getting permissions regardless of device type
  if (!Device.isDevice) {
    console.log('Running on simulator - local notifications should work, but push notifications will not.')
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions!')
      return false
    }
    return true
  } catch (error) {
    console.log('Error getting notification permissions:', error)
    return false
  }
}

export async function scheduleBillNotification(billId: string, title: string, dueDate: string): Promise<void> {
  const date = new Date(dueDate)
  
  // Validate date
  if (isNaN(date.getTime())) {
    console.error('Invalid due date provided for notification scheduling')
    return
  }

  // 5 Days before
  const date5DaysBefore = new Date(date)
  date5DaysBefore.setDate(date.getDate() - 5)
  date5DaysBefore.setHours(9, 0, 0, 0) // 9 AM

  if (date5DaysBefore > new Date()) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `bill-${billId}-5days`,
        content: {
          title: 'Bill Due Soon',
          body: `Your bill "${title}" is due in 5 days.`,
          data: { billId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          year: date5DaysBefore.getFullYear(),
          month: date5DaysBefore.getMonth() + 1,
          day: date5DaysBefore.getDate(),
          hour: date5DaysBefore.getHours(),
          minute: date5DaysBefore.getMinutes(),
        },
      })
    } catch (e) {
      console.error('Failed to schedule 5-day notification', e)
    }
  }

  // 1 Day before
  const date1DayBefore = new Date(date)
  date1DayBefore.setDate(date.getDate() - 1)
  date1DayBefore.setHours(9, 0, 0, 0) // 9 AM

  if (date1DayBefore > new Date()) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `bill-${billId}-1day`,
        content: {
          title: 'Bill Due Tomorrow',
          body: `Your bill "${title}" is due tomorrow!`,
          data: { billId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          year: date1DayBefore.getFullYear(),
          month: date1DayBefore.getMonth() + 1,
          day: date1DayBefore.getDate(),
          hour: date1DayBefore.getHours(),
          minute: date1DayBefore.getMinutes(),
        },
      })
    } catch (e) {
      console.error('Failed to schedule 1-day notification', e)
    }
  }
}

export async function cancelBillNotifications(billId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`bill-${billId}-5days`)
    await Notifications.cancelScheduledNotificationAsync(`bill-${billId}-1day`)
  } catch (e) {
    console.error('Failed to cancel notifications', e)
  }
}

export async function sendGoalAlert(goalTitle: string, progress: number): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal Progress Alert',
        body: `You are close to reaching your goal "${goalTitle}" (${progress.toFixed(0)}%)!`,
        data: { goalTitle },
      },
      trigger: null, // Immediate
    })
  } catch (e) {
    console.error('Failed to send goal alert', e)
  }
}
