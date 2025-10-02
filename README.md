# 🚀 ASCEND - Gestão Financeira Inteligente

<div align="center">
  <img src="./assets/icon.png" alt="ASCEND Logo" width="120" height="120">
  
  **Transforme sua vida financeira com clareza e inteligência artificial**
  
  [![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-54.0.7-black.svg)](https://expo.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-2.54.0-green.svg)](https://supabase.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
</div>

## 📱 Sobre o Projeto

**ASCEND** é um aplicativo mobile de gestão financeira pessoal que revoluciona a forma como você controla suas finanças. Focado em **clareza** e **objetividade**, o app utiliza inteligência artificial para automatizar processos e fornecer insights valiosos sobre seus gastos.

### 🎯 Missão
Ajudar usuários a organizarem suas finanças e identificarem rapidamente pontos problemáticos em seu orçamento, capacitando-os a tomar decisões financeiras informadas.

### ✨ Diferenciais
- **🤖 IA Integrada**: Categorização automática de despesas com Google Gemini
- **📊 Dashboards Visuais**: Interface limpa e intuitiva para análise rápida
- **🎯 Metas Inteligentes**: Sistema de acompanhamento de objetivos financeiros
- **💬 Assistente Virtual ATLAS**: Controle por voz e chat inteligente
- **📈 Análises Preditivas**: Insights sobre padrões e tendências de gastos

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React Native** - Framework multiplataforma
- **Expo** - Plataforma de desenvolvimento
- **TypeScript** - Tipagem estática
- **React Navigation** - Navegação entre telas
- **React Native Elements** - Componentes UI

### Backend & Serviços
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Google Gemini AI** - Inteligência artificial
- **Expo Speech** - Síntese de voz
- **Expo AV** - Processamento de áudio

### Visualização de Dados
- **React Native Chart Kit** - Gráficos e relatórios
- **React Native SVG** - Gráficos vetoriais
- **Expo Linear Gradient** - Gradientes visuais

## 🚀 Funcionalidades Principais

### 💰 Gestão Financeira
- ✅ Registro rápido de transações
- ✅ Categorização automática com IA
- ✅ Controle de receitas e despesas
- ✅ Múltiplas categorias personalizáveis

### 📊 Análises e Relatórios
- ✅ Dashboard principal com visão geral
- ✅ Gráficos interativos (pizza, barras, linhas)
- ✅ Comparação entre períodos
- ✅ Alertas de orçamento

### 🎯 Metas e Objetivos
- ✅ Criação de metas financeiras
- ✅ Acompanhamento visual de progresso
- ✅ Notificações e lembretes
- ✅ Análise de viabilidade

### 🤖 Assistente IA (ATLAS)
- ✅ Chat inteligente para suporte
- ✅ Comandos por voz
- ✅ Análises preditivas
- ✅ Sugestões personalizadas

### 🔐 Segurança e Privacidade
- ✅ Autenticação segura
- ✅ Criptografia de dados
- ✅ Backup automático
- ✅ Sincronização entre dispositivos

## 🏗️ Arquitetura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Auth.tsx        # Autenticação
│   ├── Header.tsx      # Cabeçalho
│   └── Footer.tsx      # Rodapé
├── screens/            # Telas do aplicativo
│   ├── HomeScreen.tsx  # Dashboard principal
│   ├── TransactionsScreen.tsx
│   ├── GoalsScreen.tsx
│   └── ChatScreen.tsx
├── lib/                # Serviços e integrações
│   ├── supabase.ts     # Cliente Supabase
│   ├── genai.ts        # Google Gemini AI
│   └── audio.ts        # Processamento de áudio
├── types/              # Definições TypeScript
├── utils/              # Utilitários e estilos
└── navigation/         # Configuração de rotas
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Expo CLI
- Conta no Supabase
- API Key do Google Gemini

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/ascend.git
cd ascend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_anonima
GEMINI_API_KEY=sua_chave_gemini
```

4. **Execute o projeto**
```bash
npx expo start
```

5. **Execute em dispositivo/emulador**
```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- **users** - Dados dos usuários
- **transactions** - Transações financeiras
- **categories** - Categorias de gastos
- **goals** - Metas financeiras
- **budgets** - Orçamentos

### Relacionamentos
```sql
users (1) → (N) transactions
users (1) → (N) goals
categories (1) → (N) transactions
goals (1) → (N) transactions (filtradas)
```

## 🤝 Contribuindo

Contribuições são sempre bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### 📋 Guidelines de Contribuição
- Siga os padrões de código TypeScript
- Adicione testes para novas funcionalidades
- Mantenha a documentação atualizada
- Use commits semânticos

## 🐛 Reportar Bugs

Encontrou um bug? Abra uma [issue](https://github.com/seu-usuario/ascend/issues) com:
- Descrição detalhada do problema
- Passos para reproduzir
- Screenshots (se aplicável)
- Informações do dispositivo/sistema

## 📈 Roadmap

### 🎯 Próximas Funcionalidades
- [ ] Modo família para compartilhamento
- [ ] Integração com bancos (Open Banking)
- [ ] Análises avançadas com ML
- [ ] Modo offline completo
- [ ] Exportação de relatórios PDF
- [ ] Notificações push inteligentes

### 🌟 Versões Futuras
- [ ] Versão web responsiva
- [ ] API pública para desenvolvedores
- [ ] Marketplace de plugins
- [ ] Integração com assistentes virtuais

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

<div align="center">
  <p>Feito com ❤️ para revolucionar sua gestão financeira</p>
  <p>⭐ Se este projeto te ajudou, considere dar uma estrela!</p>
</div>
## Design System & Responsive Utilities

This project uses a centralized theme and responsive helpers to keep visuals consistent across screens.

- Colors: `colors.light.text`, `colors.light.subtext`, `colors.dark.card`, `colors.dark.background`, `colors.dark.border`, `colors.primary`.
- Spacing: `spacing.xs`, `spacing.sm`, `spacing.md`, `spacing.lg`, `spacing.xl` for paddings/margins.
- Radius: `borderRadius.sm`, `borderRadius.md`, `borderRadius.lg`, `borderRadius.round` for surfaces and avatars.
- Typography: `fontSize.sm`, `fontSize.md`, `fontSize.lg`, `fontSize.xxl`, `fontSize.xxxl` for scalable text.
- Charts: `chartTheme.config` in `src/utils/theme.ts` centralizes `react-native-chart-kit` styles.

Responsive helpers (in `src/hooks/useResponsive.ts`):
- `breakpoint`, `isSmall`, `isMedium`, `isLarge` based on width.
- `containerPadding(breakpoint)`: standard page padding by size.
- `maxContentWidth(breakpoint)`: recommended content width cap.
- `columns(breakpoint)`: grid column suggestions for layout decisions.

Usage examples:
- Import tokens where needed: `import { colors, spacing, borderRadius, fontSize } from '../utils/theme';`
- Apply to styles: use `spacing.md` for gaps, `borderRadius.lg` for cards, `colors.dark.card` for dark surfaces, `colors.light.text` for text.

Keep new screens aligned by sourcing from the theme and helpers and avoid hardcoded values unless necessary.
