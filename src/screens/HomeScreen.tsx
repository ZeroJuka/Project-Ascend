import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useSettings } from '../contexts/SettingsContext'
import { formatCurrency } from '../utils/currency'

export default function HomeScreen() {
  const [financialData, setFinancialData] = useState({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  })
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()
  const { t } = useI18n()
  const { displayName, avatarUri, language } = useSettings()
  const navigation = useNavigation()
  const isFocused = useIsFocused()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    fetchFinancialData()
  }, [])

  // Refresh data when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchFinancialData()
    }
  }, [isFocused])

  const fetchFinancialData = async () => {
    try {
      if (!refreshing) setLoading(true)
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      // Fetch all transactions for the user
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user?.id)

      // Calculate totals
      const totalIncome = transactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0

      const totalExpenses = transactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0

      // Calculate monthly totals
      const monthlyTransactions = transactions?.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        return (
          transactionDate.getMonth() + 1 === currentMonth &&
          transactionDate.getFullYear() === currentYear
        )
      })

      const monthlyIncome = monthlyTransactions
        ?.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0

      const monthlyExpenses = monthlyTransactions
        ?.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0

      // Generate insights
      const insights = generateInsights(transactions || [], monthlyIncome, monthlyExpenses)

      setFinancialData({
        totalBalance: totalIncome - totalExpenses,
        totalIncome,
        totalExpenses,
        monthlyIncome,
        monthlyExpenses,
      })
      setInsights(insights)
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateInsights = (transactions: any[], monthlyIncome: number, monthlyExpenses: number) => {
    const insights = []
    
    // Spending vs Income insight
    if (monthlyExpenses > monthlyIncome * 0.8) {
      insights.push({
        id: 'spending-high',
        title: 'High Spending Alert',
        description: `You've spent ${((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of your income this month`,
        icon: 'warning',
        color: '#FF6B6B',
        action: 'Review spending'
      })
    }

    // Savings opportunity
    if (monthlyIncome > monthlyExpenses) {
      const savings = monthlyIncome - monthlyExpenses
      insights.push({
        id: 'savings-opportunity',
        title: 'Savings Opportunity',
        description: `You could save $${savings.toFixed(0)} this month`,
        icon: 'trending-up',
        color: '#50C878',
        action: 'Set savings goal'
      })
    }

    // Top spending category
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense' && t.category)
      .reduce((acc: {[key: string]: number}, t) => {
        const catName = t.category?.name || 'Uncategorized'
        acc[catName] = (acc[catName] || 0) + parseFloat(t.amount)
        return acc
      }, {})
    
    const topCategory = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    
    if (topCategory && (topCategory[1] as number) > 0) {
      insights.push({
        id: 'top-category',
        title: 'Top Spending Category',
        description: `${topCategory[0]}: $${(topCategory[1] as number).toFixed(0)}`,
        icon: 'pricetag',
        color: '#45B7D1',
        action: 'View details'
      })
    }

    return insights.slice(0, 3) // Show max 3 insights
  }

  const quickActions = [
    {
      title: t('home.action.add_transaction'),
      icon: 'add-circle',
      color: '#4A90E2',
      onPress: () => navigation.navigate('Transactions' as never),
    },
    {
      title: t('home.action.shopping_list'),
      icon: 'list',
      color: '#9B59B6',
      onPress: () => (navigation.navigate as any)('Chat', { openShoppingList: true }),
    },
    {
      title: t('home.action.view_goals'),
      icon: 'trophy',
      color: '#50C878',
      onPress: () => navigation.navigate('Goals' as never),
    },
    {
      title: t('home.action.analytics'),
      icon: 'stats-chart',
      color: '#FF6B6B',
      onPress: () => navigation.navigate('Dashboard' as never),
    },
  ]

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFinancialData() }} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.navigate('User' as never)}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
            <Text style={styles.userName}>{displayName || user?.email?.split('@')[0]}</Text>
          </View>
        </View>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>{t('home.total_balance')}</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(financialData.totalBalance, language)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Ionicons name="trending-up" size={16} color="#50C878" />
            <Text style={styles.balanceItemText}>
              {formatCurrency(financialData.monthlyIncome, language)}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="trending-down" size={16} color="#FF6B6B" />
            <Text style={styles.balanceItemText}>
              {formatCurrency(financialData.monthlyExpenses, language)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.quick_actions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={action.color} />
              </View>
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.quick_insights')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
            {insights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={[styles.insightCard, { borderLeftColor: insight.color }]}
                onPress={() => {
                  if (insight.action === 'Review spending') {
                    navigation.navigate('Transactions' as never)
                  } else if (insight.action === 'Set savings goal') {
                    navigation.navigate('Goals' as never)
                  } else if (insight.action === 'View details') {
                    navigation.navigate('Dashboard' as never)
                  }
                }}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name={insight.icon as any} size={20} color={insight.color} />
                  <Text style={[styles.insightTitle, { color: insight.color }]}>
                    {insight.title}
                  </Text>
                </View>
                <Text style={styles.insightDescription} numberOfLines={2}>
                  {insight.description}
                </Text>
                <Text style={[styles.insightAction, { color: insight.color }]}>
                  {insight.action}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Monthly Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.this_month')}</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>{t('home.income')}</Text>
            <Text style={[styles.overviewValue, { color: '#50C878' }]}>
              ${financialData.monthlyIncome.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>{t('home.expenses')}</Text>
            <Text style={[styles.overviewValue, { color: '#FF6B6B' }]}>
              ${financialData.monthlyExpenses.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>{t('home.net')}</Text>
            <Text style={[styles.overviewValue, { 
              color: financialData.monthlyIncome - financialData.monthlyExpenses >= 0 ? '#50C878' : '#FF6B6B' 
            }]}>
              {formatCurrency(financialData.monthlyIncome - financialData.monthlyExpenses, language)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextCol: {
    flexDirection: 'column',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItemText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  insightsScroll: {
    paddingHorizontal: 24,
  },
  insightCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  insightAction: {
    fontSize: 12,
    fontWeight: '600',
  },
})
