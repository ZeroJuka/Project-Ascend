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

interface ChatEntry {
  message: string
  sender: 'user' | 'ai'
  message_type: 'text' | 'voice' | 'system'
  created_at: string
  meta?: {
    pendingAction?: {
      type: 'transaction' | 'goal' | 'bill'
      data: any
    }
  }
}

interface RepoTest {
  message: string
}

interface ConfirmationModal {
  visible: boolean
  type: 'transaction' | 'goal'
  data: any
  message: string
}

export default function ChatScreen({ route }: any) {
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
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
  }, [route.params?.voiceMessage])

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

  const processAIMessage = async (message: string, messageType: 'text' | 'voice') => {
    try {
      console.log('Processing AI message:', message)
      const response = await aiService.current.generateFinancialInsight(message)
      console.log('AI response received:', response)
      
      // Save AI response
      await appendMessage({ message: response.content, sender: 'ai', message_type: 'text', created_at: new Date().toISOString() })

      // Handle special cases (transaction or goal creation)
      if (response.type === 'transaction' || response.type === 'goal' || response.type === 'bill') {
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
    const isConfirmation = item.message_type === 'system' && hasPending
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <LinearGradient
          colors={
            isUser
              ? ['#4A90E2', '#357ABD']
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
          {isConfirmation && item.meta?.pendingAction?.data && (
            <View style={styles.dataContainer}>
              {item.meta!.pendingAction!.type === 'transaction' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number(item.meta!.pendingAction!.data.amount), language)}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Description:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.description}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Category:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.category || item.meta!.pendingAction!.data.category_name}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Type:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.type}</Text>
                  </View>
                </>
              ) : item.meta!.pendingAction!.type === 'goal' ? (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Title:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.title}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Target Amount:</Text>
                    <Text style={styles.dataValue}>${item.meta!.pendingAction!.data.target_amount}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Type:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.goal_type}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Period:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.time_period}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Title:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.title}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Amount:</Text>
                    <Text style={styles.dataValue}>{formatCurrency(Number(item.meta!.pendingAction!.data.amount), language)}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Due Date:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.due_date || 'N/A'}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Category:</Text>
                    <Text style={styles.dataValue}>{item.meta!.pendingAction!.data.category || item.meta!.pendingAction!.data.category_name}</Text>
                  </View>
                </>
              )}
            </View>
          )}
          {isConfirmation && (
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
                    if (action.type === 'transaction') {
                      await aiService.current.createTransaction(action.data)
                    } else if (action.type === 'goal') {
                      await aiService.current.createGoal(action.data)
                    } else if (action.type === 'bill') {
                      await aiService.current.createBill(action.data)
                    }
                    await appendMessage({
                      message: 'Registration confirmed.',
                      sender: 'ai',
                      message_type: 'system',
                      created_at: new Date().toISOString()
                    })
                    await resolvePendingAt(index, true)
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
        contentContainerStyle={styles.messagesContainer}
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
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
