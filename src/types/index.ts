import { Session, User } from '@supabase/supabase-js';

// Tipos para autenticação
export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

// Tipos para navegação
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  // Adicione outras telas conforme necessário
};