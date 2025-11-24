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
import { LinearGradient } from 'expo-linear-gradient'
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
  userId: string
}

export default function GoalManager({ visible, onClose, onGoalCreated, userId }: GoalManagerProps) {
  const [step, setStep] = useState<'basic' | 'categories' | 'budget'>('basic')
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
    }
  }, [visible])

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

    if (goalType === 'spend_less' && !monthlyBudget) {
      Alert.alert('Error', 'Please set a monthly budget for spend less goals')
      return
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category for this goal')
      return
    }

    setIsCreating(true)
    try {
      // Create the goal
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          target_amount: goalType === 'spend_less' ? parseFloat(monthlyBudget) : 0,
          current_amount: 0,
          goal_type: goalType,
          time_period: timePeriod,
          is_recurring: isRecurring,
          start_date: new Date().toISOString().split('T')[0],
          monthly_budget: goalType === 'spend_less' ? parseFloat(monthlyBudget) : null,
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
      resetForm()
      onClose()
      Alert.alert('Success', 'Goal created successfully!')
    } catch (error) {
      console.error('Error creating goal:', error)
      Alert.alert('Error', 'Failed to create goal')
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
    setStep('basic')
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
          {/* Progress Indicator */}
          <View style={styles.progressIndicator}>
            <View style={[
              styles.progressStep,
              step === 'basic' && styles.progressStepActive
            ]} />
            <View style={[
              styles.progressStep,
              step === 'categories' && styles.progressStepActive
            ]} />
            <View style={[
              styles.progressStep,
              step === 'budget' && styles.progressStepActive
            ]} />
          </View>

          {step === 'basic' && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Goal</Text>
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

                {/* Next Button */}
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setStep('categories')}
                >
                  <Text style={styles.nextButtonText}>Next: Select Categories</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {step === 'categories' && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setStep('basic')}>
                  <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Categories</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.helperText}>
                  Choose which categories this goal should track. For example, if your goal is to "Spend less on dining out", select the "Food & Dining" category.
                </Text>

                <FlatList
                  data={categories}
                  renderItem={renderCategory}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.categoryList}
                  scrollEnabled={false}
                />

                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setStep('budget')}
                  disabled={selectedCategories.length === 0}
                >
                  <Text style={styles.nextButtonText}>
                    Next: Set Budget ({selectedCategories.length} selected)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {step === 'budget' && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setStep('categories')}>
                  <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Set Budget</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {goalType === 'spend_less' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Monthly Budget Limit</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 200"
                        value={monthlyBudget}
                        onChangeText={setMonthlyBudget}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.helperText}>
                        Set a monthly spending limit for the selected categories. You'll get alerts when you approach this limit.
                      </Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Budget Reset Day</Text>
                      <View style={styles.pickerContainer}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayOption,
                              budgetResetDay === day.toString() && styles.dayOptionSelected
                            ]}
                            onPress={() => setBudgetResetDay(day.toString())}
                          >
                            <Text style={[
                              styles.dayOptionText,
                              budgetResetDay === day.toString() && styles.dayOptionTextSelected
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.helperText}>
                        Your budget will reset on this day each month.
                      </Text>
                    </View>
                  </>
                )}

                {goalType === 'save' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Monthly Savings Target</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 500"
                      value={monthlyBudget}
                      onChangeText={setMonthlyBudget}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                    />
                    <Text style={styles.helperText}>
                      Set a monthly savings target. We'll track your progress and help you stay on track.
                    </Text>
                  </View>
                )}

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
                    {isCreating ? 'Creating...' : 'Create Goal'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
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
    maxHeight: '85%',
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  progressStep: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginHorizontal: 4,
  },
  progressStepActive: {
    backgroundColor: '#4A90E2',
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
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
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
    justifyContent: 'space-between',
  },
  goalTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  goalTypeButtonSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  goalTypeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  goalTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    margin: 4,
  },
  pickerOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryList: {
    paddingBottom: 20,
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
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  dayOptionSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  dayOptionText: {
    fontSize: 14,
    color: '#666',
  },
  dayOptionTextSelected: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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