import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { transactionService } from '../lib/transactionService';
import { categoryService } from '../lib/categoryService';
import { Transaction, TransactionFormData } from '../types/transaction';
import { Category } from '../types/category';
import { commonStyles } from '../utils/Styles';
import Header from '../components/Header';
import CategoryManager from '../components/CategoryManager';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import Footer from '../components/Footer';

const DEFAULT_CATEGORIES: Partial<Category>[] = [];

export default function TransactionsScreen() {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES as Category[]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    description: '',
    amount: 0,
    type: 'expense',
    category: 'other',
    date: new Date().toISOString(),
  });

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions();
      setTransactions(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as transações');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const customCategories = await categoryService.getCategories();
      if (customCategories && customCategories.length > 0) {
        setCategories([...DEFAULT_CATEGORIES as Category[], ...customCategories].sort());
      }
    } catch (error) {
      console.error('Erro ao carregar categorias personalizadas:', error);
      setCategories(DEFAULT_CATEGORIES as Category[]);
    }
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      description: '',
      amount: 0,
      type: 'expense',
      category: 'other',
      date: new Date().toISOString(),
    });
    setModalVisible(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction.id);
    setFormData({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
    });
    setModalVisible(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteTransaction(id);
              setTransactions(transactions.filter((t) => t.id !== id));
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a transação');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleSaveTransaction = async () => {
    try {
      if (!formData.description.trim()) {
        Alert.alert('Erro', 'A descrição é obrigatória');
        return;
      }

      if (formData.amount <= 0) {
        Alert.alert('Erro', 'O valor deve ser maior que zero');
        return;
      }

      if (editingTransaction) {
        const updatedTransaction = await transactionService.updateTransaction(
          editingTransaction,
          formData
        );
        setTransactions(
          transactions.map((t) => (t.id === editingTransaction ? updatedTransaction : t))
        );
      } else {
        const newTransaction = await transactionService.addTransaction(formData);
        setTransactions([newTransaction, ...transactions]);
      }

      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a transação');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getCategoryInfo = (categoryIdOrKey: string) => {
    // Procurar primeiro pelo id e depois pelo category_key
    const category = categories.find(c => c.id === categoryIdOrKey || c.category_key === categoryIdOrKey);
    
    if (category) {
      return {
        name: category.name,
        icon: category.icon,
        color: category.color,
      };
    }
    
    // Categoria padrão caso não encontre
    return {
      name: 'Outros',
      icon: 'ellipsis-horizontal-outline',
      color: '#6B7280',
    };
  };
  
  const handleCategorySelected = (category: Category) => {
    // Usar category_key para categorias padrão, caso contrário usar id
    const categoryIdentifier = category.category_key || category.id;
    setFormData({ ...formData, category: categoryIdentifier });
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const categoryInfo = getCategoryInfo(item.category);

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.categoryIcon, { backgroundColor: categoryInfo.color }]}>
          <Ionicons name={categoryInfo.icon as any} size={20} color="#fff" />
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionCategory}>{categoryInfo.name}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        
        <View style={styles.transactionAmount}>
          <Text 
            style={[styles.amountText, item.type === 'income' ? styles.incomeText : styles.expenseText]}
          >
            {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleEditTransaction(item)}
            >
              <Ionicons name="pencil-outline" size={16} color="#4ADE80" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleDeleteTransaction(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate.toISOString() });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Transações" />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ADE80" />
            <Text style={styles.loadingText}>Carregando transações...</Text>
          </View>
        ) : (
          <>
            {/* Renko Chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Fluxo de Caixa</Text>
              <LineChart
                data={{
                  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                  datasets: [
                    {
                      data: [
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100
                      ],
                      color: (opacity = 1) => `rgba(74, 222, 128, ${opacity})`,
                      strokeWidth: 2
                    },
                    {
                      data: [
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100,
                        Math.random() * 100
                      ],
                      color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
                      strokeWidth: 2
                    }
                  ],
                  legend: ['Receitas', 'Despesas']
                }}
                width={Dimensions.get('window').width - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#1F2937',
                  backgroundGradientFrom: '#1F2937',
                  backgroundGradientTo: '#1F2937',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#ffa726'
                  }
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16
                }}
              />
            </View>
            
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: 'rgba(74, 222, 128, 0.9)' }]}>
                <Text style={styles.summaryLabel}>Receitas</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(
                    transactions
                      .filter((t) => t.type === 'income')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </Text>
              </View>
              
              <View style={[styles.summaryCard, { backgroundColor: 'rgba(248, 113, 113, 0.9)' }]}>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(
                    transactions
                      .filter((t) => t.type === 'expense')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </Text>
              </View>
            </View>
            
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Histórico</Text>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={handleAddTransaction}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#6B7280" />
                <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
                <Text style={styles.emptySubtext}>Adicione sua primeira transação clicando no botão +</Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>
      
      {/* Modal para adicionar/editar transação */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'income' && styles.typeButtonActive,
                    formData.type === 'income' && { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'income' })}
                >
                  <Ionicons 
                    name="arrow-up-outline" 
                    size={20} 
                    color={formData.type === 'income' ? '#4ADE80' : '#6B7280'} 
                  />
                  <Text 
                    style={[
                      styles.typeButtonText,
                      formData.type === 'income' && { color: '#4ADE80' },
                    ]}
                  >
                    Receita
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === 'expense' && styles.typeButtonActive,
                    formData.type === 'expense' && { backgroundColor: 'rgba(248, 113, 113, 0.2)' },
                  ]}
                  onPress={() => setFormData({ ...formData, type: 'expense' })}
                >
                  <Ionicons 
                    name="arrow-down-outline" 
                    size={20} 
                    color={formData.type === 'expense' ? '#F87171' : '#6B7280'} 
                  />
                  <Text 
                    style={[
                      styles.typeButtonText,
                      formData.type === 'expense' && { color: '#F87171' },
                    ]}
                  >
                    Despesa
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Descrição</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Supermercado"
                  placeholderTextColor="#6B7280"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Valor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={formData.amount > 0 ? formData.amount.toString() : ''}
                  onChangeText={(text) => {
                    const numericValue = parseFloat(text.replace(',', '.')) || 0;
                    setFormData({ ...formData, amount: numericValue });
                  }}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.inputLabel}>Categoria</Text>
                  <TouchableOpacity 
                    style={styles.manageCategoriesButton}
                    onPress={() => setShowCategoryManager(true)}
                  >
                    <Text style={styles.manageCategoriesText}>Gerenciar</Text>
                    <Ionicons name="settings-outline" size={16} color="#4ADE80" />
                  </TouchableOpacity>
                </View>
                <View style={styles.categorySelector}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        formData.category === category.id && styles.categoryButtonActive,
                        formData.category === category.id && { borderColor: category.color },
                      ]}
                      onPress={() => setFormData({ ...formData, category: category.id })}
                    >
                      <View 
                        style={[
                          styles.categoryIconSmall, 
                          { backgroundColor: category.color },
                        ]}
                      >
                        <Ionicons name={category.icon as any} size={16} color="#fff" />
                      </View>
                      <Text 
                        style={[
                          styles.categoryButtonText,
                          formData.category === category.id && { color: category.color },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Data</Text>
                <TouchableOpacity 
                  style={styles.dateSelector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>
                    {formatDate(formData.date)}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date(formData.date)}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveTransaction}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CategoryManager
        visible={showCategoryManager}
        onClose={() => {
          setShowCategoryManager(false);
          loadCategories(); // Recarregar categorias quando o modal for fechado
        }}
        onCategorySelected={handleCategorySelected}
      />
      
      {/* Barra de navegação inferior padronizada */}
      <Footer activeScreen="Transactions" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ...commonStyles,
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
    paddingBottom: 70, // Adicionar espaço para a barra de navegação
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  chartContainer: {
    marginBottom: 20,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100, // Garantir altura mínima para evitar corte
  },
  summaryLabel: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  incomeText: {
    color: '#4ADE80',
  },
  expenseText: {
    color: '#F87171',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#374151',
  },
  typeButtonActive: {
    borderWidth: 1,
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageCategoriesText: {
    color: '#4ADE80',
    fontSize: 14,
    marginRight: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#fff',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#4ADE80',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});