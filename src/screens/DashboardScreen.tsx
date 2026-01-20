import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Line as SvgLine, Text as SvgText, Rect, G } from 'react-native-svg'
import { Dimensions } from 'react-native'
import { useIsFocused } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useI18n } from '../contexts/I18nContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettings } from '../contexts/SettingsContext'
import { formatCurrency } from '../utils/currency'

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

interface SafeStats {
  totalSaved: number
  totalTarget: number
  progress: number
  topSafeName: string
  topSafeAmount: number
  safesCount: number
}

interface CategorySpending {
  category: string
  amount: number
  color: string
  icon: string
  percent: number
}

interface TransactionTrend {
  date: string
  income: number
  expenses: number
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  date: string
  read: boolean
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
  const [safeStats, setSafeStats] = useState<SafeStats>({
    totalSaved: 0,
    totalTarget: 0,
    progress: 0,
    topSafeName: '',
    topSafeAmount: 0,
    safesCount: 0
  })
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [trends, setTrends] = useState<TransactionTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'year'>('month')
  const { user } = useAuth()
  const isFocused = useIsFocused()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const { language } = useSettings()
  const [advancedInsights, setAdvancedInsights] = useState<{ icon: string; color: string; text: string }[]>([])
  const [overspendAlerts, setOverspendAlerts] = useState<{ category: string; pct: number; amount: number }[]>([])
  const [projectionSeries, setProjectionSeries] = useState<number[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [incomeDaily, setIncomeDaily] = useState<number[]>([])
  const [expenseDaily, setExpenseDaily] = useState<number[]>([])
  const [yearlySteps, setYearlySteps] = useState<{ label: string; delta: number; isTotal: boolean; color: string }[]>([])
  const [chartWidth, setChartWidth] = useState(320)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set())

