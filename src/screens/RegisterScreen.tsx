import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, StatusBar, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Auth from '../components/Auth';

export default function RegisterScreen() {
  const handleAuthSuccess = () => {
    console.log('Cadastro bem-sucedido');
  };

  return (
    <LinearGradient
      colors={['#1F2937', '#111827']}
      style={styles.gradient}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1F2937" />
      <SafeAreaView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.appName}>Ascend Financial</Text>
          <Text style={styles.tagline}>Crie sua conta e comece a controlar suas finanças</Text>
        </View>
        
        <Auth onAuthSuccess={handleAuthSuccess} initialMode="register" />
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
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#D1D5DB',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});