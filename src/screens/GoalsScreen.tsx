import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { goalService } from '../lib/goalService';
import { categoryService } from '../lib/categoryService';
import { transactionService } from '../lib/transactionService';
import { Goal, GoalFormData } from '../types/goal';
import { Category } from '../types/category';
import { Transaction } from '../types/transaction';
import { colors, theme, spacing, borderRadius, fontSize } from '../utils/theme';
import Header from '../components/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import Footer from '../components/Footer';

export default function GoalsScreen() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    description: '',
    target_amount: 0,
    goal_type: 'maximum',
    recurrent: false,
    start_date: new Date().toISOString(),
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    categories: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadGoals(),
        loadCategories(),
        loadTransactions()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    try {
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as metas');
      console.error(error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const calculateGoalProgress = (goal: Goal): { currentAmount: number, percentage: number } => {
    const startDate = new Date(goal.start_date);
    const endDate = new Date(goal.end_date);
    
    // Filtrar transações por período e categorias da meta
    const relevantTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const isInPeriod = transactionDate >= startDate && transactionDate <= endDate;
      const isInCategory = goal.categories.length === 0 || goal.categories.includes(transaction.category);
      const isExpense = transaction.type === 'expense';
      
      return isInPeriod && isInCategory && isExpense;
    });

    // Calcular valor atual gasto
    const currentAmount = relevantTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Calcular porcentagem
    const percentage = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;
    
    return { currentAmount, percentage: Math.min(Math.max(percentage, 0), 200) }; // Limitar entre 0 e 200%
  };

  const handleAddGoal = async () => {
    try {
      if (!formData.title || formData.target_amount <= 0) {
        Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
        return;
      }

      const goalData = {
        ...formData,
        categories: selectedCategories,
      };

      if (editingGoal) {
        await goalService.updateGoal(editingGoal, goalData);
        Alert.alert('Sucesso', 'Meta atualizada com sucesso');
      } else {
        await goalService.addGoal(goalData);
        Alert.alert('Sucesso', 'Meta adicionada com sucesso');
      }

      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a meta');
      console.error(error);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal.id);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      target_amount: goal.target_amount,
      goal_type: goal.goal_type,
      recurrent: goal.recurrent,
      start_date: goal.start_date,
      end_date: goal.end_date,
      categories: goal.categories,
    });
    setSelectedCategories(goal.categories);
    setModalVisible(true);
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      Alert.alert(
        'Confirmar exclusão',
        'Tem certeza que deseja excluir esta meta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              await goalService.deleteGoal(id);
              loadGoals();
              Alert.alert('Sucesso', 'Meta excluída com sucesso');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir a meta');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      target_amount: 0,
      goal_type: 'maximum',
      recurrent: false,
      start_date: new Date().toISOString(),
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      categories: [],
    });
    setSelectedCategories([]);
    setEditingGoal(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const toggleCategorySelection = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryNames = (categoryIds: string[]) => {
    return categories
      .filter(category => categoryIds.includes(category.id))
      .map(category => category.name)
      .join(', ');
  };

  const getProgressColor = (goal: Goal, percentage: number) => {
    if (goal.goal_type === 'maximum') {
      if (percentage <= 75) return colors.primary;
      if (percentage <= 100) return '#FFA500'; // Laranja para aviso
      return '#FF4444'; // Vermelho para excesso
    } else {
      if (percentage >= 100) return colors.primary;
      if (percentage >= 75) return '#FFA500';
      return '#FF4444';
    }
  };

  const getStatusColor = (goal: Goal, percentage: number) => {
    if (goal.status === 'completed') return colors.primary;
    if (goal.status === 'failed') return '#FF4444';
    
    if (goal.goal_type === 'maximum') {
      return percentage > 100 ? '#FF4444' : colors.secondary;
    } else {
      return percentage >= 100 ? colors.primary : colors.secondary;
    }
  };

  const renderGoalItem = ({ item }: { item: Goal }) => {
    const { currentAmount, percentage } = calculateGoalProgress(item);
    const categoryNames = getCategoryNames(item.categories);
    const progressColor = getProgressColor(item, percentage);
    const statusColor = getStatusColor(item, percentage);
    
    return (
      <View style={styles.goalItem}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{item.title}</Text>
          <View style={styles.goalActions}>
            <TouchableOpacity onPress={() => handleEditGoal(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={18} color={colors.dark.subtext} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteGoal(item.id)} style={styles.actionButton}>
              <Ionicons name="trash" size={18} color="#FF4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.goalDescription}>{item.description}</Text>
        )}
        
        <View style={styles.goalDetails}>
          <View style={styles.goalDetailItem}>
            <Text style={styles.goalDetailLabel}>Tipo:</Text>
            <Text style={styles.goalDetailText}>
              {item.goal_type === 'maximum' ? 'Máximo' : 'Mínimo'}
            </Text>
          </View>
          <View style={styles.goalDetailItem}>
            <Text style={styles.goalDetailLabel}>Meta:</Text>
            <Text style={styles.goalDetailText}>{formatCurrency(item.target_amount)}</Text>
          </View>
        </View>
        
        <View style={styles.goalDetails}>
          <View style={styles.goalDetailItem}>
            <Text style={styles.goalDetailLabel}>Atual:</Text>
            <Text style={[styles.goalDetailText, { color: progressColor }]}>
              {formatCurrency(currentAmount)}
            </Text>
          </View>
          <View style={styles.goalDetailItem}>
            <Text style={styles.goalDetailLabel}>Progresso:</Text>
            <Text style={[styles.goalDetailText, { color: progressColor, fontWeight: 'bold' }]}>
              {percentage.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { 
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: progressColor
              }]} 
            />
            {percentage > 100 && (
              <View 
                style={[styles.progressOverflow, { 
                  width: `${Math.min(percentage - 100, 100)}%`,
                }]} 
              />
            )}
          </View>
          <Text style={[styles.progressText, { color: progressColor }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
        
        <View style={styles.goalFooter}>
          <Text style={styles.goalPeriod}>
            {formatDate(item.start_date)} - {formatDate(item.end_date)}
          </Text>
          <View style={[styles.goalStatus, { backgroundColor: statusColor }]}>
            <Text style={styles.goalStatusText}>
              {item.status === 'active' ? 'Ativa' : 
               item.status === 'completed' ? 'Concluída' : 'Falhou'}
            </Text>
          </View>
        </View>
        
        {categoryNames && (
          <Text style={styles.goalCategories}>
            <Text style={styles.goalDetailLabel}>Categorias: </Text>
            {categoryNames}
          </Text>
        )}
      </View>
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={[styles.categoryItem, selectedCategories.includes(item.id) && styles.categoryItemSelected]}
      onPress={() => toggleCategorySelection(item.id)}
    >
      <Text style={[styles.categoryName, selectedCategories.includes(item.id) && styles.categoryNameSelected]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Metas" />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando metas...</Text>
          </View>
        ) : (
          <FlatList
            data={goals}
            keyExtractor={(item) => item.id}
            renderItem={renderGoalItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="flag-outline" size={64} color={colors.dark.subtext} />
                <Text style={styles.emptyText}>Nenhuma meta encontrada</Text>
                <Text style={styles.emptySubtext}>Toque no botão + para adicionar uma meta</Text>
              </View>
            }
          />
        )}

        <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.dark.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.formScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formScrollContent}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Ex: Gastos com alimentação"
                  placeholderTextColor={colors.dark.subtext}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Valor da Meta (R$) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.target_amount > 0 ? formData.target_amount.toString() : ''}
                  onChangeText={(text) => {
                    const numValue = parseFloat(text.replace(',', '.')) || 0;
                    setFormData({ ...formData, target_amount: numValue });
                  }}
                  keyboardType="numeric"
                  placeholder="0,00"
                  placeholderTextColor={colors.dark.subtext}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tipo de Meta</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeButton, formData.goal_type === 'maximum' && styles.typeButtonActive]}
                    onPress={() => setFormData({ ...formData, goal_type: 'maximum' })}
                  >
                    <Text style={[styles.typeButtonText, formData.goal_type === 'maximum' && styles.typeButtonTextActive]}>
                      Gastar no máximo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, formData.goal_type === 'minimum' && styles.typeButtonActive]}
                    onPress={() => setFormData({ ...formData, goal_type: 'minimum' })}
                  >
                    <Text style={[styles.typeButtonText, formData.goal_type === 'minimum' && styles.typeButtonTextActive]}>
                      Gastar no mínimo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Período</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateGroup}>
                    <Text style={styles.dateLabel}>Início</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Text style={styles.dateText}>{formatDate(formData.start_date)}</Text>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.dateGroup}>
                    <Text style={styles.dateLabel}>Fim</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.dateText}>{formatDate(formData.end_date)}</Text>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categorias (opcional)</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategorySelector(!showCategorySelector)}
                >
                  <Text style={styles.categorySelectorText}>
                    {selectedCategories.length > 0
                      ? `${selectedCategories.length} categorias selecionadas`
                      : 'Todas as categorias'}
                  </Text>
                  <Ionicons
                    name={showCategorySelector ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                
                {showCategorySelector && (
                  <View style={styles.categoriesList}>
                    <FlatList
                      data={categories}
                      keyExtractor={(item) => item.id}
                      renderItem={renderCategoryItem}
                      numColumns={2}
                      scrollEnabled={false}
                      contentContainerStyle={styles.categoriesListContent}
                    />
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchContainer}>
                  <Text style={styles.label}>Meta Recorrente</Text>
                  <Switch
                    value={formData.recurrent}
                    onValueChange={(value) => setFormData({ ...formData, recurrent: value })}
                    trackColor={{ false: colors.dark.border, true: colors.primary }}
                    thumbColor={formData.recurrent ? '#fff' : '#f4f3f4'}
                  />
                </View>
                <Text style={styles.helperText}>
                  Metas recorrentes são renovadas automaticamente
                </Text>
              </View>

              {formData.description !== undefined && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Descrição (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Descrição adicional da meta"
                    placeholderTextColor={colors.dark.subtext}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddGoal}>
              <Text style={styles.saveButtonText}>
                {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={new Date(formData.start_date)}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, start_date: selectedDate.toISOString() });
                  }
                }}
              />
            )}

            {showEndDatePicker && (
              <DateTimePicker
                value={new Date(formData.end_date)}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, end_date: selectedDate.toISOString() });
                  }
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    flex: 1,
    position: 'relative',
    paddingTop: 80, // Espaço para evitar sobreposição com o Header
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 100, // Espaço para o botão flutuante e footer
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.dark.subtext,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.dark.subtext,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  goalItem: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.dark.text,
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
  },
  goalDescription: {
    fontSize: fontSize.sm,
    color: colors.dark.subtext,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  goalDetailItem: {
    flex: 1,
  },
  goalDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.subtext,
    fontWeight: '500',
    marginBottom: 2,
  },
  goalDetailText: {
    fontSize: fontSize.sm,
    color: colors.dark.text,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.dark.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.md,
  },
  progressOverflow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#FF4444',
    opacity: 0.7,
    borderRadius: borderRadius.md,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    minWidth: 45,
    textAlign: 'right',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalPeriod: {
    fontSize: fontSize.xs,
    color: colors.dark.subtext,
  },
  goalStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.lg,
  },
  goalStatusText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
  goalCategories: {
    fontSize: fontSize.xs,
    color: colors.dark.subtext,
  },
  addButton: {
    position: 'absolute',
    bottom: 90, // Acima do footer
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.dark.text,
  },
  formScrollView: {
    maxHeight: '75%',
  },
  formScrollContent: {
    paddingBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
    color: colors.dark.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.dark.text,
    backgroundColor: colors.dark.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.dark.background,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    color: colors.dark.subtext,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.dark.subtext,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.dark.background,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.dark.text,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.dark.subtext,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.dark.background,
  },
  categorySelectorText: {
    fontSize: fontSize.md,
    color: colors.dark.text,
  },
  categoriesList: {
    marginTop: spacing.sm,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark.background,
  },
  categoriesListContent: {
    padding: spacing.sm,
  },
  categoryItem: {
    flex: 1,
    margin: 4,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: '45%',
    backgroundColor: colors.dark.card,
  },
  categoryItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.dark.text,
  },
  categoryNameSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
});