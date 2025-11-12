import React, { useState, useEffect } from 'react'
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
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface FinancialStats {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyNet: number
  weeklyIncome: number
  weeklyExpenses: number
  weeklyNet: number
}

interface CategorySpending {
  category: string
  amount: number
  color: string
  icon: string
}

interface TransactionTrend {
  date: string
  income: number
  expenses: number
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<FinancialStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyNet: 0,
    weeklyIncome: 0,
    weeklyExpenses: 0,
    weeklyNet: 0,
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [trends, setTrends] = useState<TransactionTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month')
  const { user } = useAuth()

  useEffect(() => {
    fetchDashboardData()
  }, [timeFilter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all transactions for the user
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('user_id', user?.id)

      if (!transactions) return

      // Calculate statistics based on time filter
      const now = new Date()
      const startDate = getStartDate(timeFilter)
      
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        return transactionDate >= startDate
      })

      // Calculate financial stats
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

      const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        return (
          transactionDate.getMonth() === now.getMonth() &&
          transactionDate.getFullYear() === now.getFullYear()
        )
      })

      const weeklyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date)
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return transactionDate >= weekAgo
      })

      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

      const weeklyIncome = weeklyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const weeklyExpenses = weeklyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

      setStats({
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        monthlyIncome,
        monthlyExpenses,
        monthlyNet: monthlyIncome - monthlyExpenses,
        weeklyIncome,
        weeklyExpenses,
        weeklyNet: weeklyIncome - weeklyExpenses,
      })

      // Calculate category spending
      const categoryMap = new Map<string, number>()
      filteredTransactions.forEach(t => {
        if (t.type === 'expense' && t.category) {
          const key = t.category.id
          const current = categoryMap.get(key) || 0
          categoryMap.set(key, current + parseFloat(t.amount))
        }
      })

      const categoryData = Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
        const category = transactions.find(t => t.category?.id === categoryId)?.category
        return {
          category: category?.name || 'Unknown',
          amount,
          color: category?.color || '#666',
          icon: category?.icon || 'help-circle',
        }
      }).sort((a, b) => b.amount - a.amount).slice(0, 6)

      setCategorySpending(categoryData)

      // Calculate transaction trends for the last 30 days
      const trendsData: TransactionTrend[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayTransactions = transactions.filter(t => t.transaction_date === dateStr)
        const income = dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        const expenses = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        
        trendsData.push({
          date: dateStr,
          income,
          expenses,
        })
      }
      
      setTrends(trendsData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStartDate = (filter: string): Date => {
    const now = new Date()
    switch (filter) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  const StatCard = ({ title, amount, color, icon }: any) => (
    <LinearGradient
      colors={[color, color + 'CC']}
      style={styles.statCard}
    >
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color="#fff" />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statAmount}>${amount.toLocaleString()}</Text>
    </LinearGradient>
  )

  const CategoryItem = ({ item }: { item: CategorySpending }) => (
    <View style={styles.categoryItem}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={16} color={item.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.category}</Text>
        <Text style={styles.categoryAmount}>${item.amount.toFixed(2)}</Text>
      </View>
      <View style={styles.categoryBar}>
        <View style={[styles.categoryBarFill, { backgroundColor: item.color, width: '60%' }]} />
      </View>
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Dashboard</Text>
        <View style={styles.filterContainer}>
          {['week', 'month', 'year'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                timeFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setTimeFilter(filter as any)}
            >
              <Text style={[
                styles.filterText,
                timeFilter === filter && styles.filterTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Balance"
            amount={stats.netBalance}
            color="#4A90E2"
            icon="wallet"
          />
          <StatCard
            title="Total Income"
            amount={stats.totalIncome}
            color="#50C878"
            icon="trending-up"
          />
          <StatCard
            title="Total Expenses"
            amount={stats.totalExpenses}
            color="#FF6B6B"
            icon="trending-down"
          />
        </View>
      </View>

      {/* Time-based Stats */}
      <View style={styles.timeStatsSection}>
        <Text style={styles.sectionTitle}>
          {timeFilter === 'week' ? 'This Week' : timeFilter === 'month' ? 'This Month' : 'This Year'}
        </Text>
        <View style={styles.timeStatsContainer}>
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>Income</Text>
            <Text style={[styles.timeStatAmount, { color: '#50C878' }]}>
              ${
                timeFilter === 'week' ? stats.weeklyIncome.toLocaleString() :
                timeFilter === 'month' ? stats.monthlyIncome.toLocaleString() :
                stats.totalIncome.toLocaleString()
              }
            </Text>
          </View>
          <View style={styles.timeStatDivider} />
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>Expenses</Text>
            <Text style={[styles.timeStatAmount, { color: '#FF6B6B' }]}>
              ${
                timeFilter === 'week' ? stats.weeklyExpenses.toLocaleString() :
                timeFilter === 'month' ? stats.monthlyExpenses.toLocaleString() :
                stats.totalExpenses.toLocaleString()
              }
            </Text>
          </View>
          <View style={styles.timeStatDivider} />
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>Net</Text>
            <Text style={[styles.timeStatAmount, { 
              color: (
                timeFilter === 'week' ? stats.weeklyNet :
                timeFilter === 'month' ? stats.monthlyNet :
                stats.netBalance
              ) >= 0 ? '#50C878' : '#FF6B6B'
            }]}>
              ${
                (
                  timeFilter === 'week' ? stats.weeklyNet :
                  timeFilter === 'month' ? stats.monthlyNet :
                  stats.netBalance
                ).toLocaleString()
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Category Spending */}
      <View style={styles.categorySection}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {categorySpending.length > 0 ? (
          <View style={styles.categoryContainer}>
            {categorySpending.map((item, index) => (
              <CategoryItem key={index} item={item} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No spending data available</Text>
          </View>
        )}
      </View>

      {/* Quick Insights */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Quick Insights</Text>
        <View style={styles.insightsContainer}>
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={24} color="#50C878" />
            <Text style={styles.insightText}>
              {stats.monthlyIncome > stats.monthlyExpenses 
                ? "You're saving money this month!" 
                : "Consider reducing expenses this month"
              }
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="wallet" size={24} color="#4A90E2" />
            <Text style={styles.insightText}>
              {stats.netBalance >= 0 
                ? "Your overall balance is positive" 
                : "Focus on increasing income or reducing expenses"
              }
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  overviewSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    opacity: 0.9,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  timeStatsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  timeStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeStat: {
    flex: 1,
    alignItems: 'center',
  },
  timeStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  timeStatAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  categorySection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  categoryContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  categoryAmount: {
    fontSize: 12,
    color: '#666',
  },
  categoryBar: {
    width: 60,
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  insightsSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  insightsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    lineHeight: 20,
  },
})