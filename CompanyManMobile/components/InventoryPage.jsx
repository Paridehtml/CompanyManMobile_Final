import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal as RNModal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Button,
  TextInput,
  Modal as PaperModal,
  Portal,
  Title,
  List,
  Searchbar,
  IconButton,
  Card,
  Menu,
  Divider,
  HelperText,
} from 'react-native-paper';

import api, { inventoryAPI } from '../services/api';
import { AuthContext } from './authContext';
import { LogWasteModal } from '@/components/WasteLogPage';

const supplierAPI = {
  getAll: () => api.get('/api/suppliers'),
  create: (data) => api.post('/api/suppliers', data),
};

const SupplierManagerModal = ({ visible, onClose, onSupplierCreated }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierAPI.getAll();
      setSuppliers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSuppliers();
    }
  }, [visible]);

  const handleAddSupplier = async () => {
    if (!name) {
      Alert.alert('Error', 'Supplier name is required.');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = { name, contactPerson, email, phone };
      const res = await supplierAPI.create(payload);
      onSupplierCreated(res.data.data); 
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to add supplier. Is the name unique?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalView}>
        <ScrollView>
          <Title style={styles.modalTitle}>Manage Suppliers</Title>
          <List.Subheader>Add New Supplier</List.Subheader>
          <TextInput label="Supplier Name*" mode="outlined" style={styles.input} value={name} onChangeText={setName} />
          <TextInput label="Contact Person" mode="outlined" style={styles.input} value={contactPerson} onChangeText={setContactPerson} />
          <TextInput label="Email" mode="outlined" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextInput label="Phone" mode="outlined" style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button 
            mode="contained" 
            onPress={handleAddSupplier} 
            disabled={isSubmitting} 
            loading={isSubmitting}
            style={{ marginBottom: 20 }}
          >
            Add Supplier
          </Button>
          <Divider style={{ marginVertical: 10 }} />
          <List.Subheader>Existing Suppliers</List.Subheader>
          {loading && <ActivityIndicator />}
          {!loading && suppliers.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#666', margin: 10 }}>No suppliers found.</Text>
          )}
          {suppliers.map(supplier => (
            <List.Item
              key={supplier._id}
              title={supplier.name}
              description={supplier.email || supplier.phone || 'No contact info'}
              left={() => <List.Icon icon="domain" />}
            />
          ))}
          <Button mode="text" onPress={onClose} style={{ marginTop: 20 }}>Close</Button>
        </ScrollView>
      </PaperModal>
    </Portal>
  );
};

