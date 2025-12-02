import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useIsFocused } from '@react-navigation/native'
import GoalManager from '../components/GoalManager'
import { useI18n } from '../contexts/I18nContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettings } from '../contexts/SettingsContext'
import { formatCurrency } from '../utils/currency'

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
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('user_id', user?.id)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])

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

      return Math.min((currentAmount / goal.target_amount) * 100, 100)
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

  const addBill = async () => {
    if (!title || !targetAmount || !dueDate) {
      Alert.alert(t('goals.alert.error_title'), t('goals.alert.error_fields'))
      return
    }

    try {
      const { error } = await supabase
        .from('bills')
        .insert({
          user_id: user?.id,
          title,
          amount: parseFloat(targetAmount),
          due_date: dueDate,
          frequency,
          category_id: selectedCategory?.id,
        })

      if (error) throw error

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

  const toggleBillPaid = async (billId: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          is_paid: !isPaid,
          paid_date: !isPaid ? new Date().toISOString().split('T')[0] : null,
        })
        .eq('id', billId)

      if (error) throw error
      fetchBills()
    } catch (error) {
      console.error('Error updating bill:', error)
    }
  }

  const renderGoal = ({ item }: { item: Goal }) => (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalTitle}>{item.title}</Text>
        <Text style={styles.goalPeriod}>
          {item.time_period} • {item.goal_type.replace('_', ' ')}
        </Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={[styles.progressFill, { width: `${item.progress}%` }]}
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
    </View>
  )

  const renderBill = ({ item }: { item: Bill }) => (
    <View style={styles.billItem}>
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
          onPress={() => toggleBillPaid(item.id, item.is_paid)}
        >
          <Text style={[
            styles.payButtonText,
            item.is_paid && styles.payButtonTextPaid
          ]}>
            {item.is_paid ? t('bills.pay.paid') : t('bills.pay.mark')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>{t('goals_bills.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setGoalManagerVisible(true)
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
        <FlatList
          data={bills}
          renderItem={renderBill}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 60 + insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('bills.empty.title')}</Text>
              <Text style={styles.emptySubtext}>{t('bills.empty.subtitle')}</Text>
            </View>
          }
        />
      )}

      {/* Goal Manager Modal */}
      <GoalManager
        visible={goalManagerVisible}
        onClose={() => setGoalManagerVisible(false)}
        onGoalCreated={(newGoal) => {
          setGoals(prev => [...prev, newGoal])
        }}
        userId={user?.id || ''}
      />

      {/* Add Bill Modal (keep existing for now) */}
      <Modal
        visible={modalVisible && modalType === 'bill'}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        {/* Keep existing bill modal content */}
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
})
