import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY || process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

export interface FinancialInsight {
  type: 'insight' | 'transaction' | 'goal' | 'bill' | 'error'
  content: string
  data?: any
}

export class GeminiAIService {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
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
      const recentHistory = await this.getRecentConversation(5)
      const systemPrompt = this.buildFinancialPrompt(financialData, recentHistory)
      let response = await this.makeAPICall(systemPrompt, message)
      
      if (response.status === 503 || response.status === 404) {
        console.log('Primary model unavailable, trying first fallback...')
        response = await this.makeAPICallWithFallback(systemPrompt, message)
        
        // If first fallback also fails, try second fallback
        if (response.status === 503 || response.status === 404) {
          console.log('First fallback unavailable, trying second fallback...')
          response = await this.makeAPICallWithSecondFallback(systemPrompt, message)
        }
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI API error response:', errorText)
        
        // Return a helpful fallback response instead of error
        return this.getFallbackResponse(message, financialData)
      }

      const result = await response.json()
      
      // Check if response has expected structure
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
    // Try with gemini-1.5-flash-latest as fallback
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
          maxOutputTokens: 1024, // Reduced tokens for faster response
        },
      }),
    })
  }

  private async makeAPICallWithSecondFallback(systemPrompt: string, message: string): Promise<Response> {
    // Try with gemini-pro as final fallback (most stable)
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
    
    if (lowerMessage.includes('spend') || lowerMessage.includes('expense')) {
      const recentTransactions = financialData.transactions.slice(-5)
      const totalSpent = recentTransactions.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0)
      return {
        type: 'insight',
        content: `I can see you've had ${recentTransactions.length} recent transactions totaling $${totalSpent.toFixed(2)}. While my advanced AI is currently busy, I'd be happy to help you track your spending patterns or create budgets. Would you like me to show you your recent transactions?`
      }
    }
    
    if (lowerMessage.includes('budget') || lowerMessage.includes('save')) {
      return {
        type: 'insight',
        content: `I notice you're interested in budgeting. You currently have ${financialData.goals.length} active financial goals. While my AI is experiencing high demand, I can help you set up new savings goals or track your progress. What specific financial goal would you like to work on?`
      }
    }
    
    if (lowerMessage.includes('transaction') || lowerMessage.includes('add')) {
      return {
        type: 'insight',
        content: `I can help you track new transactions! You have ${financialData.categories.length} spending categories available. While my AI is currently overloaded, feel free to tell me about any transactions you'd like to record, and I can help you categorize them properly.`
      }
    }
    
    // Default fallback
    return {
      type: 'insight',
      content: `I'm currently experiencing high demand, but I'm here to help with your finances! You have ${financialData.transactions.length} transactions recorded and ${financialData.goals.length} active goals. Feel free to ask me about your spending, create new transactions, or set financial goals. What would you like to work on?`
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
    return `You are ASCEND, a helpful financial assistant. You have access to the user's financial data and can help them manage their finances, create transactions, set goals, and provide insights.

User's Financial Data:
- Total Transactions: ${financialData.transactions.length}
- Categories Available: ${financialData.categories.map((c: any) => c.name).join(', ')}
- Active Goals: ${financialData.goals.length}
- Upcoming Bills: ${financialData.bills.filter((b: any) => !b.is_paid).length}

Conversation History (last 5 messages):
${historyText}

Your capabilities:
1. Answer questions about their financial data
2. Create transactions when requested
3. Create goals when requested
4. Create bills when requested
4. Provide financial insights and advice
5. Help track spending and budgeting

Response format requirements:
- If user asks to create a transaction, bill, or goal: respond with EXACTLY a valid JSON object and nothing else.
- JSON shape: { "action": "create_transaction|create_bill|create_goal", "data": { ... } }
- Use ISO date strings. Use strings for category names. Do not include trailing commas or comments.
- If not creating anything, respond with plain helpful text.

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
        if (parsed.action === 'create_transaction') {
          return {
            type: 'transaction',
            content: 'Registration Confirmation: Please review the transaction details.',
            data: parsed.data
          }
        }
        if (parsed.action === 'create_goal') {
          return {
            type: 'goal',
            content: 'Registration Confirmation: Please review the goal details.',
            data: parsed.data
          }
        }
        if (parsed.action === 'create_bill') {
          return {
            type: 'bill',
            content: 'Registration Confirmation: Please review the bill details.',
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
    return { success: true }
  }

  async createGoal(goalData: any) {
    return await supabase.from('goals').insert({
      ...goalData,
      user_id: this.userId
    })
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
    })
    if (error) throw error
    return { success: true }
  }

  private async getRecentConversation(limit: number) {
    const { data } = await supabase
      .from('chat_messages')
      .select('conversation')
      .eq('user_id', this.userId)
      .single()
    const conv = (data?.conversation || []) as { sender: 'user'|'ai', message: string }[]
    return conv.slice(Math.max(0, conv.length - limit))
  }
}
