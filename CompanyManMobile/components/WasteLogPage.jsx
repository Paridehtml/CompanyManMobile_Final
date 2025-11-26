import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  TextInput,
  Modal,
  Portal,
  Title,
  List,
  Card,
  useTheme,
  Text,
  Menu,
} from 'react-native-paper';
import api, { inventoryAPI } from '../services/api'; 
import { AuthContext } from './authContext.tsx'; 

export const LogWasteModal = ({ visible, onClose, onSave, inventoryItems }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState(null);

  const [itemMenuVisible, setItemMenuVisible] = useState(false);
  const [reasonMenuVisible, setReasonMenuVisible] = useState(false);
  
  const reasonOptions = [
    { label: 'Expired', value: 'Expired' },
    { label: 'Damaged', value: 'Damaged' },
    { label: 'Cooked wrong', value: 'Cooked wrong' },
    { label: 'Dropped', value: 'Dropped' },
    { label: 'Other', value: 'Other' },
  ];

  const handleSave = () => {
    if (!selectedItem || !quantity || !reason) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    const qtyString = quantity.replace(',', '.');
    onSave({
      inventoryItemId: selectedItem._id,
      quantity: Number(qtyString),
      reason: reason,
    });
  };

  const selectReason = (value) => {
    setReason(value);
    setReasonMenuVisible(false);
  };
  
  const selectItem = (item) => {
    setSelectedItem(item);
    setItemMenuVisible(false);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalView}>
        <ScrollView>
          <Title style={styles.modalTitle}>Log Wasted Item</Title>

          <Menu
            visible={itemMenuVisible}
            onDismiss={() => setItemMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPressIn={() => setItemMenuVisible(true)}
                style={styles.input}
                labelStyle={styles.pickerButtonLabel}
                contentStyle={styles.pickerButtonContent}
              >
                {selectedItem ? `${selectedItem.name} (${selectedItem.unit})` : 'Select Item*'}
              </Button>
            }
          >
            <ScrollView style={{maxHeight: 200}}>
              {inventoryItems.map((item) => (
                <Menu.Item 
                  key={item._id} 
                  onPress={() => selectItem(item)} 
                  title={`${item.name} (${item.unit})`} 
                />
              ))}
            </ScrollView>
          </Menu>

          <Menu
            visible={reasonMenuVisible}
            onDismiss={() => setReasonMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPressIn={() => setReasonMenuVisible(true)}
                style={styles.input}
                labelStyle={styles.pickerButtonLabel}
                contentStyle={styles.pickerButtonContent}
              >
                {reason ? `Reason: ${reason}` : 'Select Reason*'}
              </Button>
            }
          >
            {reasonOptions.map((opt) => (
              <Menu.Item 
                key={opt.value} 
                onPress={() => selectReason(opt.value)} 
                title={opt.label} 
              />
            ))}
          </Menu>

          <TextInput
            label={`Quantity (${selectedItem?.unit || '...'})*`}
            mode="outlined"
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />

          <View style={styles.buttonRow}>
            <Button mode="text" onPress={onClose}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Log Waste</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};


const WasteLogPage = () => {
  const [wasteLogs, setWasteLogs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wasteRes, inventoryRes] = await Promise.all([
        api.get('/api/waste'),
        inventoryAPI.getAll()
      ]);
      
      setWasteLogs(wasteRes.data.data || []);
      setInventoryItems(inventoryRes.data.data || []);
    } catch (err) {
      setError('Failed to fetch data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (payload) => {
    try {
      await api.post('/api/waste', payload);
      setModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.msg || "Failed to log waste.");
    }
  };

  const renderLogItem = ({ item }) => (
    <List.Item
      style={styles.listItem}
      title={`${item.itemName} (${item.quantity} ${item.unit})`}
      description={`Reason: ${item.reason} - Logged by: ${item.loggedBy?.name || 'Unknown'}`}
      left={() => <List.Icon icon="delete-alert" color={theme.colors.error} />}
      right={() => <Text style={styles.itemDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <LogWasteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        inventoryItems={inventoryItems}
      />
      
      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={fetchData}>Retry</Button>
        </View>
      )}
      
      <FlatList
        data={wasteLogs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item._id}
        onRefresh={fetchData}
        refreshing={loading}
        ListHeaderComponent={
          <Button 
            icon="plus" 
            mode="contained" 
            onPress={() => setModalVisible(true)} 
            style={styles.addButton}
          >
            Log New Waste
          </Button>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <Card style={styles.emptyCard}>
              <Card.Title title="No waste logged." />
            </Card>
          ) : null
        }
        contentContainerStyle={{ padding: 10 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 10 },
  addButton: { margin: 10 },
  emptyCard: {
    margin: 10,
    padding: 10,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
  },
  itemDate: {
    alignSelf: 'center',
    marginRight: 10,
    color: '#666',
  },
  modalView: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
});

export default WasteLogPage;