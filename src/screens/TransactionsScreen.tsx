import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, Modal, TextInput, TouchableOpacity, Alert, ScrollView, SectionList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PageContainer from '../components/ui/PageContainer';
import Chip from '../components/ui/Chip';
import { colors, spacing, borderRadius, fontSize, gradients } from '../utils/theme';
import { LineChart } from 'react-native-chart-kit';
import { chartConfig } from '../components/ui/ChartWrapper';
import { useTransactions } from '../hooks/useTransactions';
import { transactionService } from '../lib/transactionService';
import { categoryService } from '../lib/categoryService';
import type { Category } from '../types/category';
import type { Transaction, TransactionFormData } from '../types/transaction';

export default function TransactionsScreen() {
  const { transactions, refresh } = useTransactions();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionFormData>({ description: '', amount: 0, type: 'expense', category: 'Geral', date: new Date().toISOString() });
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [newCat, setNewCat] = useState<{ name: string; icon: string; color: string }>({ name: '', icon: 'pricetag-outline', color: '#64748B' });
  const iconOptions = [
    'wallet-outline', 'pricetag-outline', 'fast-food-outline', 'car-outline', 'home-outline', 'game-controller-outline',
    'medical-outline', 'briefcase-outline', 'airplane-outline', 'school-outline', 'fitness-outline', 'plane-outline',
    'book-outline', 'paw-outline', 'cafe-outline', 'shirt-outline', 'gift-outline', 'trending-up-outline', 'construct-outline',
    'brush-outline', 'color-palette-outline'
  ];
  const colorOptions = 
    ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#14B8A6', '#64748B', '#22C55E', 
     '#06B6D4', '#F472B6', '#A855F7', '#F43F5E', '#EAB308', '#94A3B8'];
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const width = Dimensions.get('window').width - 32;
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const cats: Category[] = await categoryService.getCategories();
        const map: Record<string, string> = {};
        cats.forEach((c) => {
          if (c.id) map[c.id] = c.name;
          if (c.category_key) map[c.category_key as string] = c.name;
          map[c.name] = c.name;
        });
        setCategoryMap(map);
        setCategories(cats);
      } catch (e) {
        console.warn('Falha ao carregar categorias', e);
      }
    })();
  }, []);

  const currency = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR')}`;
  const totalIncome = transactions.reduce((sum, t) => sum + (t.type === 'income' ? Math.abs(t.amount) : 0), 0);
  const totalExpense = transactions.reduce((sum, t) => sum + (t.type === 'expense' ? Math.abs(t.amount) : 0), 0);
  const currentMonthLabel = new Date().toLocaleString('pt-BR', { month: 'short' });

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const labels = months.map((d) => d.toLocaleString('pt-BR', { month: 'short' }));
  const incomeSeries = months.map((m) =>
    transactions.reduce((sum, t) => {
      const dt = new Date(t.date);
      const sameMonth = dt.getMonth() === m.getMonth() && dt.getFullYear() === m.getFullYear();
      return sum + (sameMonth && t.type === 'income' ? Math.abs(t.amount) : 0);
    }, 0)
  );
  const expenseSeries = months.map((m) =>
    transactions.reduce((sum, t) => {
      const dt = new Date(t.date);
      const sameMonth = dt.getMonth() === m.getMonth() && dt.getFullYear() === m.getFullYear();
      return sum + (sameMonth && t.type === 'expense' ? Math.abs(t.amount) : 0);
    }, 0)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ description: '', amount: 0, type: 'expense', category: 'Geral', date: new Date().toISOString() });
    setModalVisible(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({ description: t.description, amount: t.amount, type: t.type, category: t.category, date: t.date });
    setModalVisible(true);
  };

  const validate = (): string | null => {
    if (!form.description.trim()) return 'Descrição é obrigatória';
    if (!form.category.trim()) return 'Categoria é obrigatória';
    if (!['income','expense'].includes(form.type)) return 'Tipo inválido';
    if (isNaN(form.amount) || form.amount === 0) return 'Valor deve ser diferente de zero';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validação', err);
      return;
    }
    try {
      if (editing) {
        await transactionService.updateTransaction(editing.id, form);
      } else {
        await transactionService.addTransaction(form);
      }
      setModalVisible(false);
      await refresh();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  };

  const confirmDelete = (t: Transaction) => {
    Alert.alert('Excluir transação', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await transactionService.deleteTransaction(t.id); await refresh(); } catch (e) { Alert.alert('Erro', (e as Error).message); }
      }}
    ]);
  };

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthTitle = (d: Date) => d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const sections = (() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = monthKey(d);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const d = new Date(Number(year), Number(month) - 1, 1);
        return { title: monthTitle(d), data };
      });
  })();

  const fmtCategory = (raw: string) => categoryMap[raw] ?? raw;

  const findCategory = (raw: string): Category | undefined => {
    return categories.find((c) => c.id === raw || (c as any).category_key === raw || c.name === raw);
  };

  const hexToRgb = (hex: string) => {
    const norm = hex?.replace('#', '') || '64748B';
    const r = parseInt(norm.substring(0, 2), 16) || 100;
    const g = parseInt(norm.substring(2, 4), 16) || 116;
    const b = parseInt(norm.substring(4, 6), 16) || 139;
    return { r, g, b };
  };
  const pastel = (hex?: string, alpha = 0.15) => {
    const { r, g, b } = hexToRgb(hex || '#64748B');
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const saveCategory = async () => {
    try {
      if (!newCat.name.trim()) {
        Alert.alert('Validação', 'Informe um nome para a categoria');
        return;
      }
      await categoryService.addCategory({ name: newCat.name.trim(), icon: newCat.icon, color: newCat.color } as any);
      const cats: Category[] = await categoryService.getCategories();
      setCategories(cats);
      const map: Record<string, string> = {};
      cats.forEach((c) => {
        if (c.id) map[c.id] = c.name;
        // @ts-ignore
        if (c.category_key) map[c.category_key as string] = c.name;
        map[c.name] = c.name;
      });
      setCategoryMap(map);
      setCatModalVisible(false);
      setNewCat({ name: '', icon: 'pricetag-outline', color: '#64748B' });
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  };

  return (
    <PageContainer activeScreen="Transactions">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[gradients.info.from, gradients.info.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Minhas Contas</Text>
            <TouchableOpacity onPress={() => setAccountsOpen(o => !o)}>
              <Ionicons name={accountsOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {accountsOpen && (
            <>
              <View style={styles.cardsRow}>
                <View style={[styles.accountCard, { backgroundColor: '#E6FFFB' }]}> 
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>+ {currency(totalIncome)}</Text>
                  <Text style={[styles.cardSubtitle, { color: '#1F2937' }]}>Receitas</Text>
                  <Text style={[styles.cardDate, { color: '#64748B' }]}>{currentMonthLabel}</Text>
                </View>
                <View style={[styles.accountCard, { backgroundColor: '#FFF5F5' }]}> 
                  <Text style={[styles.cardAmount, { color: '#EF4444' }]}>- {currency(totalExpense)}</Text>
                  <Text style={[styles.cardSubtitle, { color: '#1F2937' }]}>Despesas</Text>
                  <Text style={[styles.cardDate, { color: '#64748B' }]}>{currentMonthLabel}</Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.md }}>
                <LineChart
                  data={{
                    labels,
                    datasets: [
                      { data: incomeSeries, color: () => '#10B981', strokeWidth: 2 },
                      { data: expenseSeries, color: () => '#EF4444', strokeWidth: 2 },
                    ],
                    legend: ['Receitas', 'Despesas'],
                  }}
                  width={Math.floor(width - spacing.lg * 2)}
                  height={140}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: borderRadius.lg, overflow: 'hidden' }}
                />
              </View>
            </>
          )}
          
        </LinearGradient>

        <View style={styles.historyBlock}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Histórico</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Ionicons name="add-outline" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Nova Transação</Text>
            </TouchableOpacity>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            scrollEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text style={styles.monthHeader}>{section.title}</Text>
            )}
            renderItem={({ item }) => {
              const cat = findCategory(item.category);
              const catColor = cat?.color || colors.light.border;
              return (
                <View style={[styles.historyItemWrap, { borderColor: pastel(catColor, 0.3) }]}> 
                  <LinearGradient
                    colors={[pastel(catColor, 0.25), colors.light.card]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.historyItemInner}
                  >
                    <View style={styles.historyLeft}>
                      <View style={[styles.historyAvatar, { backgroundColor: pastel(catColor, 0.25) }]}> 
                        <Ionicons name={(cat?.icon as any) || 'pricetag-outline'} size={18} color={catColor} />
                      </View>
                      <View style={styles.historyTextWrap}>
                        <Text style={styles.historyTitleText} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
                        <Text style={styles.historySubtitleText} numberOfLines={1} ellipsizeMode="tail">{fmtCategory(item.category)}</Text>
                      </View>
                    </View>
                    <View style={styles.historyActions}>
                      <Text style={[styles.historyAmount, { color: item.type === 'expense' ? '#EF4444' : '#10B981' }]}>R$ {Math.abs(item.amount).toFixed(2)}</Text>
                      <TouchableOpacity onPress={() => openEdit(item)}>
                        <Ionicons name="create-outline" size={20} color={colors.light.subtext} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => confirmDelete(item)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            }}
          />
        </View>

        {/* Modal de criação/edição */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.light.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg }}>
              <Text style={{ color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800', marginBottom: spacing.sm }}>
                {editing ? 'Editar Transação' : ''}
              </Text>
              <View style={{ gap: spacing.sm }}>
                {/* Título como label destacada e editável */}
                <View>
                  {editingTitle ? (
                    <TextInput
                      value={form.description}
                      onChangeText={(t) => setForm({ ...form, description: t })}
                      style={styles.titleInput}
                      placeholder="Defina o título"
                      placeholderTextColor={colors.light.subtext}
                      autoFocus
                      onBlur={() => setEditingTitle(false)}
                    />
                  ) : (
                    <TouchableOpacity style={styles.titleLabelRow} onPress={() => setEditingTitle(true)}>
                      <Text style={styles.titleLabel}>{form.description || 'Adicionar título'}</Text>
                      <Ionicons name="create-outline" size={18} color={colors.light.subtext} />
                    </TouchableOpacity>
                  )}
                  {!form.description && (
                    <Text style={styles.titleHelper}>Toque acima para preencher o título</Text>
                  )}
                </View>

                {/* Seleção de tipo (Receita/Despesa) abaixo do título */}
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, type: 'income' })}
                    style={[styles.typeChoice, form.type === 'income' ? styles.typeIncomeActive : styles.typeNeutral]}
                  >
                    <Text style={styles.typeChoiceText}>Receita</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setForm({ ...form, type: 'expense' })}
                    style={[styles.typeChoice, form.type === 'expense' ? styles.typeExpenseActive : styles.typeNeutral]}
                  >
                    <Text style={styles.typeChoiceText}>Despesa</Text>
                  </TouchableOpacity>
                </View>

                {/* Valor */}
                <TextInput
                  placeholder="Valor"
                  keyboardType="numeric"
                  value={String(form.amount || '')}
                  onChangeText={(t) => setForm({ ...form, amount: Number(t) })}
                  style={styles.input}
                  placeholderTextColor={colors.light.subtext}
                />

                {/* Seleção de Categoria com ícones e cores */}
                <Text style={styles.sectionLabel}>Categoria</Text>
                <View style={styles.catGrid}>
                  {categories.map((c) => {
                    const key = c.id || (c as any).category_key || c.name;
                    const isActive = form.category === key;
                    const color = c.color || colors.primary;
                    return (
                      <TouchableOpacity
                        key={String(key)}
                        style={[
                          styles.catChip,
                          { width: '48%' },
                          isActive && { borderColor: color, backgroundColor: pastel(color, 0.2) },
                        ]}
                        onPress={() => setForm({ ...form, category: String(key) })}
                        onLongPress={() => {
                          setCatEditing(c);
                          setNewCat({ name: c.name, icon: String(c.icon || 'pricetag-outline'), color: String(c.color || colors.primary) });
                          setCatModalVisible(true);
                        }}
                      >
                        <View style={[styles.catIconWrap, { backgroundColor: `${color}22` }]}> 
                          <Ionicons name={(c.icon as any) || 'pricetag-outline'} size={16} color={color} />
                        </View>
                        <Text style={styles.catName}>{c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.catChipAdd} onPress={() => setCatModalVisible(true)}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.catName}>Nova categoria</Text>
                  </TouchableOpacity>
                </View>

                {/* Ações */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={save}>
                    <Text style={styles.saveText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal: Nova Categoria */}
        <Modal visible={catModalVisible} animationType="slide" transparent onRequestClose={() => setCatModalVisible(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.light.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg }}>
              <Text style={{ color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800', marginBottom: spacing.sm }}>{catEditing ? 'Editar Categoria' : 'Nova Categoria'}</Text>
              <View style={{ gap: spacing.sm }}>
                <TextInput placeholder="Nome" value={newCat.name} onChangeText={(t) => setNewCat({ ...newCat, name: t })} style={styles.input} placeholderTextColor={colors.light.subtext} />
                <Text style={styles.sectionLabel}>Ícone</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {iconOptions.map((ico) => (
                    <TouchableOpacity key={ico} style={[styles.iconOption, newCat.icon === ico && styles.iconOptionActive]} onPress={() => setNewCat({ ...newCat, icon: ico })}>
                      <Ionicons name={ico as any} size={18} color={colors.light.text} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.sectionLabel}>Cor</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {colorOptions.map((clr) => (
                    <TouchableOpacity key={clr} style={[styles.colorDot, { backgroundColor: clr }, newCat.color === clr && styles.colorDotActive]} onPress={() => setNewCat({ ...newCat, color: clr })} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setCatModalVisible(false); setCatEditing(null); }}>
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {catEditing && (
                      <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={async () => {
                        try {
                          if (catEditing?.id) {
                            await categoryService.deleteCategory(catEditing.id);
                          }
                          const cats: Category[] = await categoryService.getCategories();
                          setCategories(cats);
                          const map: Record<string, string> = {};
                          cats.forEach((c) => {
                            if (c.id) map[c.id] = c.name;
                            if (c.category_key) map[c.category_key as string] = c.name;
                            map[c.name] = c.name;
                          });
                          setCategoryMap(map);
                          setCatModalVisible(false);
                          setCatEditing(null);
                        } catch (e) {
                          Alert.alert('Erro', (e as Error).message);
                        }
                      }}>
                        <Text style={styles.cancelText}>Excluir</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={async () => {
                      try {
                        if (!newCat.name.trim()) {
                          Alert.alert('Validação', 'Informe um nome para a categoria');
                          return;
                        }
                        if (catEditing?.id) {
                          await categoryService.updateCategory(catEditing.id, { name: newCat.name.trim(), icon: newCat.icon, color: newCat.color } as any);
                        } else {
                          await categoryService.addCategory({ name: newCat.name.trim(), icon: newCat.icon, color: newCat.color } as any);
                        }
                        const cats: Category[] = await categoryService.getCategories();
                        setCategories(cats);
                        const map: Record<string, string> = {};
                        cats.forEach((c) => {
                          if (c.id) map[c.id] = c.name;
                          if (c.category_key) map[c.category_key as string] = c.name;
                          map[c.name] = c.name;
                        });
                        setCategoryMap(map);
                        setCatModalVisible(false);
                        setCatEditing(null);
                        setNewCat({ name: '', icon: 'pricetag-outline', color: '#64748B' });
                      } catch (e) {
                        Alert.alert('Erro', (e as Error).message);
                      }
                    }}>
                      <Text style={styles.saveText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { borderRadius: borderRadius.xl, padding: spacing.lg },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
  cardsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  accountCard: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md },
  cardAmount: { color: '#1F2937', fontSize: fontSize.lg, fontWeight: '800' },
  cardSubtitle: { color: '#1F2937', marginTop: 4 },
  cardDate: { color: '#1F2937', opacity: 0.7, marginTop: 2, fontSize: fontSize.sm },
  statsBlock: { backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statsTitle: { color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800' },
  historyBlock: { backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  historyTitle: { color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800' },
  monthHeader: { color: colors.light.subtext, fontSize: fontSize.sm, marginBottom: spacing.sm, marginTop: spacing.md },
  historyItemWrap: { backgroundColor: colors.light.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.light.border, overflow: 'hidden' },
  historyItemInner: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.light.card, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.light.border },
  historyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.light.border, alignItems: 'center', justifyContent: 'center' },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  historyTextWrap: { flex: 1, minWidth: 0 },
  historyTitleText: { color: colors.light.text, fontWeight: '700' },
  historySubtitleText: { color: colors.light.subtext, fontSize: fontSize.sm },
  historyActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  historyAmount: { fontSize: fontSize.md, fontWeight: '700' },
  input: { backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.light.text },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.round, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.light.card },
  typeBtnActive: { borderColor: colors.primary },
  typeBtnText: { color: colors.light.text, fontWeight: '600' },
  modalBtn: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg },
  cancelBtn: { backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border },
  saveBtn: { backgroundColor: colors.primary },
  cancelText: { color: colors.light.text, fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.round },
  addBtnText: { color: '#fff', fontWeight: '700' },
  titleLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  titleLabel: { color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800' },
  titleHelper: { color: colors.light.subtext, fontSize: fontSize.sm, marginTop: spacing.xs },
  titleInput: { backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800' },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChoice: { flex: 1, borderWidth: 1, borderRadius: borderRadius.round, paddingVertical: 10, alignItems: 'center' },
  typeNeutral: { backgroundColor: colors.light.card, borderColor: colors.light.border },
  typeIncomeActive: { borderColor: '#10B981', backgroundColor: '#E6FFFB' },
  typeExpenseActive: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  typeIncomeBtn: { borderColor: '#10B981', backgroundColor: '#E6FFFB' },
  typeExpenseBtn: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
  typeActive: { borderWidth: 2 },
  typeChoiceText: { color: colors.light.text, fontWeight: '600' },
  typeChoiceTextActive: { color: colors.light.text },
  sectionLabel: { color: colors.light.subtext, fontWeight: '700', marginTop: spacing.sm },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.round, backgroundColor: colors.light.card },
  catChipActive: { borderColor: colors.primary },
  catIconWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catName: { color: colors.light.text, fontWeight: '600' },
  catChipAdd: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: borderRadius.round, backgroundColor: colors.light.card },
  iconOption: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.md, backgroundColor: colors.light.card },
  iconOptionActive: { borderColor: colors.primary },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.light.border },
  colorDotActive: { borderColor: colors.primary },
});