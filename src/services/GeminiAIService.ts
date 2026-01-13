import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

export interface FinancialInsight {
  type: 'insight' | 'transaction' | 'goal' | 'bill' | 'batch' | 'error'
  content: string
  data?: any
}

export class GeminiAIService {
  private userId: string
  private language: 'en' | 'pt-BR'

  constructor(userId: string, language: 'en' | 'pt-BR' = 'en') {
    this.userId = userId
    this.language = language
  }

  async generateFinancialInsight(message: string): Promise<FinancialInsight> {
    try {
      if (!GEMINI_API_KEY) {
        console.error('Gemini API key not configured')
        return {
          type: 'error',
          content: 'AI service is not properly configured. Please contact support.'
        }
      }

      const financialData = await this.getUserFinancialData()
      const recentHistory = await this.getRecentConversation(12)
      const systemPrompt = this.buildFinancialPrompt(financialData, recentHistory)
      let response = await this.makeAPICall(systemPrompt, message)
      
      if (response.status === 503 || response.status === 404) {
        console.log('Primary model unavailable, trying first fallback...')
        response = await this.makeAPICallWithFallback(systemPrompt, message)
        
        if (response.status === 503 || response.status === 404) {
          console.log('First fallback unavailable, trying second fallback...')
          response = await this.makeAPICallWithSecondFallback(systemPrompt, message)
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI API error response:', errorText)
        
        return this.getFallbackResponse(message, financialData)
      }

      const result = await response.json()
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
        console.error('Unexpected AI response structure:', result)
        return this.getFallbackResponse(message, financialData)
      }
      
      const aiResponse = result.candidates[0].content.parts[0].text

      // Parse the AI response to determine if it's a transaction or goal creation request
      return this.parseAIResponse(aiResponse, message)
    } catch (error) {
      console.error('AI service error:', error)
      
      // Get basic financial data for fallback
      try {
        const financialData = await this.getUserFinancialData()
        return this.getFallbackResponse(message, financialData)
      } catch {
        return {
          type: 'error',
          content: 'I\'m currently experiencing high demand. Please try again in a moment, or feel free to ask me about your recent transactions and spending patterns.'
        }
      }
    }
  }

