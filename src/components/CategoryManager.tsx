import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoryService } from '../lib/categoryService';
import { Category, CategoryFormData } from '../types/category';
import { commonStyles } from '../utils/Styles';

// Cores disponíveis para seleção
const AVAILABLE_COLORS = [
  '#4ADE80', // Verde
  '#38BDF8', // Azul
  '#A78BFA', // Roxo
  '#FB923C', // Laranja
  '#F87171', // Vermelho
  '#FBBF24', // Amarelo
  '#EC4899', // Rosa
  '#6B7280', // Cinza
  '#0EA5E9', // Azul claro
  '#8B5CF6', // Roxo escuro
  '#F59E0B', // Âmbar
  '#10B981', // Esmeralda
];

// Ícones disponíveis para seleção
const AVAILABLE_ICONS = [
  'restaurant-outline',
  'car-outline',
  'game-controller-outline',
  'medical-outline',
  'school-outline',
  'receipt-outline',
  'cart-outline',
  'home-outline',
  'briefcase-outline',
  'airplane-outline',
  'gift-outline',
  'fitness-outline',
  'paw-outline',
  'book-outline',
  'cash-outline',
  'card-outline',
  'build-outline',
  'ellipsis-horizontal-outline',
];

interface CategoryManagerProps {
  visible: boolean;
  onClose: () => void;
  onCategorySelected: (category: Category) => void;
}

export default function CategoryManager({
  visible,
  onClose,
  onCategorySelected,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    icon: 'ellipsis-horizontal-outline',
    color: '#6B7280',
  });

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    try {
      if (!formData.name.trim()) {
        Alert.alert('Erro', 'O nome da categoria é obrigatório');
        return;
      }

      const newCategory = await categoryService.addCategory(formData);
      setCategories([...categories, newCategory]);
      setShowAddForm(false);
      setFormData({
        name: '',
        icon: 'ellipsis-horizontal-outline',
        color: '#6B7280',
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar a categoria');
      console.error(error);
    }
  };

  const handleCategorySelected = (category: Category) => {
    onCategorySelected(category);
    onClose();
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoryService.deleteCategory(id);
      // Filtrar apenas categorias personalizadas (com user_id não nulo)
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir a categoria');
      console.error(error);
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    // Não permitir excluir categorias padrão (user_id é null)
    const isDefaultCategory = item.user_id === null;

    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryItem}>
          <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
            <Ionicons name={item.icon as any} size={20} color="#fff" />
          </View>
          <Text style={styles.categoryName}>{item.name}</Text>
        </View>
        
        <View style={styles.categoryItem}>
          {!isDefaultCategory && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteCategory(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#F87171" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gerenciar Categorias</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4ADE80" />
          ) : (
            <>
              {!showAddForm ? (
                <>
                  <FlatList
                    data={categories}
                    renderItem={renderCategoryItem}
                    keyExtractor={(item) => item.id}
                    style={styles.categoryList}
                  />
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddForm(true)}
                  >
                    <Ionicons name="add-outline" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Nova Categoria</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.addForm}>
                  <Text style={styles.formTitle}>Nova Categoria</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nome</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Viagem"
                      placeholderTextColor="#6B7280"
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cor</Text>
                    <View style={styles.colorSelector}>
                      {AVAILABLE_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            formData.color === color && styles.colorOptionSelected,
                          ]}
                          onPress={() => setFormData({ ...formData, color })}
                        />
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ícone</Text>
                    <View style={styles.iconSelector}>
                      {AVAILABLE_ICONS.map((icon) => (
                        <TouchableOpacity
                          key={icon}
                          style={[
                            styles.iconOption,
                            formData.icon === icon && styles.iconOptionSelected,
                            formData.icon === icon && { borderColor: formData.color },
                          ]}
                          onPress={() => setFormData({ ...formData, icon })}
                        >
                          <Ionicons
                            name={icon as any}
                            size={20}
                            color={formData.icon === icon ? formData.color : '#6B7280'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.formButtons}>
                    <TouchableOpacity
                      style={[styles.formButton, styles.cancelButton]}
                      onPress={() => {
                        setShowAddForm(false);
                        setFormData({
                          name: '',
                          icon: 'ellipsis-horizontal-outline',
                          color: '#6B7280',
                        });
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.formButton, styles.saveButton]}
                      onPress={handleAddCategory}
                    >
                      <Text style={styles.saveButtonText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ADE80',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addForm: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 4,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#000',
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  iconOptionSelected: {
    borderWidth: 2,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  formButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4ADE80',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});