import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
  Animated,
  Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

const Logo = require('../../assets/logo_nobackground.png')
import { useAuth } from '../contexts/AuthContext'
import { useIsFocused } from '@react-navigation/native'
import GoalManager from '../components/GoalManager'
import { useI18n } from '../contexts/I18nContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettings } from '../contexts/SettingsContext'
import { formatCurrency } from '../utils/currency'
import { scheduleBillNotification, cancelBillNotifications, sendGoalAlert } from '../services/Notifications'

interface Goal {
  id: string
  title: string
  description: string | null
  target_amount: number
  current_amount: number
  goal_type: 'spend_less' | 'spend_more' | 'save'
  time_period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'
  start_date: string
  end_date: string | null
  is_recurring: boolean
  category_ids: string[] | null
  progress: number
}

interface Bill {
  id: string
  title: string
  amount: number
  due_date: string
  frequency: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  is_paid: boolean
  paid_date: string | null
  category_id: string | null
  category: {
    name: string
    color: string
    icon: string
  }
}

export default function GoalsScreen() {
  const [activeTab, setActiveTab] = useState<'goals' | 'bills'>('goals')
  const [goals, setGoals] = useState<Goal[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [modalType, setModalType] = useState<'goal' | 'bill'>('goal')
  const [categories, setCategories] = useState<any[]>([])
  const [goalManagerVisible, setGoalManagerVisible] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false)
  const [editGoalTitle, setEditGoalTitle] = useState('')
  const [editGoalTarget, setEditGoalTarget] = useState('')
  const { user } = useAuth()
  const isFocused = useIsFocused()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const { language } = useSettings()

  const safeFormatCurrency = (amount: number) => {
    try {
      return formatCurrency(amount, language)
    } catch {
      const prefix = language === 'pt-BR' ? 'R$ ' : '$'
      return `${prefix}${Number(amount || 0).toFixed(2)}`
    }
  }

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [goalType, setGoalType] = useState<'spend_less' | 'spend_more' | 'save'>('spend_less')
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'>('monthly')
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [dueDate, setDueDate] = useState('')
  const [frequency, setFrequency] = useState<'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [billFilterCategoryId, setBillFilterCategoryId] = useState<string | null>(null)
  const [showPaidBills, setShowPaidBills] = useState(false)
  const [animatingBills, setAnimatingBills] = useState<string[]>([])

  const handleDateChange = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '')
    
    // Format based on language
    let formatted = cleaned
    if (cleaned.length > 0) {
      if (cleaned.length <= 2) {
        formatted = cleaned
      } else if (cleaned.length <= 4) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
      } else {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
      }
    }
    setDueDate(formatted)
  }

  const parseDateToISO = (dateStr: string) => {
    if (dateStr.length !== 10) return null
    
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null

    let day, month, year
    
    if (language === 'pt-BR') {
      // DD/MM/YYYY
      [day, month, year] = parts
    } else {
      // MM/DD/YYYY
      [month, day, year] = parts
    }

    const isoDate = `${year}-${month}-${day}`
    const date = new Date(isoDate)
    
    // Check if valid date
    if (isNaN(date.getTime())) return null
    
    return isoDate
  }

  useEffect(() => {
    fetchGoals()
    fetchBills()
    fetchCategories()
  }, [])

  // Refresh data when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchGoals()
      fetchBills()
    }
  }, [isFocused])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchGoals(), fetchBills()])
    setRefreshing(false)
  }

  const getBillSections = () => {
    let filteredBills = bills
    
    // Filter Paid Bills
    if (!showPaidBills) {
      filteredBills = filteredBills.filter(b => !b.is_paid)
    }

    // Filter by Category
    if (billFilterCategoryId) {
      filteredBills = filteredBills.filter(b => b.category_id === billFilterCategoryId)
    }

    // Group by Month
    const grouped = filteredBills.reduce((acc, bill) => {
      const date = new Date(bill.due_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(bill)
      return acc
    }, {} as Record<string, Bill[]>)

    // Create Sections
    const sections = Object.entries(grouped).map(([key, data]) => {
      const [year, month] = key.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      const monthName = date.toLocaleString(language === 'pt-BR' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })
      
      // Sort within month: Unpaid first, then by date DESCENDING (as requested)
      const sortedData = data.sort((a, b) => {
        if (a.is_paid === b.is_paid) {
          // Decreasing due date (Newest first)
          return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
        }
        return a.is_paid ? 1 : -1
      })

      return {
        title: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        data: sortedData,
        key
      }
    })

    // Sort sections by date (Descending)
    return sections.sort((a, b) => b.key.localeCompare(a.key))
  }

  const getBillFilterCategories = () => {
    const uniqueCategoryIds = Array.from(new Set(bills.map(b => b.category_id).filter(Boolean)))
    return categories.filter(c => uniqueCategoryIds.includes(c.id))
  }

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate progress for each goal
      const goalsWithProgress = await Promise.all(
        (data || []).map(async (goal) => {
          const progress = await calculateGoalProgress(goal)
          
          // Check for notifications
          if (progress >= 90 && progress < 100) {
            const alertKey = `alerted_goal_${goal.id}`
            const hasAlerted = await AsyncStorage.getItem(alertKey)
            
            if (!hasAlerted) {
              await sendGoalAlert(goal.title, progress)
              await AsyncStorage.setItem(alertKey, 'true')
            }
          } else if (progress < 90) {
            // Reset if progress drops
            await AsyncStorage.removeItem(`alerted_goal_${goal.id}`)
          }

          return { ...goal, progress }
        })
      )

      setGoals(goalsWithProgress)
    } catch (error) {
      console.error('Error fetching goals:', error)
    }
  }

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true })

      if (error) throw error
      setBills(data || [])
    } catch (error) {
      console.error('Error fetching bills:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user?.id},is_default.eq.true`)

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const calculateGoalProgress = async (goal: any) => {
    try {
      // Get transactions for the goal's time period
      const startDate = new Date(goal.start_date)
      const endDate = goal.end_date ? new Date(goal.end_date) : new Date()

      // Fetch goal categories
      const { data: goalCategories } = await supabase
        .from('goal_categories')
        .select('category_id')
        .eq('goal_id', goal.id)

      const categoryIds = goalCategories?.map(gc => gc.category_id) || []
      
      let query = supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])

      // If goal has specific categories, filter by them
      if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      }

      const { data: transactions } = await query

      if (!transactions) return 0

      let currentAmount = 0
      if (goal.goal_type === 'spend_less' || goal.goal_type === 'spend_more') {
        currentAmount = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      } else if (goal.goal_type === 'save') {
        const income = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        const expenses = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        currentAmount = income - expenses
      }

      // Update goal current amount
      goal.current_amount = currentAmount

      // Calculate progress percentage
      let percentage = 0
      if (goal.target_amount > 0) {
        percentage = (currentAmount / goal.target_amount) * 100
      }

      if (goal.goal_type === 'spend_less') {
        return percentage
      } else if (goal.goal_type === 'spend_more') {
        return percentage
      } else {
        return percentage
      }
    } catch (error) {
      console.error('Error calculating goal progress:', error)
      return 0
    }
  }

  const addGoal = async () => {
    if (!title || !targetAmount) {
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.error_fields'))
      return
    }

    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user?.id,
          title,
          description,
          target_amount: parseFloat(targetAmount),
          goal_type: goalType,
          time_period: timePeriod,
          is_recurring: isRecurring,
          start_date: new Date().toISOString().split('T')[0],
        })

      if (error) throw error

      setModalVisible(false)
      resetForm()
      fetchGoals()
      Alert.alert(t('goals.alert.success_title'), t('goals.alert.success_message'))
    } catch (error) {
      console.error('Error adding goal:', error)
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.error_add'))
    }
  }

  const updateGoal = async () => {
    if (!editingGoal || !editGoalTitle || !editGoalTarget) return

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: editGoalTitle,
          target_amount: parseFloat(editGoalTarget),
        })
        .eq('id', editingGoal.id)

      if (error) throw error

      setEditGoalModalVisible(false)
      setEditingGoal(null)
      fetchGoals()
      Alert.alert(t('goals.alert.success_title'), t('goals.alert.update_success'))
    } catch (error) {
      console.error('Error updating goal:', error)
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.update_error'))
    }
  }

  const deleteGoal = async (id: string) => {
    Alert.alert(
      t('goals.alert.delete_title'),
      t('goals.alert.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('goals').delete().eq('id', id)
              if (error) throw error
              fetchGoals()
            } catch (error) {
              console.error('Error deleting goal:', error)
              Alert.alert(t('goals.alert.error_title'), t('goals.alert.delete_error'))
            }
          }
        }
      ]
    )
  }

  const addBill = async () => {
    if (!title || !targetAmount || !dueDate) {
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.error_fields'))
      return
    }

    const isoDate = parseDateToISO(dueDate)
    if (!isoDate) {
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.error_fields')) // Reuse error fields or add specific date error
      return
    }

    try {
      const { data, error } = await supabase
        .from('bills')
        .insert({
          user_id: user?.id,
          title,
          amount: parseFloat(targetAmount),
          due_date: isoDate,
          frequency,
          category_id: selectedCategory?.id,
        })
        .select()
        .single()

      if (error) throw error
      
      if (data) {
        await scheduleBillNotification(data.id, data.title, data.due_date)
      }

      setModalVisible(false)
      resetForm()
      fetchBills()
      Alert.alert(t('goals.alert.success_title'), t('bills.alert.success_message'))
    } catch (error) {
      console.error('Error adding bill:', error)
      Alert.alert(t('goals.alert.error_title'), t('bills.alert.error_add'))
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setTargetAmount('')
    setGoalType('spend_less')
    setTimePeriod('monthly')
    setIsRecurring(false)
    setSelectedCategory(null)
    setDueDate('')
    setFrequency('monthly')
  }

  const toggleBillPaid = async (bill: Bill) => {
    if (bill.is_paid) return // For now, only handle paying unpaid bills

    try {
      // 1. Mark as paid
      const { error: updateError } = await supabase
        .from('bills')
        .update({
          is_paid: true,
          paid_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', bill.id)

      if (updateError) throw updateError
      
      await cancelBillNotifications(bill.id)

      // 2. Create Transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          amount: bill.amount,
          description: `Bill Payment: ${bill.title}`,
          type: 'expense',
          category_id: (bill as any).category_id, // Assuming category_id is available on bill object
          transaction_date: new Date().toISOString().split('T')[0],
        })
      
      if (txError) console.error('Error creating transaction for bill:', txError)

      // 3. Handle Recurring
      if (bill.frequency !== 'once') {
        const currentDueDate = new Date(bill.due_date)
        let nextDueDate = new Date(currentDueDate)
        
        switch (bill.frequency) {
          case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
          case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
          case 'quarterly': nextDueDate.setMonth(nextDueDate.getMonth() + 3); break;
          case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
        }

        const { data: nextBill, error: recurError } = await supabase
          .from('bills')
          .insert({
            user_id: user?.id,
            title: bill.title,
            amount: bill.amount,
            due_date: nextDueDate.toISOString().split('T')[0],
            frequency: bill.frequency,
            category_id: bill.category_id,
            is_paid: false
          })
          .select()
          .single()
        
        if (recurError) console.error('Error creating next recurring bill:', recurError)
        
        if (nextBill) {
          await scheduleBillNotification(nextBill.id, nextBill.title, nextBill.due_date)
        }
      }

      fetchBills()
      Alert.alert(t('goals.alert.success_title'), t('bills.alert.pay_success'))
    } catch (error) {
      console.error('Error updating bill:', error)
      Alert.alert(t('goals.alert.error_title'), t('bills.alert.pay_error'))
    }
  }

  const deleteBill = async (id: string) => {
    Alert.alert(
      t('bills.alert.delete_title'),
      t('bills.alert.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('bills').delete().eq('id', id)
              if (error) throw error
              await cancelBillNotifications(id)
              fetchBills()
            } catch (error) {
              console.error('Error deleting bill:', error)
              Alert.alert(t('goals.alert.error_title'), t('bills.alert.delete_error'))
            }
          }
        }
      ]
    )
  }

  const getGradientColors = (goal: Goal): readonly [string, string, ...string[]] => {
    const percentage = goal.progress
    
    if (goal.goal_type === 'spend_less') {
      // Spend less: Green if low percentage, turns Red as it approaches/exceeds 100%
      if (percentage >= 100) return ['#FF6B6B', '#FF4757'] // Red gradient
      if (percentage >= 80) return ['#FFA502', '#FF7F50'] // Orange gradient
      return ['#2ED573', '#7BED9F'] // Green gradient
    } else if (goal.goal_type === 'spend_more') {
      // Spend more: Red if low percentage, turns Green as it approaches 100%
      if (percentage >= 100) return ['#2ED573', '#7BED9F'] // Green gradient
      if (percentage >= 50) return ['#FFA502', '#FF7F50'] // Orange gradient
      return ['#FF6B6B', '#FF4757'] // Red gradient
    } else {
      // Save: Red if low percentage, turns Green as it approaches 100%
      if (percentage >= 100) return ['#2ED573', '#7BED9F'] // Green gradient
      if (percentage >= 50) return ['#FFA502', '#FF7F50'] // Orange gradient
      return ['#FF6B6B', '#FF4757'] // Red gradient
    }
  }

  const renderGoal = ({ item }: { item: Goal }) => (
    <TouchableOpacity 
      style={styles.goalItem}
      onLongPress={() => {
        setEditingGoal(item)
        setGoalManagerVisible(true)
      }}
      delayLongPress={500}
    >
      <View style={styles.goalHeader}>
        <View>
          <Text style={styles.goalTitle}>{item.title}</Text>
          <Text style={styles.goalPeriod}>
            {item.time_period} • {item.goal_type.replace('_', ' ')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => deleteGoal(item.id)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={getGradientColors(item)}
            style={[styles.progressFill, { width: `${Math.min(item.progress, 100)}%` } as any]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.progress.toFixed(0)}%
        </Text>
      </View>
      
      <View style={styles.goalStats}>
        <Text style={styles.goalAmount}>
          {safeFormatCurrency(item.current_amount)} / {safeFormatCurrency(item.target_amount)}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderBill = ({ item }: { item: Bill }) => {
    const isAnimating = animatingBills.includes(item.id)
    const scaleAnim = React.useRef(new Animated.Value(2)).current
    const opacityAnim = React.useRef(new Animated.Value(0)).current

    useEffect(() => {
      if (isAnimating) {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.bounce,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start()
      }
    }, [isAnimating])

    return (
      <TouchableOpacity 
        style={[styles.billItem, { overflow: 'hidden' }]}
        onLongPress={() => deleteBill(item.id)}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        {(item.is_paid || isAnimating) && (
          <Animated.View 
            style={[
              styles.paidStampContainer, 
              { 
                transform: isAnimating ? [{ scale: scaleAnim }, { rotate: '-15deg' }] : [{ rotate: '-15deg' }],
                opacity: isAnimating ? opacityAnim : 0.1
              }
            ]} 
            pointerEvents="none"
          >
            <Image 
              source={Logo} 
              style={styles.paidStamp} 
              resizeMode="contain"
            />
          </Animated.View>
        )}
        <View style={styles.billHeader}>
          <View style={[styles.billIcon, { backgroundColor: item.category?.color + '20' }]}>
            <Ionicons name={item.category?.icon as any} size={20} color={item.category?.color} />
          </View>
          <View style={styles.billInfo}>
            <Text style={styles.billTitle}>{item.title}</Text>
            <Text style={styles.billDetails}>
              {t('bills.due_prefix')}{new Date(item.due_date).toLocaleDateString()} • {item.frequency}
            </Text>
          </View>
          <Text style={styles.billAmount}>{safeFormatCurrency(item.amount)}</Text>
        </View>
        
        <View style={styles.billActions}>
          <TouchableOpacity
            style={[
              styles.payButton,
              item.is_paid && styles.payButtonPaid
            ]}
            onPress={() => toggleBillPaid(item)}
            disabled={isAnimating}
          >
            <Text style={[
              styles.payButtonText,
              item.is_paid && styles.payButtonTextPaid
            ]}>
              {item.is_paid ? t('bills.pay.paid') : t('bills.pay.mark')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{t('goals_bills.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (activeTab === 'goals') {
              setGoalManagerVisible(true)
            } else {
              setModalType('bill')
              setModalVisible(true)
            }
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'goals' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'goals' && styles.tabButtonTextActive
          ]}>
            {t('goals.tab')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'bills' && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab('bills')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'bills' && styles.tabButtonTextActive
          ]}>
            {t('bills.tab')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'goals' ? (
        <FlatList
          data={goals}
          renderItem={renderGoal}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 60 + insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('goals.empty.title')}</Text>
              <Text style={styles.emptySubtext}>{t('goals.empty.subtitle')}</Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Bill Category Filter */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  showPaidBills && styles.filterChipActive
                ]}
                onPress={() => setShowPaidBills(!showPaidBills)}
              >
                <Ionicons name={showPaidBills ? "eye" : "eye-off"} size={16} color={showPaidBills ? "#fff" : "#666"} style={{ marginRight: 6 }} />
                <Text style={[
                  styles.filterChipText,
                  showPaidBills && styles.filterChipTextActive
                ]}>{showPaidBills ? t('bills.filter.hide_paid') : t('bills.filter.show_paid')}</Text>
              </TouchableOpacity>
              
              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !billFilterCategoryId && styles.filterChipActive
                ]}
                onPress={() => setBillFilterCategoryId(null)}
              >
                <Text style={[
                  styles.filterChipText,
                  !billFilterCategoryId && styles.filterChipTextActive
                ]}>{t('bills.filter.all')}</Text>
              </TouchableOpacity>
              {getBillFilterCategories().map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    billFilterCategoryId === cat.id && styles.filterChipActive,
                    { borderColor: billFilterCategoryId === cat.id ? cat.color : '#E0E0E0' }
                  ]}
                  onPress={() => setBillFilterCategoryId(billFilterCategoryId === cat.id ? null : cat.id)}
                >
                  <View style={[styles.filterIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon as any} size={12} color={cat.color} />
                  </View>
                  <Text style={[
                    styles.filterChipText,
                    billFilterCategoryId === cat.id && { color: cat.color, fontWeight: '600' }
                  ]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <SectionList
            sections={getBillSections()}
            renderItem={renderBill}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContainer, { paddingBottom: 60 + insets.bottom + 32 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>{t('bills.empty.title')}</Text>
                <Text style={styles.emptySubtext}>{t('bills.empty.subtitle')}</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Goal Manager Modal */}
      <GoalManager
        visible={goalManagerVisible}
        onClose={() => {
          setGoalManagerVisible(false)
          setEditingGoal(null)
        }}
        onGoalCreated={(newGoal) => {
          setGoals(prev => [...prev, { ...newGoal, progress: 0 }])
        }}
        onGoalUpdated={(updatedGoal) => {
          setGoals(prev => prev.map(g => g.id === updatedGoal.id ? { ...updatedGoal, progress: g.progress } : g))
          fetchGoals() // Refresh to get updated progress
        }}
        userId={user?.id || ''}
        initialGoal={editingGoal}
      />

      {/* Add Bill Modal (keep existing for now) */}
      <Modal
        visible={modalVisible && modalType === 'bill'}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('bills.add_title')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('bills.title')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bill name"
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('bills.amount')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('bills.due_date')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'pt-BR' ? 'DD/MM/YYYY' : 'MM/DD/YYYY'}
                  value={dueDate}
                  onChangeText={handleDateChange}
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('bills.frequency')}</Text>
                <View style={styles.pickerContainer}>
                  {['once', 'weekly', 'monthly', 'yearly'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.pickerOption,
                        frequency === freq && styles.pickerOptionSelected
                      ]}
                      onPress={() => setFrequency(freq as any)}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        frequency === freq && styles.pickerOptionTextSelected
                      ]}>
                        {t(`bills.frequency.${freq}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('bills.category')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', paddingVertical: 4 }}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      style={{ 
                        alignItems: 'center', 
                        marginRight: 16, 
                        opacity: selectedCategory?.id === cat.id ? 1 : 0.5 
                      }}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <View style={{ 
                        width: 40, height: 40, borderRadius: 20, 
                        backgroundColor: cat.color + '20', 
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: selectedCategory?.id === cat.id ? 2 : 0,
                        borderColor: cat.color
                      }}>
                        <Ionicons name={cat.icon} size={20} color={cat.color} />
                      </View>
                      <Text style={{ fontSize: 10, marginTop: 4, color: '#333' }}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={addBill}>
                <Text style={styles.submitButtonText}>{t('bills.add_button')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#4A90E2',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  goalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  goalPeriod: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  billItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  billDetails: {
    fontSize: 12,
    color: '#666',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  billActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  payButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  payButtonPaid: {
    backgroundColor: '#E0E0E0',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  payButtonTextPaid: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  pickerOptionText: {
    fontSize: 12,
    color: '#666',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategoryText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paidStampContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.1,
  },
  paidStamp: {
    width: '80%',
    height: '80%',
    tintColor: 'green',
    transform: [{ rotate: '-15deg' }],
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  sectionHeader: {
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
