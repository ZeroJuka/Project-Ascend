export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFormData {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}