const ItemFormModal = ({ visible, onClose, onSave, item, suppliers }) => {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    quantity: '',
    unit: 'g',
    purchasePrice: '',
    purchaseQuantity: '1',
    purchaseUnit: 'kg',
    supplier: null,
    expiresInDays: '',
  });
  
  const [stockingUnitMenuVisible, setStockingUnitMenuVisible] = useState(false);
  const [purchaseUnitMenuVisible, setPurchaseUnitMenuVisible] = useState(false);
  const [supplierMenuVisible, setSupplierMenuVisible] = useState(false);

  const allUnits = ['g', 'kg', 'ml', 'l', 'unit'];

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name || "",
        sku: item.sku || "",
        description: item.description || "",
        quantity: item.quantity ? String(item.quantity) : "",
        unit: item.unit || 'g',
        purchasePrice: item.purchasePrice ? String(item.purchasePrice) : '',
        purchaseQuantity: item.purchaseQuantity ? String(item.purchaseQuantity) : '1',
        purchaseUnit: item.purchaseUnit || 'kg',
        supplier: item.supplier?._id || null,
        expiresInDays: item.expiresInDays ? String(item.expiresInDays) : '',
      });
    } else {
      setForm({
        name: "", sku: "", description: "", quantity: "", unit: 'g',
        purchasePrice: '', purchaseQuantity: '1', purchaseUnit: 'kg',
        supplier: null, expiresInDays: '',
      });
    }
  }, [item]);

  const handleChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = () => {
    if (!form.name || !form.sku || !form.quantity || !form.unit || !form.purchasePrice || !form.purchaseQuantity || !form.purchaseUnit) {
       Alert.alert("Error", "Please fill in all required fields (*).");
       return;
    }
    const payload = {
      ...form,
      quantity: Number(form.quantity.replace(',', '.')),
      purchasePrice: Number(form.purchasePrice.replace(',', '.')) || 0,
      purchaseQuantity: Number(form.purchaseQuantity.replace(',', '.')) || 1,
      expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
    };
    if (!payload.supplier) {
      payload.supplier = null;
    }
    onSave(payload, item?._id);
  };
  
  const openStockingUnitMenu = () => setStockingUnitMenuVisible(true);
  const closeStockingUnitMenu = () => setStockingUnitMenuVisible(false);
  const selectStockingUnit = (unit) => {
    handleChange('unit', unit);
    closeStockingUnitMenu();
  };

  const openPurchaseUnitMenu = () => setPurchaseUnitMenuVisible(true);
  const closePurchaseUnitMenu = () => setPurchaseUnitMenuVisible(false);
  const selectPurchaseUnit = (unit) => {
    handleChange('purchaseUnit', unit);
    closePurchaseUnitMenu();
  };

  const openSupplierMenu = () => setSupplierMenuVisible(true);
  const closeSupplierMenu = () => setSupplierMenuVisible(false);
  const selectSupplier = (supplierId) => {
    handleChange('supplier', supplierId);
    closeSupplierMenu();
  };
  
  const selectedSupplierName = useMemo(() => {
    if (!form.supplier) return 'Select Supplier';
    return suppliers.find(s => s._id === form.supplier)?.name || 'Select Supplier';
  }, [form.supplier, suppliers]);

  return (
    <Portal>
      <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalView}>
        <ScrollView>
          <Title style={styles.modalTitle}>{item ? "Edit Item" : "Add New Item"}</Title>
          
          <TextInput label="Name*" mode="outlined" style={styles.input} value={form.name} onChangeText={(v) => handleChange('name', v)} />
          <TextInput label="SKU*" mode="outlined" style={styles.input} value={form.sku} onChangeText={(v) => handleChange('sku', v)} />
          <TextInput label="Description" mode="outlined" style={styles.input} value={form.description} onChangeText={(v) => handleChange('description', v)} />
          
          <View style={{flexDirection: 'row', gap: 10}}>
            <TextInput 
              label="Stock Quantity*" 
              mode="outlined" 
              style={[styles.input, {flex: 2}]} 
              value={form.quantity} 
              onChangeText={(v) => handleChange('quantity', v)} 
              keyboardType="numeric" 
            />
            <Menu
              visible={stockingUnitMenuVisible}
              onDismiss={closeStockingUnitMenu}
              anchor={
                <Button
                  mode="outlined"
                  onPress={openStockingUnitMenu} 
                  style={[styles.input, {flex: 1, paddingVertical: 6}]}
                  labelStyle={styles.pickerButtonLabel}
                  contentStyle={styles.pickerButtonContent}
                >
                  {form.unit || 'Unit*'}
                </Button>
              }
            >
              {allUnits.map(u => <Menu.Item key={u} onPress={() => selectStockingUnit(u)} title={u} />)}
            </Menu>
          </View>
          <HelperText type="info" style={{ marginTop: -10, marginBottom: 10 }}>
            This is the quantity and unit for recipes (e.g., 1000 g).
          </HelperText>

          <TextInput 
            label="Purchase Price*"
            mode="outlined" 
            style={styles.input} 
            value={form.purchasePrice} 
            onChangeText={(v) => handleChange('purchasePrice', v)} 
            keyboardType="numeric" 
          />
          <View style={{flexDirection: 'row', gap: 10}}>
            <TextInput 
              label="Purchase Qty*" 
              mode="outlined" 
              style={[styles.input, {flex: 2}]} 
              value={form.purchaseQuantity} 
              onChangeText={(v) => handleChange('purchaseQuantity', v)} 
              keyboardType="numeric" 
            />
            <Menu
              visible={purchaseUnitMenuVisible}
              onDismiss={closePurchaseUnitMenu}
              anchor={
                <Button
                  mode="outlined"
                  onPress={openPurchaseUnitMenu} 
                  style={[styles.input, {flex: 1, paddingVertical: 6}]}
                  labelStyle={styles.pickerButtonLabel}
                  contentStyle={styles.pickerButtonContent}
                >
                  {form.purchaseUnit || 'Unit*'}
                </Button>
              }
            >
              {allUnits.map(u => <Menu.Item key={u} onPress={() => selectPurchaseUnit(u)} title={u} />)}
            </Menu>
          </View>
          <HelperText type="info" style={{ marginTop: -10, marginBottom: 10 }}>
            This is the price for the item you buy (e.g., $1.10 for 1 liter).
          </HelperText>

          <Menu
            visible={supplierMenuVisible}
            onDismiss={closeSupplierMenu}
            anchor={
              <Button
                mode="outlined"
                onPress={openSupplierMenu} 
                style={styles.input}
                labelStyle={styles.pickerButtonLabel}
                contentStyle={styles.pickerButtonContent}
              >
                {selectedSupplierName}
              </Button>
            }
          >
            <Menu.Item onPress={() => selectSupplier(null)} title="None" />
            {suppliers.map((s) => (
              <Menu.Item 
                key={s._id} 
                onPress={() => selectSupplier(s._id)} 
                title={s.name} 
              />
            ))}
          </Menu>

          <TextInput 
            label="Shelf Life (in days)"
            mode="outlined" 
            style={styles.input} 
            value={form.expiresInDays} 
            onChangeText={(v) => handleChange('expiresInDays', v)} 
            keyboardType="numeric" 
          />
          <HelperText type="info" style={{ marginTop: -10, marginBottom: 10 }}>
            Leave blank if the item does not expire.
          </HelperText>
          
          <View style={styles.buttonRow}>
            <Button mode="text" onPress={onClose}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>{item ? "Update" : "Add"}</Button>
          </View>
        </ScrollView>
      </PaperModal>
    </Portal>
  );
};

