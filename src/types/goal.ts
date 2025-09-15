export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  goal_type: 'minimum' | 'maximum';
  recurrent: boolean;
  start_date: string;
  end_date: string;
  categories: string[];
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface GoalFormData {
  title: string;
  description?: string;
  target_amount: number;
  goal_type: 'minimum' | 'maximum';
  recurrent: boolean;
  start_date: string;
  end_date: string;
  categories: string[];
}