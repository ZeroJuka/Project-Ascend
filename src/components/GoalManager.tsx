import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  is_default: boolean
}

interface GoalManagerProps {
  visible: boolean
  onClose: () => void
  onGoalCreated: (goal: any) => void
  onGoalUpdated?: (goal: any) => void
  userId: string
  initialGoal?: any
}

export default function GoalManager({ visible, onClose, onGoalCreated, onGoalUpdated, userId, initialGoal }: GoalManagerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState<'spend_less' | 'spend_more' | 'save'>('spend_less')
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'>('monthly')
  const [isRecurring, setIsRecurring] = useState(false)
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [budgetResetDay, setBudgetResetDay] = useState('1')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (visible) {
      fetchCategories()
      if (initialGoal) {
        setTitle(initialGoal.title)
        setDescription(initialGoal.description || '')
        setGoalType(initialGoal.goal_type)
        setTimePeriod(initialGoal.time_period)
        setIsRecurring(initialGoal.is_recurring)
        setMonthlyBudget(String(initialGoal.target_amount))
        setBudgetResetDay(String(initialGoal.budget_reset_day || '1'))
        // Fetch categories for this goal
        fetchGoalCategories(initialGoal.id)
      } else {
        resetForm()
      }
    }
  }, [visible, initialGoal])

  const fetchGoalCategories = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from('goal_categories')
        .select('category_id')
        .eq('goal_id', goalId)

      if (error) throw error
      setSelectedCategories(data.map(gc => gc.category_id))
    } catch (error) {
      console.error('Error fetching goal categories:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},is_default.eq.true`)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCreateGoal = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title')
      return
    }

    if (!monthlyBudget) {
      Alert.alert('Error', 'Please set a target amount')
      return
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category for this goal')
      return
    }

    setIsCreating(true)
    try {
      if (initialGoal) {
        // Update existing goal
        const { data: goal, error: goalError } = await supabase
          .from('goals')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            target_amount: parseFloat(monthlyBudget),
            goal_type: goalType,
            time_period: timePeriod,
            is_recurring: isRecurring,
            monthly_budget: goalType !== 'save' ? parseFloat(monthlyBudget) : null,
            budget_reset_day: parseInt(budgetResetDay),
          })
          .eq('id', initialGoal.id)
          .select()
          .single()

        if (goalError) throw goalError

        // Update goal-category relationships
        // First delete existing
        await supabase.from('goal_categories').delete().eq('goal_id', initialGoal.id)

        // Then insert new ones
        if (selectedCategories.length > 0) {
          const goalCategories = selectedCategories.map(categoryId => ({
            goal_id: goal.id,
            category_id: categoryId,
          }))

          const { error: categoriesError } = await supabase
            .from('goal_categories')
            .insert(goalCategories)

          if (categoriesError) throw categoriesError
        }

        if (onGoalUpdated) onGoalUpdated(goal)
        Alert.alert('Success', 'Goal updated successfully!')
      } else {
        // Create new goal
        const { data: goal, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            title: title.trim(),
            description: description.trim() || null,
            target_amount: parseFloat(monthlyBudget),
            current_amount: 0,
            goal_type: goalType,
            time_period: timePeriod,
            is_recurring: isRecurring,
            start_date: new Date().toISOString().split('T')[0],
            monthly_budget: goalType !== 'save' ? parseFloat(monthlyBudget) : null,
            budget_reset_day: parseInt(budgetResetDay),
          })
          .select()
          .single()

        if (goalError) throw goalError

        // Create goal-category relationships
        if (selectedCategories.length > 0) {
          const goalCategories = selectedCategories.map(categoryId => ({
            goal_id: goal.id,
            category_id: categoryId,
          }))

          const { error: categoriesError } = await supabase
            .from('goal_categories')
            .insert(goalCategories)

          if (categoriesError) throw categoriesError
        }

        onGoalCreated(goal)
        Alert.alert('Success', 'Goal created successfully!')
      }
      
      onClose()
      if (!initialGoal) resetForm()
    } catch (error) {
      console.error('Error saving goal:', error)
      Alert.alert('Error', 'Failed to save goal')
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setGoalType('spend_less')
    setTimePeriod('monthly')
    setIsRecurring(false)
    setMonthlyBudget('')
    setBudgetResetDay('1')
    setSelectedCategories([])
  }

  const renderCategory = ({ item }: { item: Category }) => {
    const isSelected = selectedCategories.includes(item.id)
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemSelected,
          { borderColor: item.color }
        ]}
        onPress={() => toggleCategorySelection(item.id)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
        {isSelected && (
          <View style={[styles.checkIcon, { backgroundColor: item.color }]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{initialGoal ? 'Edit Goal' : 'Create Goal'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Title */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Goal Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Spend less on dining out"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#999"
              />
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Add more details about your goal"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#999"
                multiline
              />
            </View>

            {/* Goal Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Goal Type</Text>
              <View style={styles.goalTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'spend_less' && styles.goalTypeButtonSelected
                  ]}
                  onPress={() => setGoalType('spend_less')}
                >
                  <Ionicons name="trending-down" size={20} color={goalType === 'spend_less' ? '#fff' : '#FF6B6B'} />
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'spend_less' && styles.goalTypeTextSelected
                  ]}>
                    Spend Less
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'spend_more' && styles.goalTypeButtonSelected
                  ]}
                  onPress={() => setGoalType('spend_more')}
                >
                  <Ionicons name="trending-up" size={20} color={goalType === 'spend_more' ? '#fff' : '#4A90E2'} />
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'spend_more' && styles.goalTypeTextSelected
                  ]}>
                    Spend At Least
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalTypeButton,
                    goalType === 'save' && styles.goalTypeButtonSelected
                  ]}
                  onPress={() => setGoalType('save')}
                >
                  <Ionicons name="wallet" size={20} color={goalType === 'save' ? '#fff' : '#50C878'} />
                  <Text style={[
                    styles.goalTypeText,
                    goalType === 'save' && styles.goalTypeTextSelected
                  ]}>
                    Save Money
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Period */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Time Period</Text>
              <View style={styles.pickerContainer}>
                {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.pickerOption,
                      timePeriod === period && styles.pickerOptionSelected
                    ]}
                    onPress={() => setTimePeriod(period as any)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      timePeriod === period && styles.pickerOptionTextSelected
                    ]}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {goalType === 'save' ? 'Target Savings Amount' : 'Target Spending Amount'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500"
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Categories */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Categories</Text>
              <Text style={styles.helperText}>
                Select categories to track for this goal
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', paddingVertical: 4 }}>
                  {categories.map(cat => (
                    <TouchableOpacity 
                      key={cat.id} 
                      style={{ 
                        alignItems: 'center', 
                        marginRight: 16, 
                        opacity: selectedCategories.includes(cat.id) ? 1 : 0.5 
                      }}
                      onPress={() => toggleCategorySelection(cat.id)}
                    >
                      <View style={{ 
                        width: 48, height: 48, borderRadius: 24, 
                        backgroundColor: cat.color + '20', 
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: selectedCategories.includes(cat.id) ? 2 : 0,
                        borderColor: cat.color
                      }}>
                        <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                      </View>
                      <Text style={{ fontSize: 10, marginTop: 4, color: '#333' }}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            {/* Recurring */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  isRecurring && styles.checkboxChecked
                ]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                {isRecurring && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Recurring Goal</Text>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateGoal}
              disabled={isCreating}
            >
              <Text style={styles.createButtonText}>
                {isCreating ? 'Saving...' : (initialGoal ? 'Update Goal' : 'Create Goal')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
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
  goalTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  goalTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  goalTypeButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  goalTypeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  goalTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  categoryItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})