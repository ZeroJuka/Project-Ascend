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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { GeminiAIService } from '../services/GeminiAIService'

interface Message {
  id: string
  message: string
  sender: 'user' | 'ai'
  message_type: 'text' | 'voice' | 'system'
  created_at: string
}

interface ConfirmationModal {
  visible: boolean
  type: 'transaction' | 'goal'
  data: any
  message: string
}

export default function ChatScreen({ route }: any) {
  const [messages, setMessages] = useState<Message[]>([])
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
  const aiService = useRef(new GeminiAIService(user?.id || ''))

  useEffect(() => {
    fetchMessages()
    
    // If voice message from route, send it
    if (route.params?.voiceMessage) {
      handleVoiceMessage(route.params.voiceMessage)
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true })
    }
  }, [messages])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const saveMessage = async (message: string, sender: 'user' | 'ai', messageType: 'text' | 'voice' | 'system') => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          message,
          sender,
          message_type: messageType,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }

  const handleVoiceMessage = async (voiceMessage: string) => {
    // Save the voice message
    const savedMessage = await saveMessage(voiceMessage, 'user', 'voice')
    if (savedMessage) {
      setMessages(prev => [...prev, savedMessage])
    }

    // Process with AI
    await processAIMessage(voiceMessage, 'voice')
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return

    const message = inputText.trim()
    setInputText('')
    setLoading(true)

    // Save user message
    const savedMessage = await saveMessage(message, 'user', 'text')
    if (savedMessage) {
      setMessages(prev => [...prev, savedMessage])
    }

    // Process with AI
    await processAIMessage(message, 'text')
  }

  const processAIMessage = async (message: string, messageType: 'text' | 'voice') => {
    try {
      const response = await aiService.current.generateFinancialInsight(message)
      
      // Save AI response
      const savedAIMessage = await saveMessage(response.content, 'ai', 'text')
      if (savedAIMessage) {
        setMessages(prev => [...prev, savedAIMessage])
      }

      // Handle special cases (transaction or goal creation)
      if (response.type === 'transaction' || response.type === 'goal') {
        setConfirmationModal({
          visible: true,
          type: response.type,
          data: response.data,
          message: response.content
        })
      }
    } catch (error) {
      console.error('Error processing AI message:', error)
      const errorMessage = await saveMessage(
        'Sorry, I encountered an error processing your request. Please try again.',
        'ai',
        'text'
      )
      if (errorMessage) {
        setMessages(prev => [...prev, errorMessage])
      }
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user'
    const isVoice = item.message_type === 'voice'
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <LinearGradient
          colors={
            isUser
              ? ['#4A90E2', '#357ABD']
              : isVoice
              ? ['#FFD700', '#FFA500']
              : ['#F0F0F0', '#E8E8E8']
          }
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.aiMessageBubble
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
            isUser || isVoice ? styles.messageTextLight : styles.messageTextDark
          ]}>
            {item.message}
          </Text>
          <Text style={[
            styles.messageTime,
            isUser || isVoice ? styles.messageTimeLight : styles.messageTimeDark
          ]}>
            {new Date(item.created_at).toLocaleTimeString()}
          </Text>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ASCEND AI Assistant</Text>
        <Text style={styles.headerSubtitle}>Ask me about your finances</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
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
            placeholder="Ask about your finances..."
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

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmationModal({ visible: false, type: 'transaction', data: null, message: '' })}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {confirmationModal.type === 'transaction' ? 'Confirm Transaction' : 'Confirm Goal'}
              </Text>
              <TouchableOpacity
                onPress={() => setConfirmationModal({ visible: false, type: 'transaction', data: null, message: '' })}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>{confirmationModal.message}</Text>
              
              {confirmationModal.data && (
                <View style={styles.dataContainer}>
                  {confirmationModal.type === 'transaction' ? (
                    <>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Amount:</Text>
                        <Text style={styles.dataValue}>${confirmationModal.data.amount}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Description:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.description}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Category:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.category}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Type:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.type}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Title:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.title}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Target Amount:</Text>
                        <Text style={styles.dataValue}>${confirmationModal.data.target_amount}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Type:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.goal_type}</Text>
                      </View>
                      <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Period:</Text>
                        <Text style={styles.dataValue}>{confirmationModal.data.time_period}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setConfirmationModal({ visible: false, type: 'transaction', data: null, message: '' })}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirmAction}
                >
                  <Text style={styles.confirmButtonText}>
                    {confirmationModal.type === 'transaction' ? 'Create Transaction' : 'Create Goal'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  aiMessageBubble: {
    borderBottomLeftRadius: 4,
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