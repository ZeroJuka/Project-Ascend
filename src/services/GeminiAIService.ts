import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp:generateContent'

export interface FinancialInsight {
  type: 'insight' | 'transaction' | 'goal' | 'error'
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
      // Fetch user's financial data
      const financialData = await this.getUserFinancialData()
      
      const systemPrompt = this.buildFinancialPrompt(financialData)
      
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`)
      }

      const result = await response.json()
      const aiResponse = result.candidates[0].content.parts[0].text

      // Parse the AI response to determine if it's a transaction or goal creation request
      return this.parseAIResponse(aiResponse, message)
    } catch (error) {
      console.error('AI service error:', error)
      return {
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      }
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

  private buildFinancialPrompt(financialData: any): string {
    return `You are ASCEND, a helpful financial assistant. You have access to the user's financial data and can help them manage their finances, create transactions, set goals, and provide insights.

User's Financial Data:
- Total Transactions: ${financialData.transactions.length}
- Categories Available: ${financialData.categories.map((c: any) => c.name).join(', ')}
- Active Goals: ${financialData.goals.length}
- Upcoming Bills: ${financialData.bills.filter((b: any) => !b.is_paid).length}

Your capabilities:
1. Answer questions about their financial data
2. Create transactions when requested (format: CREATE_TRANSACTION: {amount, description, category, type})
3. Create goals when requested (format: CREATE_GOAL: {title, target_amount, goal_type, time_period, description})
4. Provide financial insights and advice
5. Help track spending and budgeting

Always be helpful, accurate, and provide actionable insights. If creating transactions or goals, ask for confirmation first.

Current date: ${new Date().toISOString().split('T')[0]}`
  }

  private parseAIResponse(aiResponse: string, userMessage: string): FinancialInsight {
    // Check if the AI is requesting to create a transaction
    if (aiResponse.includes('CREATE_TRANSACTION:')) {
      const transactionData = aiResponse.split('CREATE_TRANSACTION:')[1].trim()
      return {
        type: 'transaction',
        content: 'I can help you create this transaction. Please confirm the details:',
        data: JSON.parse(transactionData)
      }
    }

    // Check if the AI is requesting to create a goal
    if (aiResponse.includes('CREATE_GOAL:')) {
      const goalData = aiResponse.split('CREATE_GOAL:')[1].trim()
      return {
        type: 'goal',
        content: 'I can help you set up this goal. Please confirm the details:',
        data: JSON.parse(goalData)
      }
    }

    // Regular insight response
    return {
      type: 'insight',
      content: aiResponse
    }
  }

  async createTransaction(transactionData: any) {
    return await supabase.from('transactions').insert({
      ...transactionData,
      user_id: this.userId
    })
  }

  async createGoal(goalData: any) {
    return await supabase.from('goals').insert({
      ...goalData,
      user_id: this.userId
    })
  }
}