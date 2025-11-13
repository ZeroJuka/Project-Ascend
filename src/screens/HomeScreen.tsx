import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()
  const navigation = useNavigation()
  const isFocused = useIsFocused()

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
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      // Fetch all transactions for the user
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
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
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + parseFloat(t.amount)
        return acc
      }, {})
    
    const topCategory = Object.entries(expensesByCategory)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]
    
    if (topCategory) {
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
      title: 'Add Transaction',
      icon: 'add-circle',
      color: '#4A90E2',
      onPress: () => navigation.navigate('Transactions' as never),
    },
    {
      title: 'View Goals',
      icon: 'trophy',
      color: '#50C878',
      onPress: () => navigation.navigate('Goals' as never),
    },
    {
      title: 'Analytics',
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.userName}>{user?.email?.split('@')[0]}</Text>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={['#4A90E2', '#357ABD']}
        style={styles.balanceCard}
      >
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          ${financialData.totalBalance.toLocaleString()}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Ionicons name="trending-up" size={16} color="#50C878" />
            <Text style={styles.balanceItemText}>
              ${financialData.monthlyIncome.toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="trending-down" size={16} color="#FF6B6B" />
            <Text style={styles.balanceItemText}>
              ${financialData.monthlyExpenses.toLocaleString()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
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
          <Text style={styles.sectionTitle}>Quick Insights</Text>
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
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Income</Text>
            <Text style={[styles.overviewValue, { color: '#50C878' }]}>
              ${financialData.monthlyIncome.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Expenses</Text>
            <Text style={[styles.overviewValue, { color: '#FF6B6B' }]}>
              ${financialData.monthlyExpenses.toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>Net</Text>
            <Text style={[styles.overviewValue, { 
              color: financialData.monthlyIncome - financialData.monthlyExpenses >= 0 ? '#50C878' : '#FF6B6B' 
            }]}>
              ${(financialData.monthlyIncome - financialData.monthlyExpenses).toLocaleString()}
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
    paddingTop: 16,
    paddingBottom: 24,
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
})