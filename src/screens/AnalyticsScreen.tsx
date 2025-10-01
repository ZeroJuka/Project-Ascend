import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

type TabKey = 'Balanço' | 'Categorias' | 'Evolução' | 'Orçamento';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('Balanço');

  const chartWidth = useMemo(() => screenWidth - 32, []);

  const balanceBarData = {
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [
      { data: [10200, 12000, 13000], color: () => '#34D399' },
      { data: [8500, 9200, 9000], color: () => '#EF4444' },
    ],
  };

  const balanceLineData = {
    labels: ['Jan', 'Fev', 'Mar'],
    datasets: [
      { data: [1700, 2800, 3500], color: () => '#F59E0B', strokeWidth: 3 },
    ],
  };

  const pieData = [
    { name: 'Moradia', population: 35, color: '#60A5FA', legendFontColor: '#fff', legendFontSize: 12 },
    { name: 'Alimentação', population: 25, color: '#34D399', legendFontColor: '#fff', legendFontSize: 12 },
    { name: 'Transporte', population: 15, color: '#F59E0B', legendFontColor: '#fff', legendFontSize: 12 },
    { name: 'Saúde', population: 10, color: '#EF4444', legendFontColor: '#fff', legendFontSize: 12 },
    { name: 'Lazer', population: 15, color: '#22D3EE', legendFontColor: '#fff', legendFontSize: 12 },
  ];

  const chartConfig = {
    backgroundGradientFrom: '#1F2937',
    backgroundGradientTo: '#1F2937',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: () => '#9CA3AF',
    barPercentage: 0.6,
    propsForBackgroundLines: {
      stroke: '#374151',
    },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: '#F59E0B',
    },
  } as const;

  const TabChip = ({ label }: { label: TabKey }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(label)}
      style={[styles.tabChip, activeTab === label && styles.tabChipActive]}
    >
      <Text style={[styles.tabChipText, activeTab === label && styles.tabChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="ATLAS" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title and period selector */}
        <View style={styles.pageHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.pageTitle}>Análise Financeira</Text>
            <View style={styles.badge}>
              <Ionicons name="trophy-outline" size={14} color="#FBBF24" />
              <Text style={styles.badgeText}>Gold</Text>
            </View>
          </View>
          <View style={styles.periodSelector}>
            <Text style={styles.periodText}>Mensal</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['Balanço','Categorias','Evolução','Orçamento'] as TabKey[]).map(t => (
            <TabChip key={t} label={t} />
          ))}
        </View>

        {/* BALANÇO */}
        {activeTab === 'Balanço' && (
          <View style={{ gap: spacing.md }}>
            {/* Cards */}
            <View style={[styles.card, { backgroundColor: '#F59E0B' }]}> 
              <View style={styles.cardIcon}><Ionicons name="logo-usd" size={22} color="#1F2937" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Receitas Totais</Text>
                <Text style={styles.cardSubtitle}>Este mês</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValue}>R$ 12.450</Text>
                <View style={styles.percentPill}><Text style={styles.percentText}>+8.5%</Text></View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: '#EF4444' }]}> 
              <View style={styles.cardIcon}><Ionicons name="trending-down" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleLight}>Despesas Totais</Text>
                <Text style={styles.cardSubtitleLight}>Este mês</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValueLight}>R$ 8.750</Text>
                <View style={[styles.percentPill, { backgroundColor: '#10B98120' }]}><Text style={[styles.percentText, { color: '#10B981' }]}>-3.2%</Text></View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: '#22C55E' }]}> 
              <View style={styles.cardIcon}><Ionicons name="trending-up" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitleLight}>Saldo Final</Text>
                <Text style={styles.cardSubtitleLight}>vs mês anterior</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValueLight}>R$ 3.700</Text>
                <Text style={[styles.percentText, { color: '#10B981', marginTop: 6 }]}>+15.3%</Text>
              </View>
            </View>

            {/* Achievements */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}> 
                <Ionicons name="trophy-outline" size={18} color="#FBBF24" />
                <Text style={styles.sectionTitle}>Conquistas Financeiras</Text>
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.statBadge}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Meses consecutivos no azul</Text></View>
                <View style={styles.statBadge}><Text style={styles.statNumber}>R$1.300</Text><Text style={styles.statLabel}>Para próxima meta</Text></View>
                <View style={styles.statBadge}><Text style={styles.statNumber}>Gold</Text><Text style={styles.statLabel}>Nível atual</Text></View>
              </View>
              <View style={styles.progressBar}> 
                <View style={[styles.progressFill, { width: '74%' }]} />
                <Text style={styles.progressText}>74%</Text>
              </View>
            </View>

            {/* Combined chart: bars + line */}
            <View style={styles.section}> 
              <Text style={styles.sectionTitle}>Balanço Mensal Detalhado</Text>
              <View style={styles.chartOverlayContainer}>
                <BarChart
                  style={{ borderRadius: borderRadius.md }}
                  data={balanceBarData}
                  width={chartWidth}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  showBarTops={false}
                  fromZero
                />
                <View style={styles.overlay}> 
                  <LineChart
                    data={balanceLineData}
                    width={chartWidth}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                  />
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} /><Text style={styles.legendText}>Receitas</Text>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles.legendText}>Despesas</Text>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>Saldo</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* CATEGORIAS */}
        {activeTab === 'Categorias' && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.section}><Text style={styles.sectionTitle}>Distribuição de Gastos</Text>
              <PieChart
                data={pieData}
                width={chartWidth}
                height={240}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"0"}
                center={[0,0]}
                hasLegend
              />
            </View>
          </View>
        )}

        {/* EVOLUÇÃO */}
        {activeTab === 'Evolução' && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.statRow}>
              <View style={styles.statCard}><Text style={styles.statCardTitle}>Tendência</Text><Text style={[styles.statCardHighlight,{ color: '#10B981' }]}>Crescimento</Text><Text style={styles.statCardText}>Suas receitas têm mostrado crescimento constante.</Text></View>
              <View style={styles.statCard}><Text style={styles.statCardTitle}>Melhor Período</Text><Text style={styles.statCardHighlight}>Junho</Text><Text style={styles.statCardText}>Saldo: R$ 4.000</Text></View>
              <View style={styles.statCard}><Text style={styles.statCardTitle}>Economia Média</Text><Text style={styles.statCardHighlight}>R$ 2.883</Text><Text style={styles.statCardText}>Por mês no período selecionado</Text></View>
            </View>
          </View>
        )}

        {/* ORÇAMENTO (placeholder) */}
        {activeTab === 'Orçamento' && (
          <View style={{ gap: spacing.md }}>
            <View style={styles.section}><Text style={styles.sectionTitle}>Planejamento de Orçamento</Text>
              <Text style={styles.sectionText}>Configure metas mensais por categoria e acompanhe o consumo em tempo real.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Footer activeScreen="Analytics" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 140,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FBBF24',
    lineHeight: 30,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
  },
  badgeText: {
    color: '#FBBF24',
    fontWeight: '600',
    fontSize: 12,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  periodText: { color: '#fff', fontSize: 12 },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#111827',
    padding: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabChipActive: {
    backgroundColor: '#F59E0B',
  },
  tabChipText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  tabChipTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardTitle: { fontSize: fontSize.lg, color: '#111827', fontWeight: '700' },
  cardSubtitle: { fontSize: fontSize.sm, color: '#1F2937' },
  cardValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  cardTitleLight: { fontSize: fontSize.lg, color: '#fff', fontWeight: '700' },
  cardSubtitleLight: { fontSize: fontSize.sm, color: '#fff' },
  cardValueLight: { fontSize: 26, fontWeight: '800', color: '#fff' },
  percentPill: { marginTop: 6, backgroundColor: '#10B98130', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  percentText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  section: {
    backgroundColor: '#111827',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionText: { color: '#9CA3AF', marginTop: 6 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: spacing.md },
  statBadge: { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, padding: spacing.md },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 6 },
  progressBar: { marginTop: spacing.sm, height: 10, backgroundColor: '#1F2937', borderRadius: 6, position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#F59E0B', borderRadius: 6 },
  progressText: { color: '#fff', position: 'absolute', right: 8, top: -22, fontSize: 12 },
  chartOverlayContainer: { marginTop: spacing.sm },
  overlay: { position: 'absolute', left: 0, top: 0 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#fff', fontSize: 12 },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: spacing.md },
  statCardTitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 6 },
  statCardHighlight: { color: '#FBBF24', fontSize: 22, fontWeight: '800' },
  statCardText: { color: '#9CA3AF' },
});