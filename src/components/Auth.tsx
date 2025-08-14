import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Input } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';

interface AuthProps {
  onAuthSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

export default function Auth({ onAuthSuccess, initialMode = 'login' }: AuthProps) {
  const [slideAnim] = useState(new Animated.Value(initialMode === 'login' ? 0 : Dimensions.get('window').width * 0.4));
  const screenWidth = Dimensions.get('window').width;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useEffect(() => {
    // Ajusta a posição inicial com base no modo
    slideAnim.setValue(isLogin ? 0 : screenWidth * 0.4);
  }, []);

  const toggleMode = () => {
    Animated.spring(slideAnim, {
      toValue: isLogin ? screenWidth * 0.45 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();
    setIsLogin(!isLogin);
  };

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erro ao entrar', error.message);
    } else if (onAuthSuccess) {
      onAuthSuccess();
    }
    
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erro ao cadastrar', error.message);
    } else if (!data.session) {
      Alert.alert('Cadastro realizado', 'Por favor, verifique seu email para confirmar o cadastro!');
      setIsLogin(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40
      }).start();
    } else if (onAuthSuccess) {
      onAuthSuccess();
    }
    
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.modeSelector}>
        <Animated.View 
          style={[styles.modeSelectorSlider, { transform: [{ translateX: slideAnim }] }]} 
        />
        <TouchableOpacity 
          style={[styles.modeButton, isLogin && styles.activeMode]} 
          onPress={() => !isLogin && toggleMode()}
        >
          <Text style={[styles.modeButtonText, isLogin && styles.activeModeText]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, !isLogin && styles.activeMode]} 
          onPress={() => isLogin && toggleMode()}
        >
          <Text style={[styles.modeButtonText, !isLogin && styles.activeModeText]}>Cadastro</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.formContainer}>
        <Input
          label="Email"
          labelStyle={styles.inputLabel}
          leftIcon={{ type: 'font-awesome', name: 'envelope', color: '#9CA3AF' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@exemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          inputStyle={styles.inputText}
          containerStyle={styles.inputContainer}
        />
        
        <Input
          label="Senha"
          labelStyle={styles.inputLabel}
          leftIcon={{ type: 'font-awesome', name: 'lock', color: '#9CA3AF' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
          placeholder="Senha"
          autoCapitalize="none"
          textContentType="password"
          inputStyle={styles.inputText}
          containerStyle={styles.inputContainer}
        />
        
        <Button
          title={isLogin ? 'Entrar' : 'Cadastrar'}
          disabled={loading}
          onPress={isLogin ? signInWithEmail : signUpWithEmail}
          buttonStyle={styles.button}
          loading={loading}
          loadingProps={{ color: '#1F2937' }}
          ViewComponent={LinearGradient as any}
          linearGradientProps={{
            colors: ['#4ADE80', '#34D399'],
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 }
          }}
          titleStyle={styles.buttonText}
          disabledStyle={styles.buttonDisabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 25,
    marginBottom: 30,
    position: 'relative',
    height: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  modeSelectorSlider: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  modeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modeButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  activeMode: {
    backgroundColor: 'transparent',
  },
  activeModeText: {
    color: '#1F2937',
    fontWeight: 'bold',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#374151',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputText: {
    color: '#F9FAFB',
  },
  button: {
    borderRadius: 25,
    marginTop: 20,
    height: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
});