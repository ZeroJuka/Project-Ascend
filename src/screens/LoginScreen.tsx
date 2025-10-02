import React from 'react';
import { StyleSheet, View, Image, SafeAreaView, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import Auth from '../components/Auth';
import { commonStyles } from '../utils/Styles';

export default function LoginScreen() {
  const handleAuthSuccess = () => {
    console.log('Autenticação bem-sucedida');
  };

  return (
    <LinearGradient colors={[gradients.brand.from, gradients.brand.to]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.md }} showsVerticalScrollIndicator={false}>
          <View style={commonStyles.logoContainer}>
            <Image source={require('../../assets/icon.png')} style={commonStyles.logo} resizeMode="contain" />
            <Text style={commonStyles.appName}>Ascend</Text>
            <Text style={commonStyles.tagline}>Controle financeiro moderno e simples</Text>
          </View>

          <View style={styles.authCard}>
            <Auth onAuthSuccess={handleAuthSuccess} initialMode="login" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  authCard: { marginHorizontal: spacing.md, backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
});