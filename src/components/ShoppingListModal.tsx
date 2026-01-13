import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useI18n } from '../contexts/I18nContext'
import { formatCurrency } from '../utils/currency'

interface ShoppingListModalProps {
  visible: boolean
  onClose: () => void
  onProcess: (items: string[]) => void
}

export default function ShoppingListModal({ visible, onClose, onProcess }: ShoppingListModalProps) {
  const [items, setItems] = useState<{ name: string; amount: string }[]>([])
  const [itemName, setItemName] = useState('')
  const [itemAmount, setItemAmount] = useState('')
  const { t } = useI18n()

  const handleAddItem = () => {
    if (!itemName || !itemAmount) return

    setItems([...items, { name: itemName, amount: itemAmount }])
    setItemName('')
    setItemAmount('')
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleProcess = () => {
    const itemList = items.map(item => `${item.name} ${item.amount}`)
    onProcess(itemList)
    setItems([])
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('chat.shopping_list.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder={t('chat.shopping_list.item_placeholder')}
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              placeholder={t('chat.shopping_list.amount_placeholder')}
              value={itemAmount}
              onChangeText={setItemAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={[styles.addButton, (!itemName || !itemAmount) && styles.disabledButton]} 
              onPress={handleAddItem}
              disabled={!itemName || !itemAmount}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer}>
            {items.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t('chat.shopping_list.add_button')}</Text>
              </View>
            ) : (
              items.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemAmount}>{item.amount}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {items.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0), 'en')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.processButton, items.length === 0 && styles.disabledButton]}
            onPress={handleProcess}
            disabled={items.length === 0}
          >
            <Text style={styles.processButtonText}>{t('chat.shopping_list.process_button')}</Text>
            <Ionicons name="sparkles" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemAmount: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginRight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 16,
  },
  processButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
})
