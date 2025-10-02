import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageContainer from '../components/ui/PageContainer';
import Chip from '../components/ui/Chip';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { goalService } from '../lib/goalService';
import type { Goal, GoalFormData } from '../types/goal';

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState<'active' | 'completed' | 'failed' | 'all'>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormData>({
    title: '',
    description: '',
    target_amount: 0,
    goal_type: 'minimum',
    recurrent: false,
    start_date: new Date().toISOString(),
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(),
    categories: [],
  });

  const load = async () => {
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  };

  useEffect(() => { load(); }, []);

  const currency = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR')}`;

  const filteredGoals = goals.filter(g => filter === 'all' ? true : g.status === filter);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', description: '', target_amount: 0, goal_type: 'minimum', recurrent: false, start_date: new Date().toISOString(), end_date: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString(), categories: [] });
    setModalVisible(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({ title: g.title, description: g.description || '', target_amount: g.target_amount, goal_type: g.goal_type, recurrent: g.recurrent, start_date: g.start_date, end_date: g.end_date, categories: g.categories || [] });
    setModalVisible(true);
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Título é obrigatório';
    if (isNaN(form.target_amount) || form.target_amount <= 0) return 'Valor alvo deve ser maior que zero';
    if (!['minimum','maximum'].includes(form.goal_type)) return 'Tipo de meta inválido';
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return Alert.alert('Validação', err);
    try {
      if (editing) {
        await goalService.updateGoal(editing.id, form);
      } else {
        await goalService.addGoal(form);
      }
      setModalVisible(false);
      await load();
    } catch (e) {
      Alert.alert('Erro', (e as Error).message);
    }
  };

  const confirmDelete = (g: Goal) => {
    Alert.alert('Excluir meta', 'Tem certeza que deseja excluir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { try { await goalService.deleteGoal(g.id); await load(); } catch (e) { Alert.alert('Erro', (e as Error).message); } } },
    ]);
  };

  const markCompleted = async (g: Goal) => {
    try { await goalService.updateGoalStatus(g.id, 'completed'); await load(); } catch (e) { Alert.alert('Erro', (e as Error).message); }
  };

  return (
    <PageContainer activeScreen="Goals">
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Minhas Metas</Text>
          <TouchableOpacity onPress={openAdd}><Chip label="Nova Meta" active /></TouchableOpacity>
        </View>
        <View style={styles.filtersRow}>
          <TouchableOpacity onPress={() => setFilter('active')}><Chip label="Ativas" active={filter==='active'} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('completed')}><Chip label="Concluídas" active={filter==='completed'} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('failed')}><Chip label="Arquivadas" active={filter==='failed'} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('all')}><Chip label="Todas" active={filter==='all'} /></TouchableOpacity>
        </View>

        <FlatList
          data={filteredGoals}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ gap: spacing.md }}
          renderItem={({ item }) => {
            const pct = Math.min(100, Math.floor(((item.current_amount || 0) / (item.target_amount || 1)) * 100));
            return (
              <View style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>{item.title}</Text>
                  <Text style={styles.goalAmount}>{currency(item.target_amount)}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <Text style={styles.goalSubtext}>Progresso: {pct}%</Text>
                  <Text style={styles.goalSubtext}>Atual: {currency(item.current_amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={20} color={colors.light.subtext} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                  {item.status !== 'completed' && (
                    <TouchableOpacity onPress={() => markCompleted(item)}>
                      <Ionicons name="checkmark-done-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />

        {/* Modal para criar/editar metas */}
        <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: colors.light.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg }}>
              <Text style={{ color: colors.light.text, fontSize: fontSize.lg, fontWeight: '800', marginBottom: spacing.sm }}>
                {editing ? 'Editar Meta' : 'Nova Meta'}
              </Text>
              <View style={{ gap: spacing.sm }}>
                <TextInput placeholder="Título" value={form.title} onChangeText={(t) => setForm({ ...form, title: t })} style={styles.input} placeholderTextColor={colors.light.subtext} />
                <TextInput placeholder="Descrição" value={form.description} onChangeText={(t) => setForm({ ...form, description: t })} style={styles.input} placeholderTextColor={colors.light.subtext} />
                <TextInput placeholder="Valor alvo" keyboardType="numeric" value={String(form.target_amount || '')} onChangeText={(t) => setForm({ ...form, target_amount: Number(t) })} style={styles.input} placeholderTextColor={colors.light.subtext} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity onPress={() => setForm({ ...form, goal_type: 'minimum' })} style={[styles.typeBtn, form.goal_type === 'minimum' && styles.typeBtnActive]}><Text style={styles.typeBtnText}>Acumular</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setForm({ ...form, goal_type: 'maximum' })} style={[styles.typeBtn, form.goal_type === 'maximum' && styles.typeBtnActive]}><Text style={styles.typeBtnText}>Reduzir</Text></TouchableOpacity>
                </View>
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
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  headerTitle: { color: colors.light.text, fontSize: 22, fontWeight: '800' },
  filtersRow: { flexDirection: 'row', gap: 8 },
  goalCard: { backgroundColor: colors.light.card, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.light.border },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  goalTitle: { color: colors.light.text, fontSize: fontSize.lg, fontWeight: '700' },
  goalAmount: { color: colors.light.text, fontWeight: '800' },
  progressBar: { height: 10, backgroundColor: colors.light.border, borderRadius: 6 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  goalSubtext: { color: colors.light.subtext, marginTop: 6 },
  input: { backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.light.text },
  typeBtn: { flex: 1, borderWidth: 1, borderColor: colors.light.border, borderRadius: borderRadius.round, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.light.card },
  typeBtnActive: { borderColor: colors.primary },
  typeBtnText: { color: colors.light.text },
  modalBtn: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg },
  cancelBtn: { backgroundColor: colors.light.card, borderWidth: 1, borderColor: colors.light.border },
  saveBtn: { backgroundColor: colors.primary },
  cancelText: { color: colors.light.text, fontWeight: '600' },
  saveText: { color: '#fff', fontWeight: '700' },
});