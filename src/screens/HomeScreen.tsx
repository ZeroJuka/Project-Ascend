import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, useColorScheme, Animated, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  const [buttonScale] = React.useState(new Animated.Value(1));
  const [buttonGlow] = React.useState(new Animated.Value(0));

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1.1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonGlow, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonGlow, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  };

  const handlePressOut = () => {
    buttonGlow.stopAnimation();
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    navigation.navigate('Chat' as never);
  };

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
        
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="person-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.centerButtonContainer}>
          <Animated.View
            style={[{
              transform: [{ scale: buttonScale }],
              opacity: buttonGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
              }),
            }]}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={['#4ADE80', '#34D399']}
                style={styles.centerButton}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.centerButtonIcon}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="settings-outline" size={24} color="#fff" />
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  centerButtonContainer: {
    marginTop: -40,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  centerButtonIcon: {
    width: 30,
    height: 30,
    tintColor: '#fff',
  },
});