import { supabase } from './supabase';
import { Category, CategoryFormData } from '../types/category';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    const userId = userData.user.id;
    
    // Buscar categorias padrão e personalizadas
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }

    return data as Category[];
  },

  // Buscar uma categoria específica por id ou category_key
  async getCategoryByIdOrKey(idOrKey: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`id.eq.${idOrKey},category_key.eq.${idOrKey}`)
      .single();

    if (error) {
      console.error('Erro ao buscar categoria:', error);
      return null;
    }

    return data as Category;
  },

  async addCategory(category: CategoryFormData): Promise<Category> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Usuário não autenticado');
    }
    
    const userId = userData.user.id;
    
    // Inserir a categoria com o ID do usuário
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          ...category,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar categoria:', error);
      throw error;
    }

    return data as Category;
  },

  async updateCategory(id: string, category: CategoryFormData): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }

    return data as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir categoria:', error);
      throw error;
    }
  },
};