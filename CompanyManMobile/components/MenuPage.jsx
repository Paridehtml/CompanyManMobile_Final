import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View,
  FlatList, 
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable, 
  TouchableOpacity, 
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Button,
  TextInput,
  Card,
  Divider,
  Searchbar, 
  List,
  Menu,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api'; 
import { AuthContext } from './authContext';
import { OrderContext } from './OrderContext'; 
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const DishFormModal = ({ visible, onClose, onSave, inventoryItems, dish }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [recipe, setRecipe] = useState([]); 
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientQty, setIngredientQty] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false); 
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return inventoryItems;
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, inventoryItems]);

  useEffect(() => {
    if (dish) {
      setName(dish.name);
      setCategory(dish.category);
      setPrice(String(dish.price));
      setRecipe(dish.recipe || []);
    } else {
      setName(''); setCategory(''); setPrice(''); setRecipe([]);
    }
    setPickerVisible(false);
    setCategoryMenuVisible(false);
    setSelectedIngredient(null);
    setIngredientQty('');
    setSearchQuery('');
  }, [dish, visible]); 

  const handleAddIngredient = () => {
    if (!selectedIngredient || !ingredientQty) {
      Alert.alert("Error", "Please select an ingredient and set a quantity.");
      return;
    }
    const qtyString = String(ingredientQty).replace(',', '.');
    setRecipe([
      ...recipe,
      {
        inventoryItem: selectedIngredient._id,
        name: selectedIngredient.name,
        quantityRequired: Number(qtyString),
        unit: selectedIngredient.unit 
      }
    ]);
    setSelectedIngredient(null);
    setIngredientQty('');
    setPickerVisible(false);
  };
  
  const handleRemoveIngredient = (index) => {
    setRecipe(recipe.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name || !price || !category) {
       Alert.alert("Error", "Please fill in Name, Price, and Category.");
       return;
    }
    const priceString = String(price).replace(',', '.');
    const payload = { 
      name, 
      category, 
      price: Number(priceString), 
      recipe 
    };
    onSave(payload, dish?._id);
  };
  
  const handleSelectIngredient = (item) => {
    setSelectedIngredient(item);
    setPickerVisible(false);
  };

  const openCategoryMenu = () => setCategoryMenuVisible(true);
  const closeCategoryMenu = () => setCategoryMenuVisible(false);
  const selectCategory = (newCategory) => {
    setCategory(newCategory);
    closeCategoryMenu();
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onClose} 
        contentContainerStyle={pickerVisible ? styles.pickerModalView : styles.modalView}
      >
        {pickerVisible ? (
          <View>
            <Searchbar
              placeholder="Search ingredients..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={{marginBottom: 10, marginTop: 0, backgroundColor: '#f5f5f5'}} 
            />
            <ScrollView style={{maxHeight: 400}}>
              <List.Section>
                {filteredItems.map((item) => (
                  <List.Item
                    key={item._id}
                    title={`${item.name} (${item.unit})`}
                    description={`SKU: ${item.sku}`}
                    onPress={() => handleSelectIngredient(item)}
                  />
                ))}
                {filteredItems.length === 0 && (
                  <Text style={{textAlign: 'center', padding: 20}}>No items found.</Text>
                )}
              </List.Section>
            </ScrollView>
            <Button mode="text" onPress={() => setPickerVisible(false)} style={{marginTop: 10}}>
              Back to Form
            </Button>
          </View>
        ) : (
          <ScrollView>
            <Text style={styles.modalTitle}>{dish ? "Edit Dish" : "Add New Dish"}</Text>
            <TextInput label="Dish Name*" value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <View>
              <Menu
                visible={categoryMenuVisible}
                onDismiss={closeCategoryMenu}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={openCategoryMenu} 
                    style={styles.input}
                    labelStyle={styles.pickerButtonLabel}
                    contentStyle={styles.pickerButtonContent}
                  >
                    {`Category: ${category || 'Select...'}`}
                  </Button>
                }
              >
                <Menu.Item onPress={() => selectCategory('Starters')} title="Starters" />
                <Menu.Item onPress={() => selectCategory('Mains')} title="Mains" />
                <Menu.Item onPress={() => selectCategory('Desserts')} title="Desserts" />
                <Menu.Item onPress={() => selectCategory('Drinks')} title="Drinks" />
                <Menu.Item onPress={() => selectCategory('Other')} title="Other" />
              </Menu>
            </View>
            <TextInput label="Price*" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
            <Divider style={styles.divider} />
            <Text style={styles.modalSubtitle}>Recipe Ingredients</Text>
            {recipe.map((ing, index) => (
              <View key={index} style={styles.recipeItem}>
                <Text>{ing.name} ({ing.quantityRequired}{ing.unit})</Text>
                <Button icon="close" mode="text" onPress={() => handleRemoveIngredient(index)}> </Button>
              </View>
            ))}
            <View style={styles.addIngredientForm}>
              <Pressable onPress={() => setPickerVisible(true)} style={{flex: 1}}>
                <View pointerEvents="none">
                  <TextInput
                    label="Select Ingredient"
                    value={selectedIngredient ? `${selectedIngredient.name} (${selectedIngredient.unit})` : ''}
                    editable={false}
                    mode="outlined"
                    style={styles.input}
                  />
                </View>
              </Pressable>
              <TextInput
                label={`Qty (${selectedIngredient?.unit || '...'})`}
                value={ingredientQty}
                onChangeText={setIngredientQty}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.inputSmall}
              />
            </View>
            <Button mode="contained" onPress={handleAddIngredient} style={{marginTop: 5}}>Add Ingredient</Button>
            <View style={styles.buttonRow}>
              <Button mode="text" onPress={onClose}>Cancel</Button>
              <Button mode="contained" onPress={handleSave}>{dish ? "Update Dish" : "Save Dish"}</Button>
            </View>
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
};

