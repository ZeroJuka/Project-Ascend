import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import PageContainer from '../components/ui/PageContainer';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, gradients, elevation } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { callGeminiAPI } from '../lib/genai';

type Message = { id: string; text: string; isUser: boolean };

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
    <View style={[styles.row, item.isUser ? styles.rowEnd : styles.rowStart]}>
      <LinearGradient
        colors={item.isUser ? [gradients.brand.from, gradients.brand.to] : [gradients.teal.from, gradients.teal.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.message, item.isUser ? styles.userBubble : styles.aiBubble]}
      >
        <Text style={[styles.messageText, styles.messageTextLight]}>{item.text}</Text>
      </LinearGradient>
    </View>
  );

  return (
    <PageContainer activeScreen="Chat" showFooter={false}>
      {/* Top bar com botão de voltar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="chevron-back" size={22} color={colors.light.text} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ATLAS</Text>
        <View style={{ width: 64 }} />
      </View>

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
          <Ionicons name="send" size={18} color={inputText.trim() ? '#ffffff' : colors.light.subtext} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: colors.light.text, fontSize: 14 },
  title: { color: colors.light.text, fontSize: 16, fontWeight: '700' },

  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  row: { marginVertical: 6 },
  rowEnd: { alignItems: 'flex-end' },
  rowStart: { alignItems: 'flex-start' },
  message: { maxWidth: '80%', padding: spacing.md, borderRadius: borderRadius.xl, ...elevation.md },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  messageText: { fontSize: 16 },
  messageTextLight: { color: '#FFFFFF' },
  inputBar: { flexDirection: 'row', padding: spacing.md, backgroundColor: colors.light.card, borderTopWidth: 1, borderTopColor: colors.light.border },
  input: { flex: 1, backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, borderRadius: 24, paddingHorizontal: spacing.md, paddingVertical: 10, marginRight: spacing.sm, color: colors.light.text },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, borderWidth: 0, alignItems: 'center', justifyContent: 'center', ...elevation.sm },
  sendDisabled: { opacity: 0.5 },
});