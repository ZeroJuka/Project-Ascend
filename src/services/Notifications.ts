import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotificationsAsync() {
  let token

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!')
      return
    }
    // token = (await Notifications.getExpoPushTokenAsync()).data
    // console.log(token)
  } else {
    console.log('Must use physical device for Push Notifications')
  }

  return token
}

export async function scheduleBillNotification(billId: string, title: string, dueDate: string) {
  const date = new Date(dueDate)
  
  // 5 Days before
  const date5DaysBefore = new Date(date)
  date5DaysBefore.setDate(date.getDate() - 5)
  date5DaysBefore.setHours(9, 0, 0, 0) // 9 AM

  if (date5DaysBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `bill-${billId}-5days`,
      content: {
        title: 'Bill Due Soon',
        body: `Your bill "${title}" is due in 5 days.`,
        data: { billId },
      },
      trigger: date5DaysBefore,
    })
  }

  // 1 Day before
  const date1DayBefore = new Date(date)
  date1DayBefore.setDate(date.getDate() - 1)
  date1DayBefore.setHours(9, 0, 0, 0) // 9 AM

  if (date1DayBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `bill-${billId}-1day`,
      content: {
        title: 'Bill Due Tomorrow',
        body: `Your bill "${title}" is due tomorrow!`,
        data: { billId },
      },
      trigger: date1DayBefore,
    })
  }
}

export async function cancelBillNotifications(billId: string) {
  await Notifications.cancelScheduledNotificationAsync(`bill-${billId}-5days`)
  await Notifications.cancelScheduledNotificationAsync(`bill-${billId}-1day`)
}

export async function sendGoalAlert(goalTitle: string, progress: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Goal Progress Alert',
      body: `You are close to reaching your goal "${goalTitle}" (${progress.toFixed(0)}%)!`,
      data: { goalTitle },
    },
    trigger: null, // Immediate
  })
}
