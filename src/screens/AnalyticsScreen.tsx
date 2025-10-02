import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PageContainer from '../components/ui/PageContainer';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { chartConfig } from '../components/ui/ChartWrapper';
import Chip from '../components/ui/Chip';
import { useAnalytics } from '../hooks/useAnalytics';

export default function AnalyticsScreen() {
  const { kpis, series } = useAnalytics();
  const width = Math.floor(Dimensions.get('window').width - 32);
  const currency = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR')}`;
  const [metric, setMetric] = useState<'balance' | 'income' | 'expense'>('balance');
  const chartData = { labels: series?.labels || [], datasets: [{ data: series?.[metric] || [] }] };

  return (
    <PageContainer activeScreen="Analytics">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[gradients.teal.from, gradients.teal.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Análises</Text>
            <Ionicons name="stats-chart" size={18} color="#fff" />
          </View>
          <Text style={styles.heroSubtitle}>{currency(kpis?.balanceThisMonth || 0)}</Text>
          <View style={styles.heroChips}>
            <TouchableOpacity onPress={() => setMetric('balance')}><Chip label="Balanço" active={metric==='balance'} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setMetric('income')}><Chip label="Receitas" active={metric==='income'} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setMetric('expense')}><Chip label="Despesas" active={metric==='expense'} /></TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.tileRow}>
          <View style={[styles.tile, { backgroundColor: '#E6FFFB' }]}> 
            <Text style={styles.tileLabel}>Receitas</Text>
            <Text style={styles.tileValue}>{currency(kpis?.incomeThisMonth || 0)}</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: '#E6F7FF' }]}> 
            <Text style={styles.tileLabel}>Despesas</Text>
            <Text style={styles.tileValue}>{currency(kpis?.expenseThisMonth || 0)}</Text>
          </View>
        </View>

        <View style={styles.chartBlock}>
          <LineChart
            data={chartData}
            width={width}
            height={180}
            chartConfig={chartConfig}
            yAxisLabel="R$"
            yAxisSuffix=""
            bezier
            style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
          />
        </View>

        <View style={styles.chartBlock}>
          <BarChart
            data={{ labels: series?.labels || [], datasets: [{ data: series?.income || [] }, { data: series?.expense || [] }] }}
            width={width}
            height={180}
            chartConfig={chartConfig}
            yAxisLabel="R$"
            yAxisSuffix=""
            fromZero
            showBarTops={false}
            style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
          />
        </View>

        <View style={styles.tileRow}>
          <View style={[styles.tile, { backgroundColor: '#F0FFF4' }]}> 
            <Text style={styles.tileLabel}>Variação Balanço</Text>
            <Text style={styles.tileValue}>{(kpis?.changeBalancePct ?? 0).toFixed(1)}%</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: '#FFF5F5' }]}> 
            <Text style={styles.tileLabel}>Variação Receitas</Text>
            <Text style={styles.tileValue}>{(kpis?.changeIncomePct ?? 0).toFixed(1)}%</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: '#F7FAFC' }]}> 
            <Text style={styles.tileLabel}>Variação Despesas</Text>
            <Text style={styles.tileValue}>{(kpis?.changeExpensePct ?? 0).toFixed(1)}%</Text>
          </View>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { borderRadius: borderRadius.xl, padding: spacing.lg },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
  heroSubtitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  heroChips: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  tileRow: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.light.border },
  tileLabel: { color: colors.light.text, opacity: 0.7 },
  tileValue: { color: colors.light.text, fontSize: 18, fontWeight: '800' },
  chartBlock: { backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
});