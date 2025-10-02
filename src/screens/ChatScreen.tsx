import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import PageContainer from '../components/ui/PageContainer';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../utils/theme';
import { callGeminiAPI } from '../lib/genai';

type Message = { id: string; text: string; isUser: boolean };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), text: inputText, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    try {
      const response = await callGeminiAPI(userMessage.text);
      const aiText = response?.candidates?.[0]?.content?.parts?.[0]?.text || '...';
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: aiText, isUser: false }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: 'Erro ao enviar.', isUser: false }]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.message, item.isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.messageText, item.isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
    </View>
  );

  return (
    <PageContainer activeScreen="Chat">
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Digite sua mensagem..."
          placeholderTextColor={colors.light.subtext}
        />
        <TouchableOpacity style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]} onPress={sendMessage} disabled={!inputText.trim()}>
          <Ionicons name="send" size={18} color={inputText.trim() ? colors.primary : colors.light.subtext} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: 100 },
  message: { maxWidth: '80%', marginVertical: 8, padding: spacing.md, borderRadius: borderRadius.lg },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border },
  messageText: { fontSize: 16 },
  userText: { color: colors.light.text },
  aiText: { color: colors.light.text },
  inputBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.light.card, borderTopWidth: 1, borderTopColor: colors.light.border },
  input: { flex: 1, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, borderRadius: 24, paddingHorizontal: spacing.md, paddingVertical: 10, marginRight: spacing.sm, color: colors.light.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});