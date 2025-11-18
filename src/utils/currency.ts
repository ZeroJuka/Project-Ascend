export function formatCurrency(amount: number, language: 'en' | 'pt-BR') {
  const locale = language === 'pt-BR' ? 'pt-BR' : 'en-US'
  const currency = language === 'pt-BR' ? 'BRL' : 'USD'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
