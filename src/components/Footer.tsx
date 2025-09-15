import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { audioManager } from '../lib/audio';

type FooterProps = {
  activeScreen?: keyof RootStackParamList;
};

const Footer: React.FC<FooterProps> = ({ activeScreen }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  
  const currentScreen = activeScreen || (route.name as keyof RootStackParamList);

  const isActive = (screen: string) => currentScreen === screen;

  const [isListening, setIsListening] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  // Inicializar estado de animação
  useEffect(() => {
    audioManager.initializeAnimationState();
    return () => {
      audioManager.stopContinuousAnimation();
    };
  }, []);


  const startRecording = async () => {
    const success = await audioManager.startRecording();
    if (success) {
      console.log('Gravação iniciada');
    }
  };

  const stopRecording = async () => {
    const result = await audioManager.stopRecording();
    if (result.success && result.transcription) {
      navigation.navigate('Chat');
    }
  };

  const handlePressIn = () => {
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
      navigation.navigate('Chat');
    }
  };

  const animState = audioManager.getAnimationState();

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons 
          name="home-outline" 
          size={24} 
          color={isActive('Home') ? "#4ADE80" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, isActive('Home') && styles.activeNavText]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => navigation.navigate('Transactions')}
      >
        <Ionicons 
          name="wallet-outline" 
          size={24} 
          color={isActive('Transactions') ? "#4ADE80" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, isActive('Transactions') && styles.activeNavText]}>Transações</Text>
      </TouchableOpacity>
      
      {/* Botão central para IA */}
      <View style={styles.centerButtonContainer}>
        <Animated.View
          style={[
            styles.centerButtonGlow,
            {
              opacity: animState.buttonGlow,
              transform: [
                { scale: 1.5 }
              ]
            }
          ]}
        />
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.centerButton,
            {
              backgroundColor: isListening ? '#F87171' : '#4ADE80',
              transform: [
                { scale: pressed ? 0.95 : 1 }
              ]
            }
          ]}
        >
          {isListening ? (
            <Ionicons name="mic" size={30} color="#ffffff" />
          ) : (
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logoImage} 
              resizeMode="contain"
              width={50}
              height={50}
            />
          )}
        </Pressable>
      </View>
      
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => console.log('Analytics')}
      >
        <Ionicons 
          name="pie-chart-outline" 
          size={24} 
          color={isActive('Analytics') ? "#4ADE80" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, isActive('Analytics') && styles.activeNavText]}>Análises</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => navigation.navigate('Goals')}
      >
        <Ionicons 
          name="flag-outline"
          size={24} 
          color={isActive('Goals') ? "#4ADE80" : "#9CA3AF"} 
        />
        <Text style={[styles.navText, isActive('Goals') && styles.activeNavText]}>Metas</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  activeNavText: {
    color: '#4ADE80',
    fontWeight: '500',
  },
  centerButtonContainer: {
    position: 'relative',
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 30,
    height: 30,
    tintColor: '#FFFFFF',
  },
  centerButtonGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4ADE80',
    opacity: 0.3,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default Footer;