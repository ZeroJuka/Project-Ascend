import { supabase } from './supabase';
import { Transaction, TransactionFormData } from '../types/transaction';

export const transactionService = {
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar transações:', error);
      throw error;
    }

    return data as Transaction[];
  },

  async addTransaction(transaction: TransactionFormData): Promise<Transaction> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    //console.log('=================ADD TRANSACTION=================\n'
    //           +'Transaction data being Added:'+ JSON.stringify(transaction)
    //           +'\n\nUser data being Added:'+ JSON.stringify(userData)
    //           +'\n=================================================')

    if (userError || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    const userId = userData.user.id;
    
    if (!userId) {
      throw new Error('ID do usuário não disponível');
    }
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userId,
          ...transaction,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar transação:', error);
      throw error;
    }

    return data as Transaction;
  },

  async updateTransaction(id: string, transaction: TransactionFormData): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    }

    return data as Transaction;
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir transação:', error);
      throw error;
    }
  },
};