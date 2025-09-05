import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, useColorScheme, Animated, Pressable, Image, Modal } from 'react-native';
import { audioManager } from '../lib/audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { commonStyles } from '../utils/Styles';
import Header from '../components/Header';
import Footer from '../components/Footer';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Não precisamos navegar manualmente, o AppNavigator já faz isso
    console.log('Logout realizado com sucesso');
  };

  const isDarkMode = useColorScheme() === 'dark';

  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
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
  
  const handleProfilePress = () => {
    setShowUserProfile(true);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Header onProfilePress={handleProfilePress} />
      <View style={[styles.content, { marginTop: 80 }]}>
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
        
        {/* Saldo Total */}
        <View style={styles.balanceCardContainer}>
          <LinearGradient
            colors={['#4ADE80', '#34D399']}
            style={styles.balanceCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceAmount}>R$ 12.847,50</Text>
            <Text style={styles.balanceChange}>+15,3% este mês</Text>
          </LinearGradient>
        </View>

        {/* Cards de Receitas e Gastos */}
        <View style={styles.statsContainer}>
          <View style={[styles.statsCard, { backgroundColor: 'rgba(74, 222, 128, 0.9)' }]}>
            <Text style={styles.statsLabel}>Receitas</Text>
            <Text style={styles.statsAmount}>R$ 8.420</Text>
            <Text style={[styles.statsChange, { color: '#4ADE80' }]}>+12,5%</Text>
            <Ionicons name="arrow-up-outline" size={20} color="#4ADE80" style={styles.statsIcon} />
          </View>
          
          <View style={[styles.statsCard, { backgroundColor: 'rgba(56, 189, 248, 0.9)' }]}>
            <Text style={styles.statsLabel}>Gastos</Text>
            <Text style={styles.statsAmount}>R$ 6.340</Text>
            <Text style={[styles.statsChange, { color: '#F87171' }]}>-8,2%</Text>
            <Ionicons name="arrow-down-outline" size={20} color="#F87171" style={styles.statsIcon} />
          </View>
        </View>

        {/* Análise de Gastos */}
        <View style={styles.expenseAnalysisContainer}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseTitle}>Análise de Gastos</Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'categories' && styles.activeTabButton]}
                onPress={() => setActiveTab('categories')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'categories' && styles.activeTabText]}>Categorias</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'monthly' && styles.activeTabButton]}
                onPress={() => setActiveTab('monthly')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'monthly' && styles.activeTabText]}>Mensal</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            {/* Aqui seria inserido o componente de gráfico */}
            <View style={styles.donutChart}>
              <View style={[styles.donutSegment, { backgroundColor: '#4ADE80', width: 120, height: 120, transform: [{ rotate: '0deg' }] }]} />
              <View style={[styles.donutSegment, { backgroundColor: '#38BDF8', width: 100, height: 100, transform: [{ rotate: '120deg' }] }]} />
              <View style={[styles.donutSegment, { backgroundColor: '#A78BFA', width: 80, height: 80, transform: [{ rotate: '200deg' }] }]} />
              <View style={[styles.donutSegment, { backgroundColor: '#FB923C', width: 60, height: 60, transform: [{ rotate: '260deg' }] }]} />
              <View style={[styles.donutSegment, { backgroundColor: '#F87171', width: 40, height: 40, transform: [{ rotate: '320deg' }] }]} />
              <View style={styles.donutHole} />
            </View>
          </View>
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.legendText}>Alimentação</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#38BDF8' }]} />
              <Text style={styles.legendText}>Transporte</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#A78BFA' }]} />
              <Text style={styles.legendText}>Lazer</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FB923C' }]} />
              <Text style={styles.legendText}>Saúde</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F87171' }]} />
              <Text style={styles.legendText}>Outros</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Barra de navegação inferior padronizada */}
      <Footer activeScreen="Home" />

      <Modal
        visible={showUserProfile}
        transparent={true}
        animationType="fade"
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

// Estilos específicos para esta tela
const styles = StyleSheet.create({
  ...commonStyles,
  balanceCardContainer: {
    marginBottom: 16,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  balanceChange: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  statsLabel: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  statsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statsChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  expenseAnalysisContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 20,
    padding: 2,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  activeTabButton: {
    backgroundColor: '#4ADE80',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.7,
  },
  activeTabText: {
    opacity: 1,
    fontWeight: '500',
  },
  chartContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutSegment: {
    position: 'absolute',
    borderRadius: 100,
  },
  donutHole: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937',
    position: 'absolute',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#fff',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  navText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
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
});