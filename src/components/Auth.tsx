import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Input } from '@rneui/themed';

interface AuthProps {
  onAuthSuccess?: () => void;
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

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
      <Text style={styles.title}>{isLogin ? 'Login' : 'Cadastro'}</Text>
      
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
          buttonStyle={styles.button}
          loading={loading}
        />
        
        <TouchableOpacity 
          onPress={() => setIsLogin(!isLogin)} 
          style={styles.switchMode}
        >
          <Text style={styles.switchText}>
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
          </Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 5,
    marginTop: 10,
  },
  switchMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#4A90E2',
    fontSize: 16,
  },
});