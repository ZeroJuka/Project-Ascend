import { useCallback, useState } from 'react';
import { transactionService } from '../lib/transactionService';
import type { Transaction } from '../types/transaction';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionService.getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { transactions, loading, error, refresh };
}