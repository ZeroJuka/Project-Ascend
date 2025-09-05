export interface Category {
  id: string;
  user_id: string | null;
  category_key?: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}