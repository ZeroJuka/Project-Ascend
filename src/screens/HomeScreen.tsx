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

  const [buttonScale] = useState(new Animated.Value(1));
  const [buttonGlow] = useState(new Animated.Value(0));
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [textOpacity] = useState(new Animated.Value(1));
  const [showUserProfile, setShowUserProfile] = useState(false);
  const animationInterval = useRef<NodeJS.Timeout | null>(null);
  const floatingLetters = useRef<Animated.Value[]>([]);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (transcribedText) {
      floatingLetters.current = transcribedText.split('').map(() => new Animated.Value(0));
      animateLetters();
      
      if (isListening && transcribedText === 'Ouvindo...') {
        startContinuousAnimation();
        Animated.parallel([
          Animated.spring(buttonScale, {
            toValue: 1.6, 
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(buttonGlow, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(buttonGlow, {
                toValue: 0.5,
                duration: 800,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      } else {
        stopContinuousAnimation();
        textOpacity.setValue(1);
        
        if (fadeOutTimeout.current) {
          clearTimeout(fadeOutTimeout.current);
        }
        
        // Iniciar o desaparecimento gradual após 5 segundos
        fadeOutTimeout.current = setTimeout(() => {
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: 1000, 
            useNativeDriver: true,
          }).start();
        }, 5000); 
      }
    }
    
    return () => {
      stopContinuousAnimation();
      if (fadeOutTimeout.current) {
        clearTimeout(fadeOutTimeout.current);
      }
    };
  }, [transcribedText, isListening]);

  const animateLetters = () => {
    if (floatingLetters.current.length === 0) return;
    
    const animations = floatingLetters.current.map((value, index) => {
      return Animated.sequence([
        Animated.delay(index * 50), 
        Animated.spring(value, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]);
    });    
    Animated.parallel(animations).start();
  };
  
  const startContinuousAnimation = () => {
    stopContinuousAnimation();
    
    animationInterval.current = setInterval(() => {
      floatingLetters.current.forEach((value) => {
        value.setValue(0);
      });
      
      animateLetters();
    }, 1500);
  };
  
  const stopContinuousAnimation = () => {
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }
  };

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
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1.1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonGlow, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonGlow, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  };

  const handlePressOut = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }

    if (isListening) {
      stopRecording();
      stopContinuousAnimation();
      setIsListening(false);
      
      // Retornar o botão ao tamanho normal quando parar de ouvir
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      buttonGlow.stopAnimation();
    } else {
      buttonGlow.stopAnimation();
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      navigation.navigate('Chat' as never);
    }
  };

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
              { opacity: textOpacity },
              { pointerEvents: 'none' } // Torna o componente intangível
            ]}
          >
            <Animated.Text style={styles.transcribedTextComplete}>
              {transcribedText}
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
              transform: [{ scale: buttonScale }],
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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userProfileContent}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={50} color="#4ADE80" />
              </View>
              <Text style={styles.userName}>Usuário</Text>
              <Text style={styles.userEmail}>usuario@exemplo.com</Text>
              
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Sair</Text>
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
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40,
    color: '#4ADE80',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    color: '#666',
    marginBottom: 30,
  },
  dashboard: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  navButton: {
    width: '47%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  darkSignOutButton: {
    backgroundColor: '#374151',
  },
  signOutButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  centerButtonContainer: {
    marginTop: -40,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerButtonIcon: {
    width: 30,
    height: 30,
    tintColor: '#fff',
  },
  transcriptionContainer: {
    position: 'absolute',
    top: '75%', // Posicionado mais próximo ao botão Atlas
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 10,
    alignItems: 'center',
    maxWidth: '100%',
  },
  transcribedTextComplete: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: '#34D399',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    flexWrap: 'wrap',
    maxWidth: '90%',
  },
  floatingLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginHorizontal: 2,
    textShadowColor: '#34D399',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // Novos estilos
  profileButton: {
    padding: 10,
  },
  settingsButton: {
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  userProfileCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  userProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userProfileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userProfileContent: {
    alignItems: 'center',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});