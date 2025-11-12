import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { audioManager } from '../lib/audio';
import { colors, spacing, borderRadius, gradients, elevation } from '../utils/theme';
import { useResponsive } from '../hooks/useResponsive';

type FooterProps = {
  activeScreen?: keyof RootStackParamList;
};

const Footer: React.FC<FooterProps> = ({ activeScreen }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { isSmall } = useResponsive();
  
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
      navigation.navigate('Chat', { initialText: result.transcription });
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
          color={isActive('Home') ? colors.primary : colors.light.subtext} 
        />
        {!isSmall && (<Text style={[styles.navText, isActive('Home') && styles.activeNavText]}>Home</Text>)}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => navigation.navigate('Transactions')}
      >
        <Ionicons 
          name="wallet-outline" 
          size={24} 
          color={isActive('Transactions') ? colors.primary : colors.light.subtext} 
        />
        {!isSmall && (<Text style={[styles.navText, isActive('Transactions') && styles.activeNavText]}>Transações</Text>)}
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
              backgroundColor: isListening ? '#F87171' : colors.primary,
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
              source={require('../../assets/icon-nobg.png')} 
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
        onPress={() => navigation.navigate('Analytics')}
      >
        <Ionicons 
          name="pie-chart-outline" 
          size={24} 
          color={isActive('Analytics') ? colors.primary : colors.light.subtext} 
        />
        {!isSmall && (<Text style={[styles.navText, isActive('Analytics') && styles.activeNavText]}>Análises</Text>)}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => navigation.navigate('Goals')}
      >
        <Ionicons 
          name="flag-outline"
          size={24} 
          color={isActive('Goals') ? colors.primary : colors.light.subtext} 
        />
        {!isSmall && (<Text style={[styles.navText, isActive('Goals') && styles.activeNavText]}>Metas</Text>)}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 28,
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    ...elevation.md,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  navText: {
    fontSize: 10,
    color: colors.light.subtext,
    marginTop: 2,
  },
  activeNavText: {
    color: colors.primary,
    fontWeight: '500',
  },
  centerButtonContainer: {
    position: 'relative',
    bottom: 32,
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
    width: 76,
    height: 76,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default Footer;