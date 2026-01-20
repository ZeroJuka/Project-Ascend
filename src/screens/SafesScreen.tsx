import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/currency'
import { useI18n } from '../contexts/I18nContext'

interface Safe {
  id: string
  name: string
  target_amount?: number
  current_amount: number
  icon?: string
  color?: string
}

export default function SafesScreen() {
  const [safes, setSafes] = useState<Safe[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null)
  const [safeTransactions, setSafeTransactions] = useState<any[]>([])
  const [newSafeName, setNewSafeName] = useState('')
  const [newSafeTarget, setNewSafeTarget] = useState('')
  const [newSafeInitialAmount, setNewSafeInitialAmount] = useState('')
  
  const { user } = useAuth()
  const navigation = useNavigation()
  const { t } = useI18n()

  useEffect(() => {
    fetchSafes()
  }, [])

  const fetchSafes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('safes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, ignore error and show empty state
        if (error.code === 'PGRST205' || error.message.includes('safes')) {
          setSafes([])
          return
        }
        throw error
      }
      setSafes(data || [])
    } catch (error) {
      console.error('Error fetching safes:', error)
      // If table doesn't exist, we might want to handle it gracefully or show empty
    } finally {
      setLoading(false)
    }
  }

  const fetchSafeTransactions = async (safe: Safe) => {
    try {
      // Fetch transactions where description contains the safe name
      // This is a heuristic since we don't have a direct link in the schema yet, 
      // but our AI service creates transactions with "Deposit to {SafeName}"
      // Or we can search for the "Safes" category and filter by description.
      
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .ilike('description', `%${safe.name}%`)
        .order('transaction_date', { ascending: false })
      
      setSafeTransactions(data || [])
    } catch (error) {
      console.error('Error fetching safe transactions:', error)
    }
  }

  const handleCreateSafe = async () => {
    if (!newSafeName) return

    try {
      const initialAmount = newSafeInitialAmount ? parseFloat(newSafeInitialAmount) : 0
      
      const { error } = await supabase.from('safes').insert({
        user_id: user?.id,
        name: newSafeName,
        target_amount: newSafeTarget ? parseFloat(newSafeTarget) : null,
        current_amount: initialAmount,
        icon: 'lock-closed', // Default icon
        color: '#4A90E2', // Default color
      })

      if (error) throw error

      setCreateModalVisible(false)
      setNewSafeName('')
      setNewSafeTarget('')
      setNewSafeInitialAmount('')
      fetchSafes()
    } catch (error) {
      Alert.alert('Error',
      'Failed to create safe'
    )
  }
}

const handleDeleteSafe = async (id: string) => {
  Alert.alert(
    t('safes.delete.title'),
    t('safes.delete.message'), 
    [
      { text: t('safes.delete.cancel'), style: 'cancel' },
      { 
        text: t('safes.delete.confirm'), 
        style: 'destructive',
        onPress: async () => {
           await supabase.from('safes').delete().eq('id', id)
           fetchSafes()
        }
      }
    ]
  )
}

return (
  <View style={styles.container}>
    <LinearGradient
      colors={['#4A90E2', '#357ABD']}
      style={styles.header}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('safes.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.headerSubtitle}>
        {t('safes.subtitle')}
      </Text>
    </LinearGradient>

    <ScrollView contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
      ) : safes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>{t('safes.empty.text')}</Text>
          <Text style={styles.emptySubText}>
            {t('safes.empty.subtext')}
          </Text>
        </View>
      ) : (
          safes.map(safe => (
            <TouchableOpacity 
              key={safe.id} 
              style={styles.safeCard}
              onPress={() => {
                setSelectedSafe(safe)
                fetchSafeTransactions(safe)
                setDetailsModalVisible(true)
              }}
            >
              <View style={styles.safeHeader}>
                <View style={styles.safeIcon}>
                  <Ionicons name={safe.icon as any || 'lock-closed'} size={24} color={safe.color || '#4A90E2'} />
                </View>
                <View style={styles.safeInfo}>
                  <Text style={styles.safeName}>{safe.name}</Text>
                  {safe.target_amount && (
                    <Text style={styles.safeTarget}>Goal: {formatCurrency(safe.target_amount, 'en')}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDeleteSafe(safe.id)}>
                   <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.safeBalance}>{formatCurrency(safe.current_amount, 'en')}</Text>
              
              {safe.target_amount && (
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min((safe.current_amount / safe.target_amount) * 100, 100)}%` }
                    ]} 
                  />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('safes.create.title')}</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder={t('safes.create.name')}
              value={newSafeName}
              onChangeText={setNewSafeName}
            />
            
            <TextInput
              style={styles.input}
              placeholder={t('safes.create.target')}
              value={newSafeTarget}
              onChangeText={setNewSafeTarget}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={styles.input}
              placeholder={t('safes.create.initial')}
              value={newSafeInitialAmount}
              onChangeText={setNewSafeInitialAmount}
              keyboardType="decimal-pad"
            />
            
            <TouchableOpacity 
              style={[styles.createButton, !newSafeName && styles.disabledButton]}
              onPress={handleCreateSafe}
              disabled={!newSafeName}
            >
              <Text style={styles.createButtonText}>{t('safes.create.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSafe?.name} {t('safes.history.title')}</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {safeTransactions.length === 0 ? (
                <Text style={styles.emptySubText}>{t('safes.history.empty')}</Text>
              ) : (
                safeTransactions.map(tx => (
                  <View key={tx.id} style={styles.transactionItem}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDate}>{new Date(tx.transaction_date).toLocaleDateString()}</Text>
                      <Text style={styles.transactionDesc}>{tx.description}</Text>
                    </View>
                    <Text style={[styles.transactionAmount, { color: '#50C878' }]}>
                      +{formatCurrency(tx.amount, 'en')}
                    </Text>
                  </View>
                ))
              )}
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
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  content: {
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '80%',
  },
  safeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  safeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  safeInfo: {
    flex: 1,
  },
  safeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  safeTarget: {
    fontSize: 12,
    color: '#666',
  },
  safeBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#50C878',
    borderRadius: 3,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  transactionDesc: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
})