  private async makeAPICall(systemPrompt: string, message: string): Promise<Response> {
    if (Platform.OS === 'web') {
      return fetch(`/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, message }),
      })
    }
    return fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser message: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      }),
    })
  }

  private async makeAPICallWithFallback(systemPrompt: string, message: string): Promise<Response> {
    const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
    
    return fetch(`${fallbackUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser message: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024, 
        },
      }),
    })
  }

  private async makeAPICallWithSecondFallback(systemPrompt: string, message: string): Promise<Response> {
    const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
    
    return fetch(`${fallbackUrl}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser message: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more reliable responses
          topK: 1,
          topP: 1,
          maxOutputTokens: 512, // Further reduced for stability
        },
      }),
    })
  }

  private getFallbackResponse(message: string, financialData: any): FinancialInsight {
    // Simple keyword-based responses when AI is overloaded
    const lowerMessage = message.toLowerCase()
    const isPT = this.language === 'pt-BR'
    const locale = isPT ? 'pt-BR' : 'en-US'
    const currency = isPT ? 'BRL' : 'USD'
    const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
    
    if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
      const recentTransactions = financialData.transactions.slice(-5)
      const totalSpent = recentTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0)
      return {
        type: 'insight',
        content: isPT
          ? `Vejo que você teve ${recentTransactions.length} transações recentes totalizando ${fmt(totalSpent)}. Posso ajudar a acompanhar seus gastos ou criar orçamentos. Quer que eu mostre suas transações recentes?`
          : `I can see you've had ${recentTransactions.length} recent transactions totaling ${fmt(totalSpent)}. While my advanced AI is currently busy, I'd be happy to help you track your spending patterns or create budgets. Would you like me to show you your recent transactions?`
      }
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('save')) {
      return {
        type: 'insight',
        content: isPT
          ? `Percebo interesse em orçamento. Você tem ${financialData.goals.length} metas financeiras ativas. Posso ajudar a criar novas metas de economia ou acompanhar seu progresso. Qual meta deseja trabalhar?`
          : `I notice you're interested in budgeting. You currently have ${financialData.goals.length} active financial goals. While my AI is experiencing high demand, I can help you set up new savings goals or track your progress. What specific financial goal would you like to work on?`
      }
    }
    
    if (lowerMessage.includes('transaction') || lowerMessage.includes('add')) {
      return {
        type: 'insight',
        content: isPT
          ? `Posso ajudar a registrar novas transações! Você tem ${financialData.categories.length} categorias disponíveis. Diga quais transações deseja registrar e posso ajudar a categorizá-las corretamente.`
          : `I can help you track new transactions! You have ${financialData.categories.length} spending categories available. While my AI is currently overloaded, feel free to tell me about any transactions you'd like to record, and I can help you categorize them properly.`
      }
    }
    
    // Default fallback
    return {
      type: 'insight',
      content: isPT
        ? `Estou com alta demanda no momento, mas posso ajudar com suas finanças! Você tem ${financialData.transactions.length} transações registradas e ${financialData.goals.length} metas ativas. Pergunte sobre seus gastos, crie novas transações ou defina metas. O que deseja fazer?`
        : `I'm currently experiencing high demand, but I'm here to help with your finances! You have ${financialData.transactions.length} transactions recorded and ${financialData.goals.length} active goals. Feel free to ask me about your spending, create new transactions, or set financial goals. What would you like to work on?`
    }
  }

  private async getUserFinancialData() {
    const [
      { data: transactions },
      { data: categories },
      { data: goals },
      { data: bills }
    ] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', this.userId),
      supabase.from('categories').select('*'),
      supabase.from('goals').select('*').eq('user_id', this.userId),
      supabase.from('bills').select('*').eq('user_id', this.userId)
    ])

    return {
      transactions: transactions || [],
      categories: categories || [],
      goals: goals || [],
      bills: bills || []
    }
  }

  private buildFinancialPrompt(financialData: any, history: { sender: 'user'|'ai', message: string }[]): string {
    const historyText = history.map(h => `${h.sender.toUpperCase()}: ${h.message}`).join('\n')
    const lang = this.language === 'pt-BR' ? 'Português (Brasil)' : 'English'
    return `You are ASCEND, a focused financial assistant. You must help the user manage finances, create transactions, set goals, and register bills succinctly.

Preferred language: ${lang}
You must write all responses in the preferred language.

User's Financial Data:
- Total Transactions: ${financialData.transactions.length}
- Categories Available: ${financialData.categories.map((c: any) => c.name).join(', ')}
- Active Goals: ${financialData.goals.length}
- Upcoming Bills: ${financialData.bills.filter((b: any) => !b.is_paid).length}

Conversation History (recent messages):
${historyText}

Capabilities:
1. Answer questions about financial data and trends.
2. Create transactions when requested.
3. Create goals when requested.
4. Create bills when requested.
5. Provide financial insights and budgeting help.
6. Handle multiple items/expenses in a single message (Batch mode).

Output rules:
- When the user asks to register/create anything, output ONLY a single valid JSON object. No explanations, no markdown, no extra text.
- JSON shape for single item: { "action": "create_transaction|create_bill|create_goal", "data": { ... } }
- JSON shape for multiple items: { "action": "create_batch", "data": [ { "type": "transaction", "data": { ... } }, { "type": "bill", "data": { ... } } ] }
- Use ISO 8601 date strings. Use category names as strings. Avoid trailing commas and comments.
- If the user provides a list of items (e.g., shopping list), try to group them into logical transactions or keep them separate if explicitly distinct.
- If "milk 30$ and vegetables 10$", combine them into one "Food" transaction of 40$ with description "milk, vegetables".
- ALWAYS group items of the same category into a single transaction with the sum of amounts and concatenated descriptions.
- If "transport 10$ and chocolate 20$", create two transactions: one "Transportation", one "Food".
- If the user is not asking to create anything, respond with clear helpful text.

Examples:
- Transaction:
{"action":"create_transaction","data":{"amount":49.99,"description":"Groceries","type":"expense","category":"Food","transaction_date":"${new Date().toISOString().split('T')[0]}"}}
- Goal:
{"action":"create_goal","data":{"title":"Emergency Fund","target_amount":1000,"goal_type":"savings","time_period":"monthly"}}
- Bill:
{"action":"create_bill","data":{"title":"Internet","amount":89.90,"due_date":"${new Date().toISOString().split('T')[0]}","frequency":"monthly","category":"Utilities"}}
- Batch (Multiple Expenses):
{"action":"create_batch","data":[{"type":"transaction","data":{"amount":10,"description":"Uber","type":"expense","category":"Transportation"}},{"type":"transaction","data":{"amount":20,"description":"Chocolate","type":"expense","category":"Food"}}]}

Strictness:
- If asked to register, limit output to the creation command JSON only.
- Do not include greetings, prefaces, or any extra fields beyond what is necessary.

Current date: ${new Date().toISOString().split('T')[0]}`
  }

  private parseAIResponse(aiResponse: string, userMessage: string): FinancialInsight {
    const cleaned = aiResponse
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed === 'object' && parsed.action && parsed.data) {
        if (parsed.action === 'create_batch') {
          return {
            type: 'batch',
            content: this.language === 'pt-BR' 
              ? `Confirmação de Lote: Encontrei ${parsed.data.length} itens para registrar.` 
              : `Batch Confirmation: I found ${parsed.data.length} items to register.`,
            data: parsed.data
          }
        }
        if (parsed.action === 'create_transaction') {
          return {
            type: 'transaction',
            content: this.language === 'pt-BR' ? 'Confirmação de Registro: Revise os detalhes da transação.' : 'Registration Confirmation: Please review the transaction details.',
            data: parsed.data
          }
        }
        if (parsed.action === 'create_goal') {
          return {
            type: 'goal',
            content: this.language === 'pt-BR' ? 'Confirmação de Registro: Revise os detalhes da meta.' : 'Registration Confirmation: Please review the goal details.',
            data: parsed.data
          }
        }
        if (parsed.action === 'create_bill') {
          return {
            type: 'bill',
            content: this.language === 'pt-BR' ? 'Confirmação de Registro: Revise os detalhes da conta.' : 'Registration Confirmation: Please review the bill details.',
            data: parsed.data
          }
        }
      }
    } catch (e) {
      // fall through to insight
    }

    return {
      type: 'insight',
      content: aiResponse
    }
  }

  async createTransaction(transactionData: any) {
    const amount = Number(transactionData.amount)
    const description = String(transactionData.description || '')
    const type = (transactionData.type === 'income' ? 'income' : 'expense') as 'income' | 'expense'
    const categoryName = transactionData.category || transactionData.category_name || null
    let category_id: string | null = null

    if (categoryName) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id,name')
        .eq('name', categoryName)
        .limit(1)
        .maybeSingle()
      category_id = cat?.id || null
    }

    const transaction_date = transactionData.transaction_date || new Date().toISOString()

    const { error } = await supabase.from('transactions').insert({
      user_id: this.userId,
      amount,
      description,
      type,
      category_id,
      transaction_date,
    })
    if (error) throw error
    // Fetch the inserted record to get ID
    const { data: newTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', this.userId)
      .eq('amount', amount)
      .eq('description', description)
      .eq('transaction_date', transaction_date)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    return { success: true, data: newTx }
  }

  async createGoal(goalData: any) {
    return await supabase.from('goals').insert({
      ...goalData,
      user_id: this.userId
    }).select().single()
  }

  async createBill(billData: any) {
    const amount = Number(billData.amount)
    const title = String(billData.title || '')
    const due_date = billData.due_date || new Date().toISOString()
    const frequency = (billData.frequency || 'monthly') as 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    const categoryName = billData.category || billData.category_name || null
    let category_id: string | null = null

    if (categoryName) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id,name')
        .eq('name', categoryName)
        .limit(1)
        .maybeSingle()
      category_id = cat?.id || null
    }

    const { error } = await supabase.from('bills').insert({
      user_id: this.userId,
      title,
      amount,
      due_date,
      frequency,
      category_id,
      is_paid: false,
      paid_date: null,
    }).select().single()
    if (error) throw error
    return { success: true, data: (await supabase.from('bills').select('id').eq('user_id', this.userId).eq('title', title).eq('amount', amount).order('created_at', { ascending: false }).limit(1).single()).data }
  }

  private async getRecentConversation(limit: number) {
    const { data } = await supabase
      .from('chat_messages')
      .select('conversation, updated_at')
      .eq('user_id', this.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
    const conv = ((data?.[0]?.conversation) || []) as { sender: 'user'|'ai', message: string }[]
    return conv.slice(Math.max(0, conv.length - limit))
  }
}
