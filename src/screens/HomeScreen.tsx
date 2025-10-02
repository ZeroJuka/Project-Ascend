import React from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PageContainer from '../components/ui/PageContainer';
import Chip from '../components/ui/Chip';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig } from '../components/ui/ChartWrapper';
import { useAnalytics } from '../hooks/useAnalytics';

export default function HomeScreen() {
  const { kpis, series } = useAnalytics();
  const width = Dimensions.get('window').width - 32;
  const currency = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR')}`;

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
              <Image source={require('../../assets/icon.png')} style={styles.avatar} />
              <Text style={styles.username}>Cassandra</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Ionicons name="search" size={20} color="#fff" />
              <Ionicons name="menu" size={20} color="#fff" />
            </View>
          </View>
          <Text style={styles.balanceLabel}>Seu saldo</Text>
          <Text style={styles.balanceAmount}>{currency(kpis?.balanceThisMonth || 24165)}</Text>
        </LinearGradient>

        <View style={styles.reportsCard}>
          <View style={styles.reportsHeaderRow}>
            <Text style={styles.reportsTitle}>Relatórios</Text>
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
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  reportsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  reportsTitle: { color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800' },
});