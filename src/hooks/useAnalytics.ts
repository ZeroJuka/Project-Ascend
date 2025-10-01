import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Goal } from '../types/goal';
import { goalService } from '../lib/goalService';
import { Transaction } from '../types/transaction';

type DistItem = { name: string; value: number };

type Series = {
  labels: string[];
  income: number[];
  expense: number[];
  balance: number[];
};

type KPIs = {
  incomeThisMonth: number;
  expenseThisMonth: number;
  balanceThisMonth: number;
  changeIncomePct: number; // vs mês anterior
  changeExpensePct: number;
  changeBalancePct: number;
};

type Achievements = {
  positiveMonthsStreak: number;
  nextGoalRemaining: number | null;
  currentTier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  progressToNextTierPct: number; // 0–100
};

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getLastMonths(count: number): Date[] {
  const now = new Date();
  const months: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
  }
  return months;
}

export function useAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Fetch inicial e assinatura realtime
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error('Usuário não autenticado');
        const userId = userData.user.id;

        // Buscar transações do usuário
        const { data: tx, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: true });
        if (txError) throw txError;

        // Metas do usuário
        const gs = await goalService.getGoals();

        if (!mounted) return;
        setTransactions((tx || []) as Transaction[]);
        setGoals(gs);

        // Assinatura realtime para alterações nas transações do usuário
        const channel = supabase
          .channel('transactions-analytics')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
            async () => {
              const { data: txLatest } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: true });
              if (mounted) setTransactions((txLatest || []) as Transaction[]);
            }
          )
          .subscribe();

        unsubscribe = () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        if (mounted) setError((err as Error).message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Derivados
  const months = useMemo(() => getLastMonths(6), []);
  const series: Series = useMemo(() => {
    const incomes: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    const balances: Record<string, number> = {};

    for (const m of months) {
      const key = monthKey(m);
      incomes[key] = 0;
      expenses[key] = 0;
      balances[key] = 0;
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = monthKey(new Date(d.getFullYear(), d.getMonth(), 1));
      if (!(key in incomes)) return; // ignora fora da janela
      if (t.type === 'income') incomes[key] += Number(t.amount);
      else expenses[key] += Number(t.amount);
      balances[key] = (incomes[key] || 0) - (expenses[key] || 0);
    });

    const labels = months.map((m) => formatMonthLabel(m));
    const income = months.map((m) => incomes[monthKey(m)] || 0);
    const expense = months.map((m) => expenses[monthKey(m)] || 0);
    const balance = months.map((m) => balances[monthKey(m)] || 0);
    return { labels, income, expense, balance };
  }, [transactions, months]);

  const kpis: KPIs = useMemo(() => {
    const currKey = monthKey(months[months.length - 1]);
    const prevKey = monthKey(months[months.length - 2]);
    const incomeCurr = series.income[series.labels.length - 1] || 0;
    const expenseCurr = series.expense[series.labels.length - 1] || 0;
    const balanceCurr = series.balance[series.labels.length - 1] || 0;

    const incomePrev = series.income[series.labels.length - 2] || 0;
    const expensePrev = series.expense[series.labels.length - 2] || 0;
    const balancePrev = series.balance[series.labels.length - 2] || 0;

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };

    return {
      incomeThisMonth: incomeCurr,
      expenseThisMonth: expenseCurr,
      balanceThisMonth: balanceCurr,
      changeIncomePct: pct(incomeCurr, incomePrev),
      changeExpensePct: pct(expenseCurr, expensePrev),
      changeBalancePct: pct(balanceCurr, balancePrev),
    };
  }, [series, months]);

  const categoriesDistribution: DistItem[] = useMemo(() => {
    const map = new Map<string, number>();
    const currentMonth = months[months.length - 1];
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d >= start && d < end && t.type === 'expense') {
        const key = t.category || 'Outros';
        map.set(key, (map.get(key) || 0) + Number(t.amount));
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, months]);

  const achievements: Achievements = useMemo(() => {
    // streak de meses com saldo positivo, contando de trás para frente
    let streak = 0;
    for (let i = series.balance.length - 1; i >= 0; i--) {
      if ((series.balance[i] || 0) >= 0) streak++;
      else break;
    }

    // meta mais próxima (mínima) restante
    const activeGoals = goals.filter((g) => g.status === 'active');
    let nextGoalRemaining: number | null = null;
    for (const g of activeGoals) {
      const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
      if (remaining > 0 && (nextGoalRemaining === null || remaining < nextGoalRemaining)) {
        nextGoalRemaining = remaining;
      }
    }

    // tier baseado em streak
    let currentTier: Achievements['currentTier'] = 'Bronze';
    if (streak >= 6) currentTier = 'Diamond';
    else if (streak >= 4) currentTier = 'Gold';
    else if (streak >= 2) currentTier = 'Silver';
    const progressToNextTierPct = Math.min(100, Math.round((streak / 6) * 100));

    return { positiveMonthsStreak: streak, nextGoalRemaining, currentTier, progressToNextTierPct };
  }, [series, goals]);

  return {
    loading,
    error,
    series,
    kpis,
    categoriesDistribution,
    achievements,
  };
}