import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, useColorScheme, Animated, Pressable, Image, Modal } from 'react-native';
import { audioManager } from '../lib/audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.navigate('Login');
  };

  const isDarkMode = useColorScheme() === 'dark';

  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeout = useRef<NodeJS.Timeout | null>(null);
  

  //#region gerenciar audio
  useEffect(() => {
    audioManager.initializeAnimationState();
    return () => {
      audioManager.stopContinuousAnimation();
      if (fadeOutTimeout.current) {
        clearTimeout(fadeOutTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (transcribedText) {
      audioManager.updateFloatingLetters(transcribedText);
      
      if (isListening && transcribedText === 'Ouvindo...') {
        audioManager.startContinuousAnimation();
        audioManager.animateButtonPress(true);
      } else {
        audioManager.stopContinuousAnimation();
        const animState = audioManager.getAnimationState();
        animState.textOpacity.setValue(1);
        
        if (fadeOutTimeout.current) {
          clearTimeout(fadeOutTimeout.current);
        }
        
        // Iniciar o desaparecimento gradual após 5 segundos
        audioManager.startTextFadeOut(5000);
      }
    }
  }, [transcribedText, isListening]);

  const startRecording = async () => {
    const success = await audioManager.startRecording();
    if (success) {
      setTranscribedText('Ouvindo...');
    }
  };

  const stopRecording = async () => {
    const result = await audioManager.stopRecording();
    if (result.success) {
      setTimeout(() => {
        setTranscribedText(result.transcription || '');
      }, 500);
    }
  };

  const handlePressIn = () => {
    // Limpar qualquer timeout anterior
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
    
    longPressTimeout.current = setTimeout(() => {
      setIsListening(true);
      startRecording();
    }, 2000);
    
    // Animação inicial ao pressionar
    audioManager.animateButtonPress(false);
  };

  const handlePressOut = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }

    if (isListening) {
      stopRecording();
      audioManager.stopContinuousAnimation();
      setIsListening(false);
      
      // Retornar o botão ao tamanho normal quando parar de ouvir
      audioManager.resetButtonAnimation();
    } else {
      audioManager.resetButtonAnimation();
      navigation.navigate('Chat' as never);
    }
  };

  // Obter o estado de animação para usar nos componentes
  const animState = audioManager.getAnimationState();

  //#endregion gerenciar audio
  
  const navigationButtons = [
    { icon: 'wallet-outline', label: 'Transações', color: '#4ADE80' },
    { icon: 'pie-chart-outline', label: 'Relatórios', color: '#34D399' },
    { icon: 'trending-up-outline', label: 'Metas', color: '#2DD4BF' },
    { icon: 'settings-outline', label: 'Configurações', color: '#22D3EE' },
  ];


  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.content}>
        {transcribedText && (
          <Animated.View 
            style={[
              styles.transcriptionContainer, 
              { opacity: animState.textOpacity },
              { pointerEvents: 'none' } // Torna o componente intangível
            ]}
          >
            <Animated.Text style={styles.transcribedTextComplete}>
              {transcribedText.split('').map((char, index) => {
                const animValue = index < animState.floatingLetters.length ? 
                  animState.floatingLetters[index] : new Animated.Value(1);
                return (
                  <Animated.Text
                    key={index}
                    style={{
                      opacity: animValue,
                      transform: [
                        {
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    {char}
                  </Animated.Text>
                );
              })}
            </Animated.Text>
          </Animated.View>
        )}
        <Text style={[styles.title, isDarkMode && styles.darkText]}>ASCEND</Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>Bem-vindo ao seu assistente financeiro</Text>
        
        <View style={styles.dashboard}>
          <View style={[styles.balanceCard, { backgroundColor: '#4ADE80' }]}>
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceAmount}>R$ 0,00</Text>
          </View>

          <View style={styles.buttonGrid}>
            {navigationButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.navButton, { backgroundColor: button.color }]}
              >
                <Ionicons name={button.icon as keyof typeof Ionicons.glyphMap} size={24} color="white" />
                <Text style={styles.navButtonText}>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setShowUserProfile(true)}
        >
          <Ionicons name="person-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.centerButtonContainer}>
          <Animated.View
            style={[{
              transform: [{ scale: animState.buttonScale }],
              opacity: 1,
              shadowColor: isListening ? '#4ADE80' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isListening ? 0.8 : 0.25,
              shadowRadius: isListening ? 10 : 3.84,
              elevation: isListening ? 8 : 5,
            }]}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={isListening ? ['#4ADE80', '#10B981'] : ['#4ADE80', '#34D399']}
                style={styles.centerButton}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.centerButtonIcon}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal do Perfil do Usuário */}
      <Modal
        visible={showUserProfile}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userProfileCard}>
            <View style={styles.userProfileHeader}>
              <Text style={styles.userProfileTitle}>Perfil do Usuário</Text>
              <TouchableOpacity onPress={() => setShowUserProfile(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userProfileContent}>
              <View style={styles.userProfileAvatar}>
                <Ionicons name="person" size={48} color="#4ADE80" />
              </View>
              <Text style={styles.userProfileName}>Usuário</Text>
              <Text style={styles.userProfileEmail}>usuario@exemplo.com</Text>
              
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutButtonText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  darkSubtext: {
    color: '#aaa',
  },
  dashboard: {
    flex: 1,
    gap: 20,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  navButtonText: {
    color: '#fff',
    marginTop: 8,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonContainer: {
    position: 'relative',
    bottom: 20,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  transcriptionContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
    zIndex: 10,
  },
  transcribedTextComplete: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userProfileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  userProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    padding: 16,
  },
  userProfileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userProfileContent: {
    padding: 20,
    alignItems: 'center',
  },
  userProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userProfileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  signOutButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 