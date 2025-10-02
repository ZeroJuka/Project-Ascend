import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import Auth from '../components/Auth';

export default function RegisterScreen() {
  const handleAuthSuccess = () => {
    console.log('Registro concluído');
  };

  return (
    <LinearGradient colors={[gradients.brand.from, gradients.brand.to]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Ascend</Text>
          <Text style={styles.tagline}>Crie sua conta para começar</Text>
        </View>

        <View style={styles.authCard}>
          <Auth onAuthSuccess={handleAuthSuccess} initialMode="register" />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: spacing.md },
  logo: { width: 90, height: 90, borderRadius: borderRadius.round },
  appName: { fontSize: fontSize.xxxl, fontWeight: '800', color: '#fff', marginTop: spacing.xs },
  tagline: { fontSize: fontSize.sm, color: '#fff', opacity: 0.8 },
  authCard: { marginHorizontal: spacing.md, backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
});