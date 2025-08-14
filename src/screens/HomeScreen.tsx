import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, useColorScheme, Animated, Pressable, Image } from 'react-native';
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
  const animationInterval = useRef<NodeJS.Timeout | null>(null);
  const floatingLetters = useRef<Animated.Value[]>([]);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (transcribedText) {
      floatingLetters.current = transcribedText.split('').map(() => new Animated.Value(0));
      animateLetters();
      
      if (isListening && transcribedText === 'Ouvindo...') {
        startContinuousAnimation();
      } else {
        stopContinuousAnimation();
      }
    }
    
    return () => {
      stopContinuousAnimation();
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
      // Aqui você pode implementar a chamada para a API de transcrição
      // Por enquanto, vamos simular uma resposta após um breve delay
      setTimeout(() => {
        setTranscribedText('Exemplo de transcrição de áudio');
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
          <View style={styles.transcriptionContainer}>
            {transcribedText.split('').map((letter, index) => (
              <Animated.Text
                key={index}
                style={[
                  styles.floatingLetter,
                  {
                    transform: [
                      {
                        translateY: floatingLetters.current[index]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }) || 0,
                      },
                      {
                        scale: floatingLetters.current[index]?.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 1],
                        }) || 1,
                      },
                    ],
                    opacity: floatingLetters.current[index]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }) || 0,
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            ))}
          </View>
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
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="person-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.centerButtonContainer}>
          <Animated.View
            style={[{
              transform: [{ scale: buttonScale }],
              opacity: buttonGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
              }),
            }]}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={['#4ADE80', '#34D399']}
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

        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
    top: '40%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 20,
    zIndex: 10,
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
});