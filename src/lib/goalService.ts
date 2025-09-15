import { supabase } from './supabase';
import { Goal, GoalFormData } from '../types/goal';

export const goalService = {
  async getGoals(): Promise<Goal[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    const userId = userData.user.id;
    
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }

    return data as Goal[];
  },

  async getGoalById(id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar meta:', error);
      return null;
    }

    return data as Goal;
  },

  async addGoal(goal: GoalFormData): Promise<Goal> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    const userId = userData.user.id;
    
    const { data, error } = await supabase
      .from('goals')
      .insert([
        {
          user_id: userId,
          current_amount: 0,
          status: 'active',
          ...goal,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar meta:', error);
      throw error;
    }

    return data as Goal;
  },

  async updateGoal(id: string, goal: Partial<GoalFormData>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update(goal)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }

    return data as Goal;
  },

  async updateGoalStatus(id: string, status: 'active' | 'completed' | 'failed'): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status da meta:', error);
      throw error;
    }

    return data as Goal;
  },

  async updateGoalAmount(id: string, current_amount: number): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update({ current_amount })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar valor atual da meta:', error);
      throw error;
    }

    return data as Goal;
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir meta:', error);
      throw error;
    }
  },
};