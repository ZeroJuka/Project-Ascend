import React, { useState } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PageContainer from '../components/ui/PageContainer';
import Chip from '../components/ui/Chip';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig } from '../components/ui/ChartWrapper';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../hooks/useAuth';
import { commonStyles } from '../utils/Styles';

export default function HomeScreen() {
  const { kpis, series } = useAnalytics();
  const { user, signOut } = useAuth();
  const [profileVisible, setProfileVisible] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const width = Dimensions.get('window').width - 32;
  const currency = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR')}`;
  const displayName = user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '[USER]');
  const email = user?.email || 'email@dominio.com';

  return (
    <PageContainer activeScreen="Home">
      <View style={styles.content}>
        <LinearGradient
          colors={[gradients.brand.from, gradients.brand.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setProfileVisible(true)} activeOpacity={0.8}>
                <Image source={require('../../assets/icon.png')} style={styles.avatar} />
              </TouchableOpacity>
              <Text style={styles.username}>{displayName}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Ionicons name="search" size={20} color="#fff" />
              <Ionicons name="menu" size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.balanceLabel}>Seu saldo</Text>
          <Text style={styles.balanceAmount}>{currency(kpis?.balanceThisMonth || 24165)}</Text>
        </LinearGradient>

        <View style={[
          styles.reportsCard,
          { backgroundColor: isDark ? colors.dark.card : colors.light.card, borderColor: isDark ? colors.dark.border : colors.light.border }
        ]}>
          <View style={styles.reportsHeaderRow}>
            <Text style={[styles.reportsTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Relatórios</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Dia" />
              <Chip label="Semana" />
              <Chip label="Mês" active />
              <Chip label="Ano" />
            </View>
          </View>
          <LineChart
            data={{ labels: series?.labels || [], datasets: [{ data: series?.balance || [] }] }}
            width={width}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
          />
        </View>

        {/* Modal de Perfil */}
        <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
          <View style={commonStyles.modalOverlay}>
            <View style={commonStyles.userProfileCard}>
              <View style={commonStyles.userProfileHeader}>
                <Text style={commonStyles.userProfileTitle}>Perfil</Text>
                <TouchableOpacity onPress={() => setProfileVisible(false)} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={commonStyles.userProfileContent}>
                <View style={commonStyles.userProfileAvatar}>
                  <Image source={require('../../assets/icon.png')} style={{ width: 80, height: 80, borderRadius: 40 }} />
                </View>
                <Text style={commonStyles.userProfileName}>{displayName}</Text>
                <Text style={commonStyles.userProfileEmail}>{email}</Text>

                <TouchableOpacity
                  style={[styles.themeToggleButton, { backgroundColor: isDark ? '#111827' : '#2563EB' }]}
                  activeOpacity={0.85}
                  onPress={() => setIsDark(v => !v)}
                >
                  <Text style={[styles.themeToggleText, { color: '#fff' }]}>{isDark ? 'Usar tema claro' : 'Usar tema escuro'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={commonStyles.signOutButton} activeOpacity={0.85} onPress={signOut}>
                  <Text style={commonStyles.signOutButtonText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  username: { marginLeft: spacing.sm, color: '#fff', fontWeight: '800' },
  balanceLabel: { marginTop: spacing.md, color: '#fff', opacity: 0.9 },
  balanceAmount: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  reportsCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  reportsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  reportsTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  themeToggleButton: {
    width: '100%',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  themeToggleText: { fontSize: fontSize.md, fontWeight: '700', textAlign: 'center' },
});