const MenuPage = () => {
  const auth = useContext(AuthContext);
  const order = useContext(OrderContext);
  const isEmployee = auth?.user?.role === 'employee';

  const [menuSections, setMenuSections] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [dishToEdit, setDishToEdit] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/menu'); 
      const dishes = res.data.data.dishes || [];
      setInventoryItems(res.data.data.ingredients || []);
      
      const grouped = dishes.reduce((acc, dish) => {
        const category = dish.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(dish);
        return acc;
      }, {});

      const categoryOrder = ['Starters', 'Mains', 'Desserts', 'Drinks', 'Other'];

      const sections = categoryOrder
        .map(categoryTitle => ({
          title: categoryTitle,
          data: grouped[categoryTitle] || []
        }))
        .filter(section => isEmployee ? section.data.length > 0 : true);

      setMenuSections(sections);
      setError(null);
    } catch (err) {
      setError('Failed to fetch menu data');
    } finally {
      setLoading(false);
    }
  }, [isEmployee]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/api/menu/${id}`, payload);
      } else {
        await api.post('/api/menu', payload);
      }
      setModalVisible(false);
      setDishToEdit(null);
      fetchData(); 
    } catch (err) {
      Alert.alert("Error", "Failed to save dish.");
    }
  };
  
  const handleDelete = (dishId, dishName) => {
    Alert.alert(
      `Delete ${dishName}?`, 
      "Are you sure? This cannot be undone.", 
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete(`/api/menu/${dishId}`);
            setSnackbarMessage(`${dishName} has been deleted.`);
            setSnackbarVisible(true);
            fetchData(); 
          } catch (err) {
            Alert.alert("Error", "Failed to delete dish.");
          }
        }}
      ]
    );
  };

  const handleAddToOrder = (dish) => {
    if (!order) return; 
    order.addToOrder(dish);
    setSnackbarMessage(`${dish.name} added to order`);
    setSnackbarVisible(true);
  };
  
  const openAddModal = () => {
    setDishToEdit(null);
    setModalVisible(true);
  };
  
  const openEditModal = (dish) => {
    setDishToEdit(dish);
    setModalVisible(true);
  };

  const getCategoryIcon = (categoryTitle) => {
    switch (categoryTitle) {
      case 'Starters': return 'food-croissant';
      case 'Mains': return 'food-steak';
      case 'Desserts': return 'cake-variant';
      case 'Drinks': return 'glass-cocktail';
      default: return 'food-variant';
    }
  };

  const renderRightActions = (progress, dragX, dishId, dishName) => {
    if (isEmployee) return null; 

    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
    });

    return (
      <TouchableOpacity onPress={() => handleDelete(dishId, dishName)} style={styles.deleteActionContainer}>
        <View style={styles.deleteActionView}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMenuSection = ({ item: section }) => {
    
    const renderDishItem = (dish) => (
      <Swipeable
        key={dish._id} 
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, dish._id, dish.name)}
        overshootRight={false}
        enabled={!isEmployee} 
      >
        <Card style={styles.card}>
          <Card.Title
            title={`${dish.name} - £${dish.price.toFixed(2)}`}
            subtitle={dish.category}
          />
          <Card.Content>
            <Text variant="bodySmall">
              Recipe: {dish.recipe.length > 0 ? dish.recipe.map(r => `${r.name} (${r.quantityRequired}${r.unit})`).join(', ') : 'No recipe'}
            </Text>
          </Card.Content>
          
          <Card.Actions>
            {!isEmployee && (
              <Button mode="text" onPress={() => openEditModal(dish)}>Edit</Button>
            )}
            <Button 
              mode="contained" 
              icon="plus" 
              onPress={() => handleAddToOrder(dish)}
            >
              Add to Order
            </Button>
          </Card.Actions>
        </Card>
      </Swipeable>
    );

    if (isEmployee && section.data.length === 0) {
      return null;
    }

    return (
      <List.Accordion
        title={section.title}
        titleStyle={styles.accordionTitle}
        style={styles.accordion}
        left={props => <List.Icon {...props} icon={getCategoryIcon(section.title)} />}
      >
        {section.data.length === 0 ? (
          <List.Item title="No dishes in this category." titleStyle={styles.emptyText} />
        ) : (
          <View style={styles.cardContainer}>
            {section.data.map(renderDishItem)}
          </View>
        )}
      </List.Accordion>
    );
  };

  if (loading && !menuSections.length) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {!isEmployee && (
          <DishFormModal 
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onSave={handleSave}
            inventoryItems={inventoryItems}
            dish={dishToEdit}
          />
        )}
        
        {error && (
           <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={fetchData}>Retry</Button>
          </View>
        )}
        
        <FlatList
          data={menuSections}
          renderItem={renderMenuSection}
          keyExtractor={item => item.title}
          onRefresh={fetchData}
          refreshing={loading}
          ListHeaderComponent={
            !isEmployee && (
              <Button 
                icon="plus" 
                mode="contained" 
                onPress={openAddModal} 
                style={styles.addButton}
              >
                Add New Dish
              </Button>
            )
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.centered}>
                <Text style={{color: '#666'}}>No dishes in menu. Add one to begin.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
        
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2000}
        >
          {snackbarMessage}
        </Snackbar>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  addButton: { margin: 10, marginTop: 10, marginHorizontal: 8 },
  card: {
    backgroundColor: 'white',
    elevation: 0, 
    shadowOpacity: 0, 
    marginBottom: 1, 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderRadius: 0, 
  },
  cardContainer: {
    paddingHorizontal: 0, 
    paddingBottom: 0,
  },
  accordion: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8, 
  },
  accordionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    padding: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  modalView: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '100%',
  },
  pickerModalView: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '100%',
    flexGrow: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  pickerButtonContent: {
    height: 56,
    justifyContent: 'center',
  },
  pickerButtonLabel: {
    color: '#1C1B1F', 
    fontWeight: 'normal',
    marginLeft: 14,
    textAlign: 'left',
  },
  inputSmall: {
    width: 120, 
    marginBottom: 10,
    marginLeft: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  recipeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    marginBottom: 5,
  },
  addIngredientForm: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
    marginTop: 10,
  },
  divider: {
    marginVertical: 10,
  },
  deleteActionContainer: {
    width: 80,
    marginBottom: 1, 
  },
  deleteActionView: {
    backgroundColor: '#dd2c00',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default MenuPage;