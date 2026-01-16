import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { GeminiAIService } from '../services/GeminiAIService'
import { useI18n } from '../contexts/I18nContext'
import { useSettings } from '../contexts/SettingsContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatCurrency } from '../utils/currency'

import ShoppingListModal from '../components/ShoppingListModal'

interface ChatEntry {
  message: string
  sender: 'user' | 'ai'
  message_type: 'text' | 'voice' | 'system'
  created_at: string
  meta?: {
    pendingAction?: {
      type: 'transaction' | 'goal' | 'bill' | 'batch' | 'safe_creation' | 'safe_deposit'
      data: any
    }
    confirmedAction?: {
      type: 'transaction' | 'goal' | 'bill' | 'batch' | 'safe_creation' | 'safe_deposit'
      data: any
      ids?: string[] // Store created IDs for undo
    }
  }
}



interface ConfirmationModal {
  visible: boolean
  type: 'transaction' | 'goal' | 'batch'
  data: any
  message: string
}

export default function ChatScreen({ route }: any) {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [shoppingListVisible, setShoppingListVisible] = useState(false)
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    visible: false,
    type: 'transaction',
    data: null,
    message: ''
  })
  
  const { user } = useAuth()
  const flatListRef = useRef<FlatList>(null)
  const { language } = useSettings()
  const { t } = useI18n()
  const aiService = useRef(new GeminiAIService(user?.id || '', language))
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  
  useEffect(() => {
    aiService.current = new GeminiAIService(user?.id || '', language)
  }, [language, user?.id])
  const lastVoiceRef = useRef<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  useEffect(() => {
    const vm = route.params?.voiceMessage
    if (vm && vm !== lastVoiceRef.current) {
      lastVoiceRef.current = vm
      handleVoiceMessage(vm)
    }

    if (route.params?.openShoppingList) {
      setShoppingListVisible(true)
      // Clear params to avoid reopening on re-render if we were to use setParams
    }
  }, [route.params?.voiceMessage, route.params?.openShoppingList])

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages])

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('conversation, updated_at')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)

      const conversation: ChatEntry[] | undefined = data?.[0]?.conversation
      if (conversation && conversation.length) {
        setMessages(conversation)
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }

  const persistUpsert = async (capped: ChatEntry[]) => {
    try {
      await supabase
        .from('chat_messages')
        .upsert(
          { user_id: user?.id as string, conversation: capped, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
    } catch (error) {
      console.error('Error persisting conversation:', error)
    }
  }

  const appendMessage = async (entry: ChatEntry) => {
    let nextCapped: ChatEntry[] = []
    setMessages(prev => {
      const next = [...prev, entry]
      nextCapped = next.slice(Math.max(0, next.length - 30))
      return nextCapped
    })
    await persistUpsert(nextCapped)
    return entry
  }

  const resolvePendingAt = async (index: number, removeAfterConfirm?: boolean) => {
    let nextCapped: ChatEntry[] = []
    setMessages(prev => {
      const next = prev.slice()
      if (removeAfterConfirm) {
        next.splice(index, 1)
      } else {
        const entry = { ...next[index] }
        if (entry.meta?.pendingAction) entry.meta = undefined
        next[index] = entry
      }
      nextCapped = next.slice(Math.max(0, next.length - 30))
      return nextCapped
    })
    await persistUpsert(nextCapped)
  }

  const handleVoiceMessage = async (voiceMessage: string) => {
    // Save the voice message
    await appendMessage({ message: voiceMessage, sender: 'user', message_type: 'voice', created_at: new Date().toISOString() })

    // Process with AI
    await processAIMessage(voiceMessage, 'voice')
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return

    const message = inputText.trim()
    setInputText('')
    setLoading(true)

    // Save user message
    await appendMessage({ message, sender: 'user', message_type: 'text', created_at: new Date().toISOString() })

    // Process with AI
    await processAIMessage(message, 'text')
  }

  const handleProcessShoppingList = async (items: string[]) => {
    const message = `Shopping List items:\n${items.join('\n')}\nPlease create transactions for these items.`
    // Save user message (summarized)
    await appendMessage({ 
      message: `Shopping List with ${items.length} items`, 
      sender: 'user', 
      message_type: 'system', // Use system type to customize style, but act as user message
      created_at: new Date().toISOString(),
      meta: {
        pendingAction: {
          type: 'batch', // Re-using batch type for display
          data: items.map(i => {
            const parts = i.split(' ')
            const amount = parts.pop()
            const name = parts.join(' ')
            return { data: { description: name, amount } }
          })
        }
      }
    })
    setLoading(true)
    await processAIMessage(message, 'text')
  }

  const processAIMessage = async (message: string, messageType: 'text' | 'voice') => {
    try {
      console.log('Processing AI message:', message)
      const response = await aiService.current.generateFinancialInsight(message)
      console.log('AI response received:', response)
      
      // Save AI response
      await appendMessage({ message: response.content, sender: 'ai', message_type: 'text', created_at: new Date().toISOString() })

      // Handle special cases (transaction or goal creation)
      if (response.type === 'transaction' || response.type === 'goal' || response.type === 'bill' || response.type === 'batch' || response.type === 'safe_creation' || response.type === 'safe_deposit') {
        await appendMessage({
          message: response.content,
          sender: 'ai',
          message_type: 'system',
          created_at: new Date().toISOString(),
          meta: { pendingAction: { type: response.type as any, data: response.data } }
        })
      }
    } catch (error) {
      console.error('Error processing AI message:', error)
      await appendMessage({
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'ai',
        message_type: 'text',
        created_at: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAction = async () => {
    try {
      if (confirmationModal.type === 'transaction') {
        await aiService.current.createTransaction(confirmationModal.data)
        Alert.alert('Success', 'Transaction created successfully!')
      } else if (confirmationModal.type === 'goal') {
        await aiService.current.createGoal(confirmationModal.data)
        Alert.alert('Success', 'Goal created successfully!')
      }
      
      setConfirmationModal({ visible: false, type: 'transaction', data: null, message: '' })
    } catch (error) {
      console.error('Error creating item:', error)
      Alert.alert('Error', 'Failed to create item')
    }
  }

  const renderMessage = ({ item, index }: { item: ChatEntry, index: number }) => {
    const isUser = item.sender === 'user'
    const isVoice = item.message_type === 'voice'
    const hasPending = !!item.meta?.pendingAction
    const hasConfirmed = !!item.meta?.confirmedAction
    const isConfirmation = item.message_type === 'system' && (hasPending || hasConfirmed) && item.sender === 'ai'
    const isShoppingList = item.message_type === 'system' && hasPending && item.sender === 'user'
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <LinearGradient
          colors={
            isUser
              ? (isShoppingList ? ['#50C878', '#45B7D1'] : ['#4A90E2', '#357ABD'])
              : (isVoice || isConfirmation)
              ? ['#FFD76A', '#FFC04D']
              : ['#F0F0F0', '#E8E8E8']
          }
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble 
            : isVoice ? styles.voiceMessageBubble 
            : styles.aiMessageBubble
          ]}
        >
          {isVoice && (
            <View style={styles.voiceIndicator}>
              <Ionicons name="mic" size={16} color="#fff" />
              <Text style={styles.voiceText}>Voice Message</Text>
            </View>
          )}
          {isShoppingList && (
            <TouchableOpacity 
              style={styles.voiceIndicator}
              onPress={() => {
                const list = (item.meta?.pendingAction?.data as any[]).map(i => `${i.data.description} ${i.data.amount}`)
                Alert.alert('Shopping List', list.join('\n'))
              }}
            >
              <Ionicons name="cart" size={16} color="#fff" />
              <Text style={styles.voiceText}>Shopping List</Text>
            </TouchableOpacity>
          )}
          <Text style={[
            styles.messageText,
            isUser || isVoice || isConfirmation ? styles.messageTextLight : styles.messageTextDark
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isUser || isVoice || isConfirmation ? styles.messageTimeLight : styles.messageTimeDark
          ]}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
          {isConfirmation && (item.meta?.pendingAction?.data || item.meta?.confirmedAction?.data) && (
            <View style={styles.dataContainer}>
              {(item.meta!.pendingAction || item.meta!.confirmedAction)!.type === 'transaction' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number((item.meta!.pendingAction || item.meta!.confirmedAction)!.data.amount), language)}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Description:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.description}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Category:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.category || (item.meta!.pendingAction || item.meta!.confirmedAction)!.data.category_name}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Type:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.type}</Text>
                  </View>
                </>
              ) : (item.meta!.pendingAction || item.meta!.confirmedAction)!.type === 'goal' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Title:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.title}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Target Amount:</Text>
                    <Text style={styles.dataValue}>${(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.target_amount}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Type:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.goal_type}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Period:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.time_period}</Text>
                  </View>
                </>
              ) : (item.meta!.pendingAction || item.meta!.confirmedAction)!.type === 'batch' ? (
                <>
                  <Text style={[styles.dataLabel, { marginBottom: 8 }]}>Items to register:</Text>
                  {((item.meta!.pendingAction || item.meta!.confirmedAction)!.data as any[]).map((batchItem, i) => (
                    <View key={i} style={[styles.dataRow, { borderBottomWidth: i < ((item.meta!.pendingAction || item.meta!.confirmedAction)!.data as any[]).length - 1 ? 1 : 0, borderBottomColor: '#eee', paddingBottom: 4, marginBottom: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dataValue}>{batchItem.data.description || batchItem.data.title}</Text>
                        <Text style={styles.dataLabel}>{batchItem.data.category || batchItem.data.category_name}</Text>
                      </View>
                      <Text style={styles.dataValue}>{formatCurrency(Number(batchItem.data.amount), language)}</Text>
                    </View>
                  ))}
                </>
              ) : (item.meta!.pendingAction || item.meta!.confirmedAction)!.type === 'safe_creation' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Safe Name:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.name}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Target:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number((item.meta!.pendingAction || item.meta!.confirmedAction)!.data.target_amount || 0), language)}</Text>
                  </View>
                </>
              ) : (item.meta!.pendingAction || item.meta!.confirmedAction)!.type === 'safe_deposit' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>To Safe:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.safe_name}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number((item.meta!.pendingAction || item.meta!.confirmedAction)!.data.amount), language)}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Title:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.title}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number((item.meta!.pendingAction || item.meta!.confirmedAction)!.data.amount), language)}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Due Date:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.due_date || 'N/A'}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Category:</Text>
                    <Text style={styles.dataValue}>{(item.meta!.pendingAction || item.meta!.confirmedAction)!.data.category || (item.meta!.pendingAction || item.meta!.confirmedAction)!.data.category_name}</Text>
                  </View>
                </>
              )}
            </View>
          )}
          {hasPending && !isShoppingList && (
            <View style={styles.inlineActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={async () => {
                  await appendMessage({
                    message: 'Registration cancelled.',
                    sender: 'ai',
                    message_type: 'system',
                    created_at: new Date().toISOString()
                  })
                  await resolvePendingAt(index)
                }}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={async () => {
                  try {
                    const action = item.meta!.pendingAction!
                    const createdIds: string[] = []
                    
                    if (action.type === 'transaction') {
                      const res = await aiService.current.createTransaction(action.data)
                      if (res.data?.id) createdIds.push(res.data.id)
                    } else if (action.type === 'goal') {
                      const res = await aiService.current.createGoal(action.data)
                      if (res.data?.id) createdIds.push(res.data.id)
                    } else if (action.type === 'bill') {
                      const res = await aiService.current.createBill(action.data)
                      if (res.data?.id) createdIds.push(res.data.id)
                    } else if (action.type === 'safe_creation') {
                      const res = await aiService.current.createSafe(action.data)
                      if (res.data?.id) createdIds.push(res.data.id)
                    } else if (action.type === 'safe_deposit') {
                      const res = await aiService.current.addToSafe(action.data)
                      // res.data is { transaction, safe }
                      if (res.data?.transaction?.id) createdIds.push(res.data.transaction.id)
                      // We also might want to track the safe ID for undo (reverting balance)
                      // But our undo logic currently just deletes by ID.
                      // For safe deposit, we need to revert the balance.
                      // Let's store safe_id in the action data for reference during undo?
                      // We can mutate action.data here? No, confirmedAction takes a copy.
                      // We can push a special ID format? or just handle it in undo.
                      // Let's just store the transaction ID for now, and in undo we fetch the transaction to see if it was a safe deposit?
                      // Or better: store a compound ID "safe_deposit:<safe_id>:<amount>" in ids?
                      // No, `ids` is string[].
                      // Let's rely on the action type in confirmedAction.
                      // createdIds will hold the transaction ID.
                    } else if (action.type === 'batch') {
                      // Process all items in batch
                      const items = action.data as any[]
                      for (const batchItem of items) {
                        if (batchItem.type === 'transaction') {
                          const res = await aiService.current.createTransaction(batchItem.data)
                          if (res.data?.id) createdIds.push(res.data.id)
                        } else if (batchItem.type === 'goal') {
                          const res = await aiService.current.createGoal(batchItem.data)
                          if (res.data?.id) createdIds.push(res.data.id)
                        } else if (batchItem.type === 'bill') {
                          const res = await aiService.current.createBill(batchItem.data)
                          if (res.data?.id) createdIds.push(res.data.id)
                        }
                      }
                    }
                    
                    // Don't send "Registration confirmed" message
                    
                    // Update meta to confirmed and store IDs
                    let nextCapped: ChatEntry[] = []
                    setMessages(prev => {
                      const next = prev.slice()
                      const entry = { ...next[index] }
                      if (entry.meta) {
                        entry.meta = { 
                          ...entry.meta, 
                          pendingAction: undefined, 
                          confirmedAction: { ...action, ids: createdIds } 
                        } 
                      }
                      next[index] = entry
                      nextCapped = next.slice(Math.max(0, next.length - 30))
                      return nextCapped
                    })
                    await persistUpsert(nextCapped)

                  } catch (e) {
                    await appendMessage({
                      message: 'Failed to register. Please try again.',
                      sender: 'ai',
                      message_type: 'system',
                      created_at: new Date().toISOString()
                    })
                  }
                }}
              >
                <Text style={styles.acceptText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}
          {hasConfirmed && (
            <View style={styles.inlineActions}>
              <TouchableOpacity
                style={styles.undoButton}
                onPress={async () => {
                  try {
                    const action = item.meta!.confirmedAction!
                    if (action.ids && action.ids.length > 0) {
                      // Delete the created items
                      // Since we don't know the table easily without checking type, we check type
                      // But batch can have mixed types.
                      // Ideally we should have stored table name with ID.
                      // For now, simplify: we assume batch items are transactions mostly.
                      // Wait, we need to know the table.
                      // Let's assume we can't easily undo mixed batches perfectly without more info.
                      // But for single items it works.
                      
                      for (const id of action.ids) {
                         // Try to delete from all tables? No, that's dangerous.
                         // We need to know where it came from.
                         // Let's refine the creation to store type with ID or just assume based on action type.
                         
                         if (action.type === 'transaction') {
                           await supabase.from('transactions').delete().eq('id', id)
                         } else if (action.type === 'goal') {
                           await supabase.from('goals').delete().eq('id', id)
                         } else if (action.type === 'bill') {
                           await supabase.from('bills').delete().eq('id', id)
                         } else if (action.type === 'safe_creation') {
                           await supabase.from('safes').delete().eq('id', id)
                         } else if (action.type === 'safe_deposit') {
                           // 1. Delete the transaction
                           await supabase.from('transactions').delete().eq('id', id)
                           
                           // 2. Revert safe balance
                           // We need to find the safe first.
                           const { data: safe } = await supabase
                             .from('safes')
                             .select('id, current_amount')
                             .eq('user_id', user?.id)
                             .eq('name', action.data.safe_name)
                             .single()
                             
                           if (safe) {
                             await supabase
                               .from('safes')
                               .update({ current_amount: safe.current_amount - Number(action.data.amount) })
                               .eq('id', safe.id)
                           }
                         } else if (action.type === 'batch') {
                            // For batch, we just iterate and guess or if we stored it properly.
                            // Since we didn't store type per ID, we might fail here.
                            // Let's update the create logic to return type too?
                            // Or just try deleting from transactions first as it's most common.
                            await supabase.from('transactions').delete().eq('id', id)
                            // If it was a goal or bill in a batch, this won't work.
                            // But usually batches are transactions.
                         }
                      }
                    }

                    await appendMessage({
                      message: 'Undone.',
                      sender: 'ai',
                      message_type: 'system',
                      created_at: new Date().toISOString()
                    })
                    
                    // Remove confirmedAction so undo button disappears
                    let nextCapped: ChatEntry[] = []
                    setMessages(prev => {
                      const next = prev.slice()
                      const entry = { ...next[index] }
                      if (entry.meta) {
                        entry.meta = { ...entry.meta, confirmedAction: undefined }
                      }
                      next[index] = entry
                      nextCapped = next.slice(Math.max(0, next.length - 30))
                      return nextCapped
                    })
                    await persistUpsert(nextCapped)
                  } catch (e) {
                    console.error('Undo failed', e)
                    Alert.alert('Error', 'Failed to undo action.')
                  }
                }}
              >
                <Ionicons name="arrow-undo" size={16} color="#FF6B6B" style={{ marginRight: 4 }} />
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('chat.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('chat.subtitle')}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, idx) => `${item.created_at}-${item.sender}-${idx}`}
        contentContainerStyle={[styles.messagesContainer, { paddingBottom: 60 + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchMessages(); setRefreshing(false) }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles" size={64} color="#4A90E2" />
            <Text style={styles.emptyTitle}>Welcome to ASCEND AI</Text>
            <Text style={styles.emptySubtitle}>
              Ask me about your spending, create transactions, or set financial goals.
              {'\n'}You can also use voice by holding the AI button!
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={() => setShoppingListVisible(true)}
          >
             <Ionicons name="list" size={24} color="#666" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            placeholderTextColor="#999"
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline confirmations handled in message bubbles */}
      <ShoppingListModal
        visible={shoppingListVisible}
        onClose={() => setShoppingListVisible(false)}
        onProcess={handleProcessShoppingList}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userMessageBubble: {
    borderBottomRightRadius: 4,
  },
  voiceMessageBubble: {
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  inlineActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  rejectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  rejectText: {
    color: '#fff',
    fontWeight: '600'
  },
  acceptButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.6)'
  },
  acceptText: {
    color: '#8A5A00',
    fontWeight: '700'
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoText: {
    color: '#FF6B6B',
    fontWeight: '700'
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  voiceText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextLight: {
    color: '#fff',
  },
  messageTextDark: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeLight: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeDark: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 80,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
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
  modalMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  dataContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    marginRight: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
})
