import { supabase } from '../lib/supabase'

export async function seedDummyTransactions(userId: string) {
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_default.eq.true`)

  const pick = (name: string) => categories?.find((c: any) => (c.name || '').toLowerCase() === name.toLowerCase()) || null

  const ensureCategory = async (name: string, color: string, icon: string) => {
    let cat = pick(name)
    if (!cat) {
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name, color, icon, is_default: false })
        .select('*')
        .single()
      if (error) throw error
      cat = data
    }
    return cat
  }

  const salary = await ensureCategory('Salary', '#50C878', 'wallet')
  const food = await ensureCategory('Food', '#FF6B6B', 'fast-food')
  const utilities = await ensureCategory('Utilities', '#4A90E2', 'flash')
  const transport = await ensureCategory('Transport', '#F5A623', 'car')
  const entertainment = await ensureCategory('Entertainment', '#9B59B6', 'game-controller')

  const now = new Date()
  const dates = [0, 1, 2].map(m => new Date(now.getFullYear(), now.getMonth() - m, 1))

  const rows = [
    // Current month
    { date: dates[0], type: 'income', amount: 3500, desc: 'Monthly Salary', cat: salary },
    { date: new Date(now.getFullYear(), now.getMonth(), 3), type: 'expense', amount: 120.45, desc: 'Groceries', cat: food },
    { date: new Date(now.getFullYear(), now.getMonth(), 5), type: 'expense', amount: 89.90, desc: 'Internet bill', cat: utilities },
    { date: new Date(now.getFullYear(), now.getMonth(), 7), type: 'expense', amount: 45.50, desc: 'Gas', cat: transport },
    { date: new Date(now.getFullYear(), now.getMonth(), 12), type: 'expense', amount: 60.00, desc: 'Cinema', cat: entertainment },
    // Last month
    { date: new Date(now.getFullYear(), now.getMonth()-1, 1), type: 'income', amount: 3500, desc: 'Monthly Salary', cat: salary },
    { date: new Date(now.getFullYear(), now.getMonth()-1, 4), type: 'expense', amount: 150.00, desc: 'Groceries', cat: food },
    { date: new Date(now.getFullYear(), now.getMonth()-1, 9), type: 'expense', amount: 92.00, desc: 'Electricity bill', cat: utilities },
    { date: new Date(now.getFullYear(), now.getMonth()-1, 15), type: 'expense', amount: 30.00, desc: 'Bus pass', cat: transport },
    { date: new Date(now.getFullYear(), now.getMonth()-1, 20), type: 'expense', amount: 25.00, desc: 'Streaming', cat: entertainment },
    // Two months ago
    { date: new Date(now.getFullYear(), now.getMonth()-2, 1), type: 'income', amount: 3400, desc: 'Monthly Salary', cat: salary },
    { date: new Date(now.getFullYear(), now.getMonth()-2, 3), type: 'expense', amount: 110.00, desc: 'Groceries', cat: food },
    { date: new Date(now.getFullYear(), now.getMonth()-2, 8), type: 'expense', amount: 88.00, desc: 'Water bill', cat: utilities },
    { date: new Date(now.getFullYear(), now.getMonth()-2, 14), type: 'expense', amount: 50.00, desc: 'Taxi', cat: transport },
    { date: new Date(now.getFullYear(), now.getMonth()-2, 22), type: 'expense', amount: 40.00, desc: 'Concert', cat: entertainment },
  ]

  const inserts = rows.map(r => ({
    user_id: userId,
    category_id: r.cat.id,
    amount: r.amount,
    description: r.desc,
    type: r.type,
    transaction_date: r.date.toISOString().split('T')[0],
  }))

  const { error } = await supabase.from('transactions').insert(inserts)
  if (error) throw error

  return { count: inserts.length }
}
