import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Input } from '@rneui/themed';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    Animated.spring(slideAnim, {
      toValue: isLogin ? screenWidth * 0.8 : 0,
      useNativeDriver: true,
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
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@exemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        
        <Input
          label="Senha"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
          placeholder="Senha"
          autoCapitalize="none"
          textContentType="password"
        />
        
        <Button
          title={isLogin ? 'Entrar' : 'Cadastrar'}
          disabled={loading}
          onPress={isLogin ? signInWithEmail : signUpWithEmail}
          buttonStyle={[styles.button, { backgroundColor: isLogin ? '#4ADE80' : '#34D399' }]}
          loading={loading}
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
    backgroundColor: '#1F2937',
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 25,
    marginBottom: 30,
    position: 'relative',
    height: 50,
  },
  modeSelectorSlider: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 25,
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
  },
  button: {
    borderRadius: 25,
    marginTop: 20,
    height: 50,
  },
});