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
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettings } from '../contexts/SettingsContext'
import { formatCurrency } from '../utils/currency'
import CategoryManager from '../components/CategoryManager'

interface Transaction {
  id: string
  amount: number
  description: string
  transaction_date: string
  type: 'income' | 'expense'
  category: {
    name: string
    color: string
    icon: string
  }
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
  is_default: boolean
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [categoryModalVisible, setCategoryModalVisible] = useState(false)
  const [categoryManagerVisible, setCategoryManagerVisible] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense')
  const [refreshing, setRefreshing] = useState(false)
  const [categoryPickerTarget, setCategoryPickerTarget] = useState<'add' | 'edit' | 'filter'>('add')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([])
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<'income' | 'expense'>('expense')
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const { user } = useAuth()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const { language } = useSettings()

  useEffect(() => {
    fetchTransactions()
    fetchCategories()
  }, [])

  // Force refresh data when categories are updated
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchTransactions(), fetchCategories()])
    setRefreshing(false)
  }, [])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
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

  const addTransaction = async () => {
    if (!amount || !description || !selectedCategory) {
      Alert.alert(t('transactions.alert.error_title'), t('transactions.alert.error_fields'))
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          category_id: selectedCategory.id,
          amount: parseFloat(amount),
          description,
          type: transactionType,
          transaction_date: new Date().toISOString().split('T')[0],
        })

      if (error) throw error

      setModalVisible(false)
      setAmount('')
      setDescription('')
      setSelectedCategory(null)
      await fetchTransactions()
      Alert.alert(t('transactions.alert.success_title'), t('transactions.alert.success_message'))
    } catch (error) {
      console.error('Error adding transaction:', error)
      Alert.alert(t('transactions.alert.error_title'), t('transactions.alert.error_add'))
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedTransactionIds(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(tid => tid !== id) 
        : [...prev, id]
      
      // If no items selected, exit selection mode
      if (newSelection.length === 0) {
        setIsSelectionMode(false)
      }
      return newSelection
    })
  }

  const deleteSelectedTransactions = () => {
    const message = t('transactions.alert.delete_selected_confirm').replace('{count}', String(selectedTransactionIds.length))
    
    Alert.alert(
      t('common.delete'),
      message === 'transactions.alert.delete_selected_confirm' 
        ? `Delete ${selectedTransactionIds.length} transactions?` 
        : message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('transactions')
                .delete()
                .in('id', selectedTransactionIds)
              
              if (error) throw error
              
              setSelectedTransactionIds([])
              setIsSelectionMode(false)
              fetchTransactions()
            } catch (error) {
              console.error('Error deleting transactions:', error)
              Alert.alert('Error', 'Failed to delete transactions')
            }
          }
        }
      ]
    )
  }

  const renderTransaction = ({ item, index }: { item: Transaction, index: number }) => {
    const currentDate = new Date(item.transaction_date)
    const currentKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`
    const prev = transactions[index - 1]
    const showMonthHeader = index === 0 || (prev && (`${new Date(prev.transaction_date).getFullYear()}-${String(new Date(prev.transaction_date).getMonth()+1).padStart(2,'0')}` !== currentKey))
    const monthTitle = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
    const isSelected = selectedTransactionIds.includes(item.id)

    return (
    <View>
      {showMonthHeader && (
        <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{monthTitle}</Text></View>
      )}
      <TouchableOpacity 
        style={[
          styles.transactionItem,
          isSelected && styles.transactionItemSelected
        ]} 
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id)
          } else {
            setEditTx(item)
            setEditAmount(String(item.amount))
            setEditDescription(item.description)
            setEditType(item.type)
            setEditCategory(categories.find(c => c.name === item.category?.name) || null)
            setEditModalVisible(true)
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true)
            toggleSelection(item.id)
          }
        }}
        delayLongPress={300}
      >
        {isSelectionMode && (
          <View style={[styles.checkboxContainer, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        )}
      <View style={[styles.categoryIcon, { backgroundColor: (item.category?.color || '#ccc') + '20' }]}> 
        <Ionicons name={item.category?.icon as any || 'help-circle'} size={20} color={item.category?.color || '#ccc'} />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionMeta}>{item.category?.name || 'Uncategorized'} • {new Date(item.transaction_date).toLocaleDateString()}</Text>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: item.type === 'income' ? '#50C878' : '#FF6B6B' }
      ]}>
        {(item.type === 'income' ? '+' : '-') + formatCurrency(item.amount, language)}
      </Text>
      </TouchableOpacity>
    </View>
    )
  }

  const deleteCategory = async (category: Category) => {
    if (category.is_default) {
      Alert.alert(t('common.error'), t('categories.alert.delete_default'))
      return
    }

    Alert.alert(
      t('categories.alert.delete_title'),
      t('categories.alert.delete_message').replace('{name}', category.name),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', category.id)

              if (error) throw error
              
              setCategories(prev => prev.filter(c => c.id !== category.id))
              if (selectedCategory?.id === category.id) setSelectedCategory(null)
              Alert.alert(t('common.success'), t('categories.alert.delete_success'))
            } catch (error) {
              console.error('Error deleting category:', error)
              Alert.alert(t('common.error'), t('categories.alert.delete_error'))
            }
          }
        }
      ]
    )
  }

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItemCompact,
        selectedCategory?.id === item.id && styles.categoryItemCompactSelected,
        { borderColor: item.color + '40', backgroundColor: selectedCategory?.id === item.id ? item.color + '10' : '#fff' }
      ]}
      onPress={() => {
        if (categoryPickerTarget === 'add') {
          setSelectedCategory(item)
        } else if (categoryPickerTarget === 'edit') {
          setEditCategory(item)
        } else {
          setFilterCategoryIds(prev => {
             if (prev.includes(item.id)) return prev.filter(id => id !== item.id)
             return [...prev, item.id]
          })
        }
        if (categoryPickerTarget !== 'filter') setCategoryModalVisible(false)
      }}
      onLongPress={() => deleteCategory(item)}
      delayLongPress={500}
    >
      <View style={[styles.categoryIconCompact, { backgroundColor: item.color + '20' }]}> 
        <Ionicons name={item.icon as any} size={18} color={item.color} />
      </View>
      <Text style={styles.categoryNameCompact} numberOfLines={1}>{item.name}</Text>
      {!item.is_default && (
         <Ionicons name="trash-outline" size={14} color="#FF6B6B" style={{ opacity: 0.5 }} />
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {isSelectionMode ? (
          <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => {
              setIsSelectionMode(false)
              setSelectedTransactionIds([])
            }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>{selectedTransactionIds.length} Selected</Text>
            <TouchableOpacity onPress={deleteSelectedTransactions}>
              <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{t('transactions.title')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.typeSelectorInline}>
          {(['all','income','expense'] as const).map(ft => (
            <TouchableOpacity
              key={ft}
              style={[styles.typeChip, filterType === ft && styles.typeChipActive]}
              onPress={() => setFilterType(ft)}
            >
              <Text style={[styles.typeChipText, filterType === ft && styles.typeChipTextActive]}>
                {ft === 'all' ? t('transactions.filters.type_all') : ft === 'income' ? t('transactions.filters.type_income') : t('transactions.filters.type_expense')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.categoryFilter} onPress={() => { setCategoryPickerTarget('filter'); setCategoryModalVisible(true) }}>
          <Ionicons name="filter" size={16} color="#666" style={{ marginRight: 4 }} />
          <Text style={styles.categoryFilterText}>
            {filterCategoryIds.length > 0 ? `${filterCategoryIds.length} ${t('transactions.filters.category')}` : t('transactions.filters.category')}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Active Filters Area */}
      {(filterType !== 'all' || filterCategoryIds.length > 0) && (
        <View style={styles.activeFiltersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
            
            {filterType !== 'all' && (
              <TouchableOpacity style={styles.activeFilterChip} onPress={() => setFilterType('all')}>
                <Text style={styles.activeFilterText}>
                  {filterType === 'income' ? t('transactions.filters.type_income') : t('transactions.filters.type_expense')}
                </Text>
                <Ionicons name="close-circle" size={16} color="#4A90E2" />
              </TouchableOpacity>
            )}
            
            {filterCategoryIds.map(catId => {
              const cat = categories.find(c => c.id === catId)
              if (!cat) return null
              return (
                <TouchableOpacity key={catId} style={styles.activeFilterChip} onPress={() => setFilterCategoryIds(prev => prev.filter(id => id !== catId))}>
                  <Text style={styles.activeFilterText}>{cat.name}</Text>
                  <Ionicons name="close-circle" size={16} color="#4A90E2" />
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity style={styles.clearAllButton} onPress={() => { setFilterType('all'); setFilterCategoryIds([]) }}>
              <Text style={styles.clearAllText}>{t('transactions.filters.clear')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={transactions.filter(t => {
          if (filterType !== 'all' && t.type !== filterType) return false
          if (filterCategoryIds.length > 0 && !(t as any).category?.id) return false
          if (filterCategoryIds.length > 0 && !filterCategoryIds.includes((t as any).category.id)) return false
          return true
        })}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 60 + insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t('transactions.empty.title')}</Text>
            <Text style={styles.emptySubtext}>{t('transactions.empty.subtitle')}</Text>
          </View>
        }
      />

      {/* Add Transaction Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('transactions.modal.title')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Transaction Type */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'income' && styles.typeButtonActive,
                    { borderColor: '#50C878' }
                  ]}
                  onPress={() => setTransactionType('income')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    transactionType === 'income' && styles.typeButtonTextActive
                  ]}>
                    {t('transactions.type.income')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    transactionType === 'expense' && styles.typeButtonActive,
                    { borderColor: '#FF6B6B' }
                  ]}
                  onPress={() => setTransactionType('expense')}
                >
                  <Text style={[
                    styles.typeButtonText,
                    transactionType === 'expense' && styles.typeButtonTextActive
                  ]}>
                    {t('transactions.type.expense')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.amount')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.description')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('transactions.description.placeholder')}
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Category */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.category')}</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => { setCategoryPickerTarget('add'); setCategoryModalVisible(true) }}
                >
                  {selectedCategory ? (
                    <View style={styles.selectedCategory}>
                      <View style={[styles.categoryIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                        <Ionicons name={selectedCategory.icon as any} size={16} color={selectedCategory.color} />
                      </View>
                      <Text style={styles.selectedCategoryText}>{selectedCategory.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>{t('transactions.category.select_placeholder')}</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Add Button */}
              <TouchableOpacity style={styles.addTransactionButton} onPress={addTransaction}>
                <Text style={styles.addTransactionButtonText}>{t('transactions.add_button')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('transactions.modal.edit_title')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'income' && styles.typeButtonActive, { borderColor: '#50C878' }]}
                  onPress={() => setEditType('income')}
                >
                  <Text style={[styles.typeButtonText, editType === 'income' && styles.typeButtonTextActive]}>
                    {t('transactions.type.income')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, editType === 'expense' && styles.typeButtonActive, { borderColor: '#FF6B6B' }]}
                  onPress={() => setEditType('expense')}
                >
                  <Text style={[styles.typeButtonText, editType === 'expense' && styles.typeButtonTextActive]}>
                    {t('transactions.type.expense')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.amount')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.description')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('transactions.description.placeholder')}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('transactions.category')}</Text>
                <TouchableOpacity style={styles.categorySelector} onPress={() => { setCategoryPickerTarget('edit'); setCategoryModalVisible(true) }}>
                  {editCategory ? (
                    <View style={styles.selectedCategory}>
                      <View style={[styles.categoryIcon, { backgroundColor: editCategory.color + '20' }]}> 
                        <Ionicons name={editCategory.icon as any} size={16} color={editCategory.color} />
                      </View>
                      <Text style={styles.selectedCategoryText}>{editCategory.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>{t('transactions.category.select_placeholder')}</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addTransactionButton} onPress={async () => {
                if (!editTx) return
                try {
                  const { error } = await supabase
                    .from('transactions')
                    .update({
                      amount: parseFloat(editAmount),
                      description: editDescription,
                      type: editType,
                      category_id: editCategory?.id,
                    })
                    .eq('id', editTx.id)
                  if (error) throw error
                  setEditModalVisible(false)
                  setEditTx(null)
                  await fetchTransactions()
                  Alert.alert(t('transactions.alert.success_title'), t('transactions.alert.success_edit'))
                } catch (e) {
                  Alert.alert(t('transactions.alert.error_title'), t('transactions.alert.error_edit'))
                }
              }}>
                <Text style={styles.addTransactionButtonText}>{t('transactions.modal.edit_title')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

  {/* Category Selection Modal */}
  <Modal
    visible={categoryModalVisible}
    transparent
    animationType="slide"
    onRequestClose={() => setCategoryModalVisible(false)}
  >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('transactions.category.modal.title')}</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoryListGrid}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              ListFooterComponent={(
                <TouchableOpacity
                  style={styles.createCategoryButton}
                  onPress={() => {
                    setCategoryModalVisible(false)
                    setCategoryManagerVisible(true)
                  }}
                >
                  <Ionicons name="add-circle" size={24} color="#4A90E2" />
                  <Text style={styles.createCategoryText}>{t('transactions.category.create_new')}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Category Manager Modal */}
      <CategoryManager
        visible={categoryManagerVisible}
        onClose={() => setCategoryManagerVisible(false)}
        onCategoryCreated={(newCategory) => {
          setCategories(prev => [...prev, newCategory])
          setSelectedCategory(newCategory)
        }}
        userId={user?.id || ''}
      />
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
  listContainer: {
    paddingHorizontal: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
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
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
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
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#333',
    fontWeight: '600',
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
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCategoryText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  addTransactionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addTransactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  filterControls: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  controlsScroll: {
    flexGrow: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2FD',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  clearAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'underline',
  },
  typeSelectorInline: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  typeChipActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#EAF2FD',
  },
  typeChipText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#4A90E2',
  },
  categoryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  categoryFilterText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  clearFilter: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearFilterText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  categoryListGrid: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  categoryItemCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 0,
    maxWidth: '48%',
  },
  categoryItemCompactSelected: {
    borderWidth: 2,
  },
  categoryIconCompact: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryNameCompact: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  createCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  createCategoryText: {
    fontSize: 16,
    color: '#4A90E2',
    marginLeft: 8,
    fontWeight: '600',
  },
  transactionItemSelected: {
    backgroundColor: '#F0F8FF',
    borderColor: '#4A90E2',
    borderWidth: 1,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
})