const BarcodeScannerModal = ({ visible, onClose, onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState(null);

  useEffect(() => {
    if (visible) {
      setScannedData(null);
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  const handleScan = ({ data }) => {
    if (!scannedData) {
      setScannedData(data);
    }
  };

  const handleUseSKU = () => {
    if (scannedData) {
      onScanned({ data: scannedData });
    }
  };

  const handleScanAgain = () => {
    setScannedData(null);
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Portal>
        <PaperModal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalView}>
          <Title>Camera Permission Needed</Title>
          <Text style={{ marginVertical: 10 }}>We need camera access to scan barcodes.</Text>
          <Button mode="contained" onPress={requestPermission}>Grant Permission</Button>
          <Button mode="text" onPress={onClose} style={{marginTop: 10}}>Cancel</Button>
        </PaperModal>
      </Portal>
    );
  }

  return (
    <RNModal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={StyleSheet.absoluteFill}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scannedData ? undefined : handleScan}
        />

        {!scannedData ? (
          <View style={styles.scannerTarget} />
        ) : (
          <View style={styles.scanOverlay}>
            <Button mode="contained" onPress={handleUseSKU} style={{width: '80%', marginBottom: 10}}>Use this SKU</Button>
            <Button mode="outlined" onPress={handleScanAgain} style={{width: '80%', backgroundColor: 'white'}}>Scan Again</Button>
          </View>
        )}

        <Button mode="contained" onPress={onClose} style={styles.scannerCloseButton}>Cancel</Button>
      </View>
    </RNModal>
  );
};

const InventoryPage = () => {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [wasteModalVisible, setWasteModalVisible] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerKey, setScannerKey] = useState(0); 

  const fetchItems = useCallback(async () => {
    if (!auth || !auth.token) return;
    try {
      setLoading(true);
      const [itemsRes, suppliersRes] = await Promise.all([
        inventoryAPI.getAll(),
        supplierAPI.getAll()
      ]);
      setItems(itemsRes.data.data || []); 
      setSuppliers(suppliersRes.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSave = async (payload, id) => {
    try {
      if (id) await inventoryAPI.update(id, payload);
      else await inventoryAPI.create(payload);
      setModalVisible(false);
      setItemToEdit(null);
      fetchItems(); 
    } catch (err) {
      Alert.alert("Error", "Failed to save item.");
    }
  };

  const handleSaveWaste = async (payload) => {
    try {
      await api.post('/api/waste', payload);
      setWasteModalVisible(false);
      fetchItems(); 
    } catch (err) {
      Alert.alert("Error", err.response?.data?.msg || "Failed to log waste.");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await inventoryAPI.delete(id); fetchItems(); } 
        catch (e) { Alert.alert("Error", "Failed to delete item."); }
      }}
    ]);
  };

  const openAddModal = () => {
    if (searchQuery) {
      setItemToEdit({ sku: searchQuery });
    } else {
      setItemToEdit(null);
    }
    setModalVisible(true);
  };
  
  const openEditModal = (item) => { setItemToEdit(item); setModalVisible(true); };

  const handleBarCodeScanned = ({ data }) => {
    setScannerVisible(false);
    setSearchQuery(data);
  };

  const handleOpenScanner = () => {
    setScannerKey(prev => prev + 1); 
    setScannerVisible(true);
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const lowerQuery = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.sku.toLowerCase().includes(lowerQuery)
    );
  }, [items, searchQuery]);

  const getExpiryWarning = (item) => {
    if (!item.expiresInDays) return null;
    const expiryDate = new Date(item.dateReceived);
    expiryDate.setDate(expiryDate.getDate() + item.expiresInDays);
    const today = new Date();
    today.setHours(23, 59, 59, 999); 
    const daysRemaining = (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining <= 0) return { icon: 'alert-circle', color: 'red', text: 'Expired' };
    if (daysRemaining <= 7) return { icon: 'alert', color: '#f39c12', text: `Expires in ${Math.ceil(daysRemaining)}d` };
    return null;
  };

  const renderRightActions = (progress, dragX, id) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
    });

    return (
      <TouchableOpacity onPress={() => handleDelete(id)} style={styles.deleteActionContainer}>
        <View style={styles.deleteActionView}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const isLowStock = item.quantity < LOW_STOCK_THRESHOLD;
    const expiryWarning = getExpiryWarning(item);
    const description = `Qty: ${item.quantity} ${item.unit} ${item.supplier?.name ? ' | ' + item.supplier.name : ''}`;

    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item._id)}
        overshootRight={false}
      >
        <List.Item
          title={`${item.name} (${item.sku})`}
          description={description}
          titleStyle={styles.itemName}
          descriptionStyle={isLowStock ? styles.itemQuantityLow : styles.itemQuantityOk}
          onPress={() => openEditModal(item)}
          style={styles.listItem}
          right={(props) => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {expiryWarning && (
                <IconButton
                  {...props}
                  icon={expiryWarning.icon}
                  iconColor={expiryWarning.color}
                  size={24}
                  style={{ margin: 0 }}
                />
              )}
            </View>
          )}
        />
      </Swipeable>
    );
  };

  if (loading && !items.length) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <ItemFormModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSave} item={itemToEdit} suppliers={suppliers} />
        
        <BarcodeScannerModal
          key={scannerKey} 
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleBarCodeScanned}
        />

        <LogWasteModal visible={wasteModalVisible} onClose={() => setWasteModalVisible(false)} onSave={handleSaveWaste} inventoryItems={items} />
        <SupplierManagerModal visible={supplierModalVisible} onClose={() => setSupplierModalVisible(false)} onSupplierCreated={(newSupplier) => { setSuppliers(prev => [...prev, newSupplier]); fetchItems(); }} />
        
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={fetchItems}>Retry</Button>
          </View>
        )}
        
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          onRefresh={fetchItems}
          refreshing={loading}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.searchRow}>
                <Searchbar placeholder="Search by name or SKU..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
                <IconButton icon="barcode-scan" size={28} onPress={handleOpenScanner} style={styles.scanButton} />
              </View>
              <View style={styles.buttonRowHeader}>
                <Button icon="plus" mode="contained" onPress={openAddModal} style={styles.headerButton}>Add Item</Button>
                <Button icon="trash-can" mode="outlined" onPress={() => setWasteModalVisible(true)} style={styles.headerButton}>Log Waste</Button>
                <Button icon="history" mode="outlined" onPress={() => router.push('/(tabs)/waste')} style={styles.headerButton}>History</Button>
                <Button icon="domain" mode="outlined" onPress={() => setSupplierModalVisible(true)} style={styles.headerButton}>Suppliers</Button>
              </View>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Title style={{textAlign: 'center'}}>No Items Found</Title>
                  <Text style={{textAlign: 'center', color: '#666'}}>
                    {searchQuery ? 'Try a different search, or ' : ''}
                    <Text style={{color: 'blue'}} onPress={openAddModal}>add a new item</Text>.
                  </Text>
                </Card.Content>
              </Card>
            ) : null
          }
          contentContainerStyle={{ padding: 10 }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const LOW_STOCK_THRESHOLD = 10;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  emptyCard: { margin: 10 },
  errorBox: { padding: 10, alignItems: 'center' },
  errorText: { color: 'red', textAlign: 'center', padding: 10 },
  headerContainer: { paddingHorizontal: 5, paddingTop: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1 },
  scanButton: { margin: 0, marginLeft: 5 },
  buttonRowHeader: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 10, gap: 10, flexWrap: 'wrap' },
  headerButton: { flexGrow: 1, minWidth: '45%' },
  itemName: { fontWeight: 'bold' },
  itemQuantityOk: { color: 'green' },
  itemQuantityLow: { color: 'red', fontWeight: 'bold' },
  modalView: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10, maxHeight: '100%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#ffffff', marginBottom: 10 },
  pickerButtonContent: { height: 56, justifyContent: 'center' },
  pickerButtonLabel: { color: '#1C1B1F', fontWeight: 'normal', marginLeft: 14, textAlign: 'left' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  scannerCloseButton: { position: 'absolute', bottom: 50, alignSelf: 'center' },
  scannerTarget: { position: 'absolute', top: '30%', bottom: '30%', left: '10%', right: '10%', borderColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 2, borderRadius: 10 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  scanOverlayText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  scanOverlayData: { color: 'white', fontSize: 24, fontWeight: 'bold', marginVertical: 20 },
  listItem: { backgroundColor: 'white', },
  deleteActionContainer: { width: 80, },
  deleteActionView: { backgroundColor: '#dd2c00', flex: 1, justifyContent: 'center', alignItems: 'center', },
  deleteActionText: { color: 'white', fontWeight: 'bold', },
});

export default InventoryPage;