import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Text } from 'react-native';
import Auth from '../components/Auth';
import { commonStyles } from '../utils/Styles';
import Header from '../components/Header';

export default function RegisterScreen() {
  const handleAuthSuccess = () => {
    // Não precisamos navegar manualmente, o AppNavigator já faz isso
    console.log('Cadastro bem-sucedido');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header title="Cadastro" showProfileButton={false} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={[styles.logoContainer, { marginTop: 80 }]}>
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

const styles = commonStyles;