  const safeFormatCurrency = (amount: number) => {
    try {
      return formatCurrency(amount, language)
    } catch {
      
      const prefix = language === 'pt-BR' ? 'R$ ' : '$'
      return `${prefix}${Number(amount || 0).toFixed(2)}`
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [timeFilter])

  // Refresh data when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      fetchDashboardData()
    }
  }, [isFocused])

  useEffect(() => {
    const newNotifications: Notification[] = []
    
    overspendAlerts.forEach(alert => {
        const id = `overspend-${alert.category}-${new Date().getMonth()}`
        if (!dismissedAlertIds.has(id)) {
          newNotifications.push({
            id,
            title: language === 'pt-BR' ? `Alerta de Gastos: ${alert.category}` : `Spending Alert: ${alert.category}`,
            message: language === 'pt-BR' 
              ? `Você gastou ${alert.pct}% a mais que a média em ${alert.category} este mês.`
              : `You spent ${alert.pct}% more than average on ${alert.category} this month.`,
            type: 'warning',
            date: new Date().toISOString(),
            read: false
          })
        }
    })

    advancedInsights.forEach((insight, index) => {
        if (insight.color === '#FF6B6B') {
           const id = `insight-${index}-${new Date().getDate()}`
           if (!dismissedAlertIds.has(id)) {
             newNotifications.push({
               id,
               title: language === 'pt-BR' ? 'Alerta Financeiro' : 'Financial Alert',
               message: insight.text,
               type: 'warning',
               date: new Date().toISOString(),
               read: false
             })
           }
        }
    })
    
    setNotifications(newNotifications)
  }, [overspendAlerts, advancedInsights, dismissedAlertIds])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all transactions for the user
      const [
        { data: transactions },
        { data: safes }
      ] = await Promise.all([
        supabase.from('transactions').select('*, category:categories(*)').eq('user_id', user?.id),
        supabase.from('safes').select('*').eq('user_id', user?.id)
      ])

      if (!transactions) return

      // Fetch upcoming bills (optional)
      const nowISO = new Date().toISOString().split('T')[0]
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .gte('due_date', nowISO)
        .eq('is_paid', false)

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

      // Calculate Safe Stats
      if (safes && safes.length > 0) {
        const totalSaved = safes.reduce((sum, s) => sum + (s.current_amount || 0), 0)
        const totalTarget = safes.reduce((sum, s) => sum + (s.target_amount || 0), 0)
        const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0
        const topSafe = safes.sort((a, b) => (b.current_amount || 0) - (a.current_amount || 0))[0]
        
        setSafeStats({
          totalSaved,
          totalTarget,
          progress,
          topSafeName: topSafe?.name || '',
          topSafeAmount: topSafe?.current_amount || 0,
          safesCount: safes.length
        })
      } else {
        setSafeStats({
          totalSaved: 0,
          totalTarget: 0,
          progress: 0,
          topSafeName: '',
          topSafeAmount: 0,
          safesCount: 0
        })
      }

      // Calculate category spending
      const categoryMap = new Map<string, number>()
      filteredTransactions.forEach(t => {
        if (t.type === 'expense' && t.category) {
          const key = t.category.id
          const current = categoryMap.get(key) || 0
          categoryMap.set(key, current + parseFloat(t.amount))
        }
      })

      const totalFilteredExpenses = Array.from(categoryMap.values()).reduce((s, v) => s + v, 0)
      const categoryData = Array.from(categoryMap.entries()).map(([categoryId, amount]) => {
        const category = transactions.find(t => t.category?.id === categoryId)?.category
        return {
          category: category?.name || 'Unknown',
          amount,
          color: category?.color || '#666',
          icon: category?.icon || 'help-circle',
          percent: totalFilteredExpenses > 0 ? (amount / totalFilteredExpenses) * 100 : 0,
        }
      }).sort((a, b) => b.amount - a.amount)

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

      // Advanced insights
      const ai: { icon: string; color: string; text: string }[] = []

      // 1) Category Overspend Alert (current month vs 3-month avg)
      try {
        const now = new Date()
        const start3mo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        const currentMonthExpenses = new Map<string, number>()
        const historyExpenses = new Map<string, { total: number; countMonths: number }>()

        transactions.forEach(t => {
          if (t.type !== 'expense' || !t.category) return
          const d = new Date(t.transaction_date)
          const key = t.category.name
          if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
            currentMonthExpenses.set(key, (currentMonthExpenses.get(key) || 0) + parseFloat(t.amount))
          } else if (d >= start3mo && d <= endPrevMonth) {
            const rec = historyExpenses.get(key) || { total: 0, countMonths: 0 }
            rec.total += parseFloat(t.amount)
            historyExpenses.set(key, rec)
          }
        })

        const overs = Array.from(currentMonthExpenses.entries())
          .map(([cat, curr]) => {
            const hist = historyExpenses.get(cat)
            const avg = hist ? hist.total / Math.max(1, 3) : 0
            const ratio = avg > 0 ? curr / avg : 0
            return { cat, curr, avg, ratio }
          })
          .filter(x => x.avg > 0 && x.curr > x.avg * 1.3 && x.curr > 50)
          .sort((a, b) => b.ratio - a.ratio)
          .slice(0, 2)

        const alertData: { category: string; pct: number; amount: number }[] = []
        overs.forEach(o => {
          const pct = Math.round((o.curr / o.avg - 1) * 100)
          alertData.push({ category: o.cat, pct, amount: o.curr })
        })
        setOverspendAlerts(alertData)
      } catch {}

      // 2) Subscription Identification (recurring merchants)
      try {
        const windowStart = new Date()
        windowStart.setMonth(windowStart.getMonth() - 3)
        const recent = transactions.filter(t => new Date(t.transaction_date) >= windowStart && t.type === 'expense')
        const byDesc = new Map<string, { months: Set<string>; amounts: number[] }>()
        recent.forEach(t => {
          const desc = (t.description || '').trim()
          if (!desc) return
          const monthKey = t.transaction_date.slice(0, 7)
          const entry = byDesc.get(desc) || { months: new Set<string>(), amounts: [] }
          entry.months.add(monthKey)
          entry.amounts.push(parseFloat(t.amount))
          byDesc.set(desc, entry)
        })
        const recurring = Array.from(byDesc.entries()).filter(([_, v]) => v.months.size >= 2)
        const stable = recurring.filter(([_, v]) => {
          const mean = v.amounts.reduce((s, a) => s + a, 0) / v.amounts.length
          const variance = v.amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / v.amounts.length
          const stdev = Math.sqrt(variance)
          return mean >= 10 && stdev <= mean * 0.2
        })
        const currentMonth = new Date().toISOString().slice(0, 7)
        const burden = recent
          .filter(t => (t.description || '').trim() && t.transaction_date.startsWith(currentMonth))
          .filter(t => stable.some(([desc]) => desc === (t.description || '').trim()))
          .reduce((s, t) => s + parseFloat(t.amount), 0)
        if (stable.length > 0) {
          const count = stable.length
          const text = language === 'pt-BR'
            ? `Identificadas ${count} assinaturas recorrentes. Custo mensal atual: ${safeFormatCurrency(burden)}.`
            : `Detected ${count} recurring subscriptions. Current monthly burden: ${safeFormatCurrency(burden)}.`
          ai.push({ icon: 'repeat', color: '#9B59B6', text })
        }
      } catch {}

      // 3) Cashflow Projection Risk (rest of month) and daily waves
      try {
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        const daysLeft = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        const weeksLeft = Math.max(0, Math.ceil(daysLeft / 7))

        const last28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
        const last4wExp = transactions.filter(t => new Date(t.transaction_date) >= last28 && t.type === 'expense')
        const last4wInc = transactions.filter(t => new Date(t.transaction_date) >= last28 && t.type === 'income')
        const expensesSum = last4wExp.reduce((s, t) => s + parseFloat(t.amount), 0)
        const incomeSum = last4wInc.reduce((s, t) => s + parseFloat(t.amount), 0)
        const avgWeeklyExpenses = expensesSum / 4
        const avgDailyExpenses = avgWeeklyExpenses / 7
        const avgDailyIncome = (incomeSum / 4) / 7

        // Upcoming unpaid bills this month
        const upcomingBills = (bills || []).filter(b => {
          const d = new Date(b.due_date)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !b.is_paid
        })
        const upcomingBillsTotal = upcomingBills.reduce((s, b) => s + parseFloat(b.amount || 0), 0)

        const start = stats.monthlyNet
        const series: number[] = []
        for (let d = 1; d <= daysLeft; d++) {
          const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)
          const billsDue = (bills || []).filter(b => {
            const bd = new Date(b.due_date)
            return bd.getFullYear() === date.getFullYear() && bd.getMonth() === date.getMonth() && bd.getDate() === date.getDate() && !b.is_paid
          }).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
          const prev = d === 1 ? start : series[d - 2]
          series.push(prev + avgDailyIncome - avgDailyExpenses - billsDue)
        }
        setProjectionSeries(series)
        const projection = series.length ? series[series.length - 1] : start
        const text = projection < 0
          ? (language === 'pt-BR'
              ? `Risco de fluxo de caixa negativo até o fim do mês: ${safeFormatCurrency(projection)}. Considere reduzir despesas ou adiar compras.`
              : `Projected negative cashflow by month‑end: ${safeFormatCurrency(projection)}. Consider reducing expenses or delaying purchases.`)
          : (language === 'pt-BR'
              ? `Fluxo de caixa projetado até o fim do mês: ${safeFormatCurrency(projection)}.`
              : `Projected month‑end cashflow: ${safeFormatCurrency(projection)}.`)
        ai.push({ icon: projection < 0 ? 'alert-circle' : 'calendar', color: projection < 0 ? '#FF6B6B' : '#4A90E2', text })

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const daysInMonth = endOfMonth.getDate()
        const incDaily: number[] = []
        const expDaily: number[] = []
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = new Date(now.getFullYear(), now.getMonth(), day).toISOString().split('T')[0]
          const dayTransactions = transactions.filter(t => t.transaction_date === dateStr)
          const inc = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
          const exp = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)
          if (day <= now.getDate()) {
            incDaily.push(inc)
            expDaily.push(exp)
          } else {
            const billsDueFuture = (bills || []).filter(b => {
              const bd = new Date(b.due_date)
              return bd.getFullYear() === now.getFullYear() && bd.getMonth() === now.getMonth() && bd.getDate() === day && !b.is_paid
            }).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
            incDaily.push(avgDailyIncome)
            expDaily.push(avgDailyExpenses + billsDueFuture)
          }
        }
        setIncomeDaily(incDaily)
        setExpenseDaily(expDaily)
      } catch {}

      setAdvancedInsights(ai)

      // Yearly waterfall steps (Start + months + End)
      try {
        const now = new Date()
        const year = now.getFullYear()
        const prevYear = year - 1
        const prevYearNet = transactions
          .filter(t => {
            const d = new Date(t.transaction_date)
            return d.getFullYear() === prevYear
          })
          .reduce((s, t) => s + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0)
        const monthlyNet: { m: number; v: number }[] = Array.from({ length: 12 }, (_, m) => {
          const mNet = transactions
            .filter(t => {
              const d = new Date(t.transaction_date)
              return d.getFullYear() === year && d.getMonth() === m
            })
            .reduce((s, t) => s + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0)
          return { m, v: mNet }
        })
        const monthsEN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const monthsPT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        const labels = language === 'pt-BR' ? monthsPT : monthsEN
        const stepsArr: { label: string; delta: number; isTotal: boolean; color: string }[] = []
        stepsArr.push({ label: language === 'pt-BR' ? 'Começo' : 'Start', delta: prevYearNet, isTotal: true, color: '#4A90E2' })
        monthlyNet
          .filter(x => x.v !== 0)
          .forEach(({ m, v }) => {
            stepsArr.push({ label: labels[m], delta: v, isTotal: false, color: v >= 0 ? '#50C878' : '#FF6B6B' })
          })
        const yearEnd = prevYearNet + monthlyNet.reduce((s, x) => s + x.v, 0)
        stepsArr.push({ label: language === 'pt-BR' ? 'Fim' : 'End', delta: yearEnd, isTotal: true, color: '#4A90E2' })
        setYearlySteps(stepsArr)
      } catch {}
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
      <Text style={styles.statAmount}>{safeFormatCurrency(amount)}</Text>
    </LinearGradient>
  )

  const CategoryItem = ({ item }: { item: CategorySpending }) => (
    <View style={styles.categoryItem}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}> 
        <Ionicons name={item.icon as any} size={16} color={item.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.category}</Text>
        <Text style={styles.categoryAmount}>{safeFormatCurrency(item.amount)} • {Math.round(item.percent)}%</Text>
      </View>
      <View style={styles.categoryBar}>
        <View style={[styles.categoryBarFill, { backgroundColor: item.color, width: `${Math.min(100, Math.round(item.percent))}%` }]} />
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 + insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchDashboardData(); setRefreshing(false) }} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('dashboard.header.title')}</Text>
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
                {filter === 'week' ? t('dashboard.filter.week') : filter === 'month' ? t('dashboard.filter.month') : t('dashboard.filter.year')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewSection}>
        <Text style={styles.sectionTitle}>{t('dashboard.overview.title')}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={t('dashboard.stat.total_income')}
            amount={stats.totalIncome}
            color="#50C878"
            icon="trending-up"
          />
          <StatCard
            title={t('dashboard.stat.total_expenses')}
            amount={stats.totalExpenses}
            color="#FF6B6B"
            icon="trending-down"
          />
          <StatCard
            title={t('dashboard.stat.total_balance')}
            amount={stats.netBalance}
            color="#4A90E2"
            icon="wallet"
          />
        </View>
      </View>

      {/* Time-based Stats */}
      <View style={styles.timeStatsSection}>
        <Text style={styles.sectionTitle}>
          {timeFilter === 'week' ? t('dashboard.time.title.week') : timeFilter === 'month' ? t('dashboard.time.title.month') : t('dashboard.time.title.year')}
        </Text>
        <View style={styles.timeStatsContainer}>
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>{t('dashboard.time.income')}</Text>
            <Text style={[styles.timeStatAmount, { color: '#50C878' }]}>
              {safeFormatCurrency(
                timeFilter === 'week' ? stats.weeklyIncome :
                timeFilter === 'month' ? stats.monthlyIncome :
                stats.totalIncome
              )}
            </Text>
          </View>
          <View style={styles.timeStatDivider} />
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>{t('dashboard.time.expenses')}</Text>
            <Text style={[styles.timeStatAmount, { color: '#FF6B6B' }]}>
              {safeFormatCurrency(
                timeFilter === 'week' ? stats.weeklyExpenses :
                timeFilter === 'month' ? stats.monthlyExpenses :
                stats.totalExpenses
              )}
            </Text>
          </View>
          <View style={styles.timeStatDivider} />
          <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>{t('dashboard.time.net')}</Text>
            <Text style={[styles.timeStatAmount, { 
              color: (
                timeFilter === 'week' ? stats.weeklyNet :
                timeFilter === 'month' ? stats.monthlyNet :
                stats.netBalance
              ) >= 0 ? '#50C878' : '#FF6B6B'
            }]}>
              {safeFormatCurrency(
                (
                  timeFilter === 'week' ? stats.weeklyNet :
                  timeFilter === 'month' ? stats.monthlyNet :
                  stats.netBalance
                )
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* Safes Overview */}
      {safeStats.safesCount > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.safes.title')}</Text>
          <View style={styles.safesOverviewCard}>
            <View style={styles.safesHeader}>
              <View style={styles.safesIconContainer}>
                <Ionicons name="lock-closed" size={20} color="#F39C12" />
              </View>
              <View>
                <Text style={styles.safesTotalLabel}>{t('dashboard.safes.total_saved')}</Text>
                <Text style={styles.safesTotalAmount}>{safeFormatCurrency(safeStats.totalSaved)}</Text>
              </View>
            </View>
            
            {safeStats.totalTarget > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>{t('dashboard.safes.total_goal_progress')}</Text>
                  <Text style={styles.progressPercent}>{Math.round(safeStats.progress)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, safeStats.progress)}%` }]} />
                </View>
                <Text style={styles.targetLabel}>
                  {t('dashboard.safes.total_target')}: {safeFormatCurrency(safeStats.totalTarget)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />
            
            <View style={styles.topSafeRow}>
              <Text style={styles.topSafeLabel}>{t('dashboard.safes.top_safe')}:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.topSafeName}>{safeStats.topSafeName}</Text>
                <Text style={styles.topSafeAmount}> ({safeFormatCurrency(safeStats.topSafeAmount)})</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Category Spending */}
      <View style={styles.categorySection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>{t('dashboard.category.title')}</Text>
          {!!categorySpending.length && (
            <TouchableOpacity onPress={() => setShowAllCategories(prev => !prev)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F0F0F0' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>
                {showAllCategories ? t('dashboard.category.collapse') : t('dashboard.category.see_all')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {categorySpending.length > 0 ? (
          <View style={styles.categoryContainer}>
            {!showAllCategories ? (
              categorySpending.slice(0, 5).map((item, index) => (
                <CategoryItem key={index} item={item} />
              ))
            ) : (
              <ScrollView style={{ maxHeight: 280 }}>
                {categorySpending.map((item, index) => (
                  <CategoryItem key={index} item={item} />
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{t('dashboard.empty.spending')}</Text>
          </View>
        )}
      </View>

      {/* Quick Insights */}
      <View style={styles.insightsSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>{t('dashboard.insights.title')}</Text>
          <TouchableOpacity onPress={() => setShowAlerts(!showAlerts)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F0F0F0' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{t('dashboard.alerts.toggle')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.insightsContainer}>
          <View style={styles.insightItem}>
            <Ionicons name="trending-up" size={24} color="#50C878" />
            <Text style={styles.insightText}>
              {stats.monthlyIncome > stats.monthlyExpenses 
                ? t('dashboard.insights.saving_positive') 
                : t('dashboard.insights.saving_negative')
              }
            </Text>
          </View>
          <View style={styles.insightItem}>
            <Ionicons name="wallet" size={24} color="#4A90E2" />
            <Text style={styles.insightText}>
              {stats.netBalance >= 0 
                ? t('dashboard.insights.balance_positive') 
                : t('dashboard.insights.balance_negative')
              }
            </Text>
          </View>
          {advancedInsights.map((ins, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Ionicons name={ins.icon as any} size={24} color={ins.color} />
              <Text style={styles.insightText}>{ins.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Alerts: Category Overspending */}
      {showAlerts && overspendAlerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.alerts.title')}</Text>
          <View style={styles.alertsContainer}>
            {overspendAlerts.map((a, i) => (
              <View key={i} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={20} color="#FF6B6B" />
                  <Text style={[styles.alertTitle, { color: '#FF6B6B' }]}>{a.category}</Text>
                </View>
                <Text style={styles.alertBody}>
                  {t('dashboard.alerts.above_average')}: {a.pct}% • {t('dashboard.alerts.this_month')}: {safeFormatCurrency(a.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cashflow Projection Chart */}
      {yearlySteps.length > 0 && (
        <View style={styles.projectionSection}>
          <Text style={styles.sectionTitle}>{t('dashboard.projection.title')}</Text>
          <View style={styles.projectionCard} onLayout={(e) => setChartWidth(Math.max(240, Math.floor(e.nativeEvent.layout.width)))}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(() => {
              const pad = 24
              const gap = 8
              const barW = 32
              const steps = yearlySteps
              const neededWidth = pad * 2 + steps.length * barW + (steps.length - 1) * gap
              const w = Math.max(chartWidth, neededWidth)
              const h = 180
              const cumul: number[] = []
              steps.forEach((s, i) => {
                if (i === 0) cumul.push(s.delta)
                else if (s.isTotal) cumul.push(cumul[i - 1])
                else cumul.push((cumul[i - 1] || 0) + s.delta)
              })
              const allVals = [0, ...cumul]
              const minVal = Math.min(...allVals)
              const maxVal = Math.max(...allVals)
              const range = Math.max(1, maxVal - minVal)
              return (
                <Svg width={w} height={h}>
                  <SvgLine x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#E0E0E0" strokeWidth={1} />
                  <SvgLine x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#E0E0E0" strokeWidth={1} />
                  {steps.map((s, i) => {
                    const x = pad + i * (barW + gap)
                    if (s.isTotal) {
                      const y = pad + (1 - (s.delta - minVal) / range) * (h - 2 * pad)
                      const height = Math.abs(((s.delta - minVal) / range) * (h - 2 * pad))
                      return (
                        <G key={`wf-${i}`}>
                          <Rect x={x} y={y} width={barW} height={height} fill={s.color} />
                          <SvgText x={x} y={h - pad + 12} fill="#666" fontSize={9}>{s.label}</SvgText>
                          <SvgText x={x} y={y - 6} fill="#666" fontSize={10}>{String(parseFloat(s.delta.toFixed(2))).replaceAll(".",",")}</SvgText>
                        </G>
                      )
                    } else {
                      const prev = cumul[i - 1] || 0
                      const curr = cumul[i] || 0
                      const top = Math.max(prev, curr)
                      const bottom = Math.min(prev, curr)
                      const yTop = pad + (1 - (top - minVal) / range) * (h - 2 * pad)
                      const yBottom = pad + (1 - (bottom - minVal) / range) * (h - 2 * pad)
                      const height = Math.max(2, yBottom - yTop)
                      return (
                        <G key={`wf-${i}`}>
                          <Rect x={x} y={yTop} width={barW} height={height} fill={s.color} />
                          <SvgText x={x} y={h - pad + 12} fill="#666" fontSize={9}>{s.label}</SvgText>
                          <SvgText x={x} y={yTop - 6} fill="#666" fontSize={10}>{String(parseFloat(s.delta.toFixed(2))).replaceAll(".",",")}</SvgText>
                        </G>
                      )
                    }
                  })}
                </Svg>
              )
            })()}
            </ScrollView>
            <View style={styles.projectionFooter}>
              <Ionicons name="calendar" size={18} color="#4A90E2" />
              <Text style={styles.projectionText}>
                {t('dashboard.projection.footer')}
              </Text>
            </View>
          </View>
        </View>
      )}
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
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  safesOverviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  safesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safesIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  safesTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  safesTotalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  progressSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F39C12',
    borderRadius: 4,
  },
  targetLabel: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
  },
  topSafeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  topSafeLabel: {
    fontSize: 12,
    color: '#666',
  },
  topSafeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  topSafeAmount: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
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
  alertsSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  alertsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    paddingLeft: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertBody: {
    fontSize: 12,
    color: '#666',
  },
  projectionSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  projectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  projectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  projectionText: {
    fontSize: 12,
    color: '#333',
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
