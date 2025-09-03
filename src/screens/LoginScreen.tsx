import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Auth from '../components/Auth';
import Header from '../components/Header';

export default function LoginScreen() {
  const handleAuthSuccess = () => {
    // Não precisamos navegar manualmente, o AppNavigator já faz isso
    console.log('Autenticação bem-sucedida');
  };

  return (
    <LinearGradient
      colors={['#1F2937', '#111827']}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <SafeAreaView style={styles.container}>
        <Header title="Login" showProfileButton={false} />
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
            <Text style={styles.tagline}>Elevando sua experiência</Text>
          </View>
          
          <Auth onAuthSuccess={handleAuthSuccess} initialMode="login" />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
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