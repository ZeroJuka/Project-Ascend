import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.navigate('Login');
  };

  const isDarkMode = useColorScheme() === 'dark';

  const navigationButtons = [
    { icon: 'wallet-outline', label: 'Transações', color: '#4ADE80' },
    { icon: 'pie-chart-outline', label: 'Relatórios', color: '#34D399' },
    { icon: 'trending-up-outline', label: 'Metas', color: '#2DD4BF' },
    { icon: 'settings-outline', label: 'Configurações', color: '#22D3EE' },
  ];

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>ASCEND</Text>
        <Text style={[styles.subtitle, isDarkMode && styles.darkSubtext]}>Bem-vindo ao seu assistente financeiro</Text>
        
        <View style={styles.dashboard}>
          <View style={[styles.balanceCard, { backgroundColor: '#4ADE80' }]}>
            <Text style={styles.balanceLabel}>Saldo Total</Text>
            <Text style={styles.balanceAmount}>R$ 0,00</Text>
          </View>

          <View style={styles.buttonGrid}>
            {navigationButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.navButton, { backgroundColor: button.color }]}
              >
                <Ionicons name={button.icon as keyof typeof Ionicons.glyphMap} size={24} color="white" />
                <Text style={styles.navButtonText}>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.signOutButton, isDarkMode && styles.darkSignOutButton]} 
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutButtonText, isDarkMode && styles.darkText]}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  darkContainer: {
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40,
    color: '#4ADE80',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 10,
    color: '#666',
    marginBottom: 30,
  },
  dashboard: {
    flex: 1,
    width: '100%',
    padding: 20,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  navButton: {
    width: '47%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  darkSignOutButton: {
    backgroundColor: '#374151',
  },
  signOutButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  darkText: {
    color: '#fff',
  },
  darkSubtext: {
    color: '#9CA3AF',
  },
});