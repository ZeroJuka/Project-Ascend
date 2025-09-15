import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { goalService } from '../lib/goalService';
import { categoryService } from '../lib/categoryService';
import { Goal, GoalFormData } from '../types/goal';
import { Category } from '../types/category';
import { commonStyles } from '../utils/Styles';
import Header from '../components/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import Footer from '../components/Footer';

export default function GoalsScreen() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    loadGoals();
    loadCategories();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalService.getGoals();
      setGoals(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as metas');
      console.error(error);
    } finally {
      setLoading(false);
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
      loadGoals();
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

  const getProgressPercentage = (goal: Goal) => {
    const progress = (goal.current_amount / goal.target_amount) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getCategoryNames = (categoryIds: string[]) => {
    return categories
      .filter(category => categoryIds.includes(category.id))
      .map(category => category.name)
      .join(', ');
  };

  const renderGoalItem = ({ item }: { item: Goal }) => {
    const progressPercentage = getProgressPercentage(item);
    const categoryNames = getCategoryNames(item.categories);
    
    return (
      <View style={styles.goalItem}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{item.title}</Text>
          <View style={styles.goalActions}>
            <TouchableOpacity onPress={() => handleEditGoal(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={18} color="#555" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteGoal(item.id)} style={styles.actionButton}>
              <Ionicons name="trash" size={18} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.goalDescription}>{item.description}</Text>
        
        <View style={styles.goalDetails}>
          <Text style={styles.goalDetailText}>
            <Text style={styles.goalDetailLabel}>Tipo: </Text>
            {item.goal_type === 'maximum' ? 'Gastar no máximo' : 'Gastar no mínimo'}
          </Text>
          <Text style={styles.goalDetailText}>
            <Text style={styles.goalDetailLabel}>Meta: </Text>
            R$ {item.target_amount.toFixed(2)}
          </Text>
          <Text style={styles.goalDetailText}>
            <Text style={styles.goalDetailLabel}>Atual: </Text>
            R$ {item.current_amount.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { 
                width: `${progressPercentage}%`,
                backgroundColor: item.goal_type === 'maximum' && progressPercentage > 100 ? '#ff4444' : '#4CAF50'
              }]} 
            />
          </View>
          <Text style={styles.progressText}>{progressPercentage.toFixed(0)}%</Text>
        </View>
        
        <View style={styles.goalFooter}>
          <Text style={styles.goalPeriod}>
            {formatDate(item.start_date)} - {formatDate(item.end_date)}
          </Text>
          <View style={[styles.goalStatus, { 
            backgroundColor: 
              item.status === 'completed' ? '#4CAF50' : 
              item.status === 'failed' ? '#ff4444' : '#2196F3'
          }]}>
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
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoalItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flag-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma meta encontrada</Text>
              <Text style={styles.emptySubtext}>Toque no botão + para adicionar uma meta</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleOpenModal}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

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
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Título da meta"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Descrição da meta"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Valor da Meta (R$)</Text>
              <TextInput
                style={styles.input}
                value={formData.target_amount.toString()}
                onChangeText={(text) => {
                  const numValue = parseFloat(text.replace(',', '.')) || 0;
                  setFormData({ ...formData, target_amount: numValue });
                }}
                keyboardType="numeric"
                placeholder="0,00"
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
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Meta Recorrente</Text>
                <Switch
                  value={formData.recurrent}
                  onValueChange={(value) => setFormData({ ...formData, recurrent: value })}
                  trackColor={{ false: '#ccc', true: '#2196F3' }}
                  thumbColor={formData.recurrent ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.helperText}>
                Metas recorrentes são renovadas automaticamente após o término
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de Início</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text>{formatDate(formData.start_date)}</Text>
                <Ionicons name="calendar" size={20} color="#555" />
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
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de Término</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text>{formatDate(formData.end_date)}</Text>
                <Ionicons name="calendar" size={20} color="#555" />
              </TouchableOpacity>
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categorias</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategorySelector(!showCategorySelector)}
              >
                <Text>
                  {selectedCategories.length > 0
                    ? `${selectedCategories.length} categorias selecionadas`
                    : 'Selecionar categorias'}
                </Text>
                <Ionicons
                  name={showCategorySelector ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#555"
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

            <TouchableOpacity style={styles.saveButton} onPress={handleAddGoal}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  goalItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalDetailText: {
    fontSize: 14,
  },
  goalDetailLabel: {
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalPeriod: {
    fontSize: 12,
    color: '#888',
  },
  goalStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2196F3',
  },
  goalStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  goalCategories: {
    fontSize: 12,
    color: '#555',
    marginTop: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  typeButtonText: {
    color: '#555',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
  },
  categoriesList: {
    marginTop: 8,
    maxHeight: 200,
  },
  categoriesListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    flex: 1,
    margin: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    minWidth: '45%',
  },
  categoryItemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  categoryName: {
    fontSize: 14,
  },
  categoryNameSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});