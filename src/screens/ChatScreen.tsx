import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  Platform,
  Keyboard,
  Dimensions,
  KeyboardAvoidingView,
  Animated,
  Easing,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../utils/theme';
import { callGeminiAPI } from '../lib/genai';
import { useNavigation } from '@react-navigation/native';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const dotAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Animação dos pontos de espera
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      dotAnimation.setValue(0);
    }
  }, [isLoading]);

  // Monitorar altura do teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Rolar para a última mensagem quando uma nova mensagem é adicionada
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
  
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Garantir que o prompt nunca seja undefined
      const prompt = userMessage.text || "";
      const response = await callGeminiAPI(prompt);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response.candidates[0].content.parts[0].text,
        isUser: false,
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, encontrei um erro ao processar sua solicitação.",
        isUser: false,
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
      {item.isUser ? (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.userMessage}
        >
          <Text style={styles.userMessageText}>{item.text}</Text>
        </LinearGradient>
      ) : (
        <View style={styles.aiMessage}>
          <Text style={styles.aiMessageText}>{item.text}</Text>
        </View>
      )}
    </View>
  );

  // Animação dos pontos
  const dot1Opacity = dotAnimation.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 1, 0.3, 0.3]
  });

  const dot2Opacity = dotAnimation.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 0.3, 1, 0.3]
  });

  const dot3Opacity = dotAnimation.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [0.3, 0.3, 0.3, 1]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark.background} />
      <LinearGradient
        colors={[colors.dark.background, '#111827']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ATLAS</Text>
            <View style={styles.backButton} />
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {isLoading && (
            <View style={styles.loadingContainer}>
              <View style={styles.atlasIconContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.atlasIcon}
                >
                  <Text style={styles.atlasIconText}>A</Text>
                </LinearGradient>
              </View>
              <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
                <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
                <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
              </View>
            </View>
          )}
        </SafeAreaView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color="#1F2937" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: 60, // Espaço para a barra de entrada
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + spacing.sm : spacing.md,
    marginTop: Platform.OS === 'android' ? 0 : spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700', // Substituído de fontWeight.bold
    color: '#fff',
    textAlign: 'center',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: spacing.sm,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.sm,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  aiMessage: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.sm,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessageText: {
    fontSize: fontSize.md,
    color: '#1F2937',
    fontWeight: '500', // Substituído de fontWeight.medium
  },
  aiMessageText: {
    fontSize: fontSize.md,
    color: '#fff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: spacing.md,
    marginBottom: spacing.md,
  },
  atlasIconContainer: {
    marginRight: spacing.sm,
  },
  atlasIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atlasIconText: {
    color: '#1F2937',
    fontSize: fontSize.md,
    fontWeight: '700', // Substituído de fontWeight.bold
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 3,
  },
  keyboardAvoidingView: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.md + 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    color: '#fff',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});