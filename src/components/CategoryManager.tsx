import React, { useState } from 'react'
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

interface CategoryManagerProps {
  visible: boolean
  onClose: () => void
  onCategoryCreated: (category: Category) => void
  userId: string
}

// Available Ionicons for categories
const AVAILABLE_ICONS = [
  'restaurant', 'cart', 'game-controller', 'bulb', 'airplane', 'cash',
  'home', 'car', 'heart', 'medical', 'school', 'fitness',
  'musical-note', 'camera', 'book', 'wine', 'gift', 'paw',
  'flower', 'planet', 'rocket', 'boat', 'train', 'bus',
  'football', 'basketball', 'tennisball', 'golf', 'baseball', 'barbell',
  'phone-portrait', 'laptop', 'desktop', 'watch', 'tablet-portrait', 'tv',
  'headset', 'radio', 'mic', 'videocam', 'camera-reverse', 'image',
  'brush', 'color-palette', 'create', 'pencil', 'clipboard', 'documents',
  'reader', 'newspaper', 'map', 'compass', 'location', 'navigate',
  'cloud', 'rainy', 'sunny', 'snow', 'thunderstorm', 'partly-sunny',
  'leaf', 'tree', 'earth', 'water', 'flame', 'snowflake'
]

// Modern color palette
const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#74B9FF', '#00B894', '#E17055', '#6C5CE7', '#A29BFE', '#FD79A8',
  '#FDCB6E', '#6C5CE7', '#00CEC9', '#FDCB6E', '#E84393', '#0984E3',
  '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8',
  '#FF7675', '#74B9FF', '#00CEC9', '#FDCB6E', '#E17055', '#D63031',
  '#2D3436', '#636E72', '#00B894', '#0984E3', '#6C5CE7', '#BB8FCE'
]

export default function CategoryManager({ visible, onClose, onCategoryCreated, userId }: CategoryManagerProps) {
  const [step, setStep] = useState<'form' | 'icon' | 'color'>('form')
  const [categoryName, setCategoryName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('restaurant')
  const [selectedColor, setSelectedColor] = useState('#FF6B6B')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name')
      return
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: categoryName.trim(),
          color: selectedColor,
          icon: selectedIcon,
          is_default: false,
        })
        .select()
        .single()

      if (error) throw error

      onCategoryCreated(data)
      resetForm()
      onClose()
      Alert.alert('Success', 'Category created successfully!')
    } catch (error) {
      console.error('Error creating category:', error)
      Alert.alert('Error', 'Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setCategoryName('')
    setSelectedIcon('restaurant')
    setSelectedColor('#FF6B6B')
    setStep('form')
  }

  const handleClearCustomCategories = async () => {
    Alert.alert(
      'Clear Custom Categories',
      'Are you sure you want to delete all custom categories? This cannot be undone and transactions associated with them might lose their category.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('user_id', userId)
                .eq('is_default', false)

              if (error) throw error
              
              Alert.alert('Success', 'All custom categories deleted.')
              onClose()
            } catch (error) {
              console.error('Error deleting categories:', error)
              Alert.alert('Error', 'Failed to delete custom categories')
            }
          }
        }
      ]
    )
  }

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', categoryId)

              if (error) throw error
              
              // No need to manually refresh here as the parent will likely re-fetch or we can trigger a callback if needed
              // But for now, we just close or stay on the screen. 
              // Ideally CategoryManager should just be for creating.
              // Wait, the user asked for deleting categories in the list.
              // The list is in TransactionsScreen, not here. 
              // Ah, "I still don't see an option to delete the categories" likely refers to individual deletion in the selection list.
              // But CategoryManager is for CREATION. 
              // The user said "the select category still shows way too big icons... also I still don't see an option to delete the categories"
              // This implies the list IN THE MODAL (TransactionsScreen) or the CategoryManager.
              // Let's assume they mean the selection list in TransactionsScreen first.
            } catch (error) {
              console.error('Error deleting category:', error)
              Alert.alert('Error', 'Failed to delete category')
            }
          }
        }
      ]
    )
  }

  const renderIconItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.iconItem,
        selectedIcon === item && styles.iconItemSelected,
        { borderColor: selectedColor }
      ]}
      onPress={() => {
        setSelectedIcon(item)
        setStep('form')
      }}
    >
      <Ionicons name={item as any} size={20} color={selectedIcon === item ? selectedColor : '#666'} />
    </TouchableOpacity>
  )

  const renderColorItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.colorItem,
        selectedColor === item && styles.colorItemSelected,
        { backgroundColor: item }
      ]}
      onPress={() => {
        setSelectedColor(item)
        setStep('form')
      }}
    >
      {selectedColor === item && (
        <Ionicons name="checkmark" size={14} color="#fff" />
      )}
    </TouchableOpacity>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {step === 'form' && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Category</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Preview */}
                <View style={styles.previewContainer}>
                  <Text style={styles.sectionTitle}>Preview</Text>
                  <View style={styles.previewItem}>
                    <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
                      <Ionicons name={selectedIcon as any} size={24} color={selectedColor} />
                    </View>
                    <Text style={styles.previewText}>
                      {categoryName || 'Category Name'}
                    </Text>
                  </View>
                </View>

                {/* Category Name */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Category Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter category name"
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Icon Selection */}
                <View style={styles.selectionContainer}>
                  <TouchableOpacity
                    style={styles.selectionButton}
                    onPress={() => setStep('icon')}
                  >
                    <Text style={styles.selectionLabel}>Icon</Text>
                    <View style={styles.selectionValue}>
                      <Ionicons name={selectedIcon as any} size={20} color={selectedColor} />
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Color Selection */}
                <View style={styles.selectionContainer}>
                  <TouchableOpacity
                    style={styles.selectionButton}
                    onPress={() => setStep('color')}
                  >
                    <Text style={styles.selectionLabel}>Color</Text>
                    <View style={styles.selectionValue}>
                      <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Create Button */}
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: selectedColor }]}
                  onPress={handleCreateCategory}
                  disabled={isCreating}
                >
                  <Text style={styles.createButtonText}>
                    {isCreating ? 'Creating...' : 'Create Category'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={handleClearCustomCategories}
                >
                  <Text style={styles.clearAllButtonText}>Delete All Custom Categories</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {step === 'icon' && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setStep('form')}>
                  <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Choose Icon</Text>
                <View style={{ width: 24 }} />
              </View>

              <FlatList
                data={AVAILABLE_ICONS}
                renderItem={renderIconItem}
                keyExtractor={(item) => item}
                numColumns={8}
                contentContainerStyle={styles.iconGrid}
              />
            </>
          )}

          {step === 'color' && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setStep('form')}>
                  <Ionicons name="arrow-back" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Choose Color</Text>
                <View style={{ width: 24 }} />
              </View>

              <FlatList
                data={COLOR_PALETTE}
                renderItem={renderColorItem}
                keyExtractor={(item) => item}
                numColumns={8}
                contentContainerStyle={styles.colorGrid}
              />
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
  previewContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
  selectionContainer: {
    marginBottom: 20,
  },
  selectionButton: {
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
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  selectionValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearAllButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  iconGrid: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconItemSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  colorGrid: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  colorItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorItemSelected: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
})
