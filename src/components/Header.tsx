import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { headerStyles } from '../utils/Styles';

type HeaderProps = {
  title?: string;
  showProfileButton?: boolean;
  onProfilePress?: () => void;
};

const Header: React.FC<HeaderProps> = ({ 
  title = 'ASCEND', 
  showProfileButton = true,
  onProfilePress 
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView 
      style={[headerStyles.headerContainer, { 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 100,
        paddingTop: Platform.OS === 'ios' ? 0 : 10 // Ajuste para iOS
      }]}
      edges={['top']}
    >
      <View style={headerStyles.headerContent}>
        <View style={headerStyles.logoContainer}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={headerStyles.logoImage} 
            resizeMode="contain"
          />
          <Text style={headerStyles.logoText}>{title}</Text>
        </View>
        
        {showProfileButton && (
          <TouchableOpacity 
            style={headerStyles.profileButton}
            onPress={onProfilePress}
            activeOpacity={0.7} // Estado interativo ao pressionar
          >
            <Ionicons name="person" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Header;