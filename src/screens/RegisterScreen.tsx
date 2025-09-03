import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Auth from '../components/Auth';
import { RootStackParamList } from '../types';
import { commonStyles } from '../components/styles';

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

const styles = commonStyles;