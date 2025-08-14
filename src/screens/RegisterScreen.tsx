import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Auth from '../components/Auth';
import { RootStackParamList } from '../types';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const handleAuthSuccess = () => {
    console.log('Cadastro bem-sucedido');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.appName}>Project Ascend</Text>
          <Text style={styles.tagline}>Crie sua conta</Text>
        </View>
        
        <Auth onAuthSuccess={handleAuthSuccess} initialMode="register" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginTop: 15,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 5,
  },
});