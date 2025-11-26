import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { userAPI } from '../services/api'; 
import { AuthContext } from './authContext.tsx'; 

import {
  Button,
  TextInput,
  Modal,
  Portal,
  Title,
  List,
  IconButton,
  Menu,
  Card,
  useTheme,
} from 'react-native-paper';

const UserFormModal = ({ visible, onClose, onSave, editingUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: '',
        role: editingUser.role || 'employee',
      });
    } else {
      setFormData({ name: '', email: '', password: '', role: 'employee' });
    }
  }, [editingUser, visible]);

  const handleChange = (name, value) => {
    setFormData(f => ({ ...f, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      return Alert.alert("Error", "Name and Email are required.");
    }
    
    try {
      if (editingUser) {
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        onSave(updateData, editingUser._id);
      } else {
        if (!formData.password) {
          return Alert.alert("Error", "Password is required for new users.");
        }
        onSave(formData, null);
      }
    } catch (err) {
      console.error("Save User Error:", err.response?.data || err);
      Alert.alert("Error", "Failed to save user. Email may be taken.");
    }
  };
  
  const openRoleMenu = () => setRoleMenuVisible(true);
  const closeRoleMenu = () => setRoleMenuVisible(false);
  const selectRole = (role) => {
    handleChange('role', role);
    closeRoleMenu();
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onClose} 
        contentContainerStyle={styles.modalView}
      >
        <ScrollView>
          <Title style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Create New User'}</Title>
          
          <TextInput
            label="Name"
            mode="outlined"
            style={styles.input}
            value={formData.name}
            onChangeText={(val) => handleChange('name', val)}
          />
          <TextInput
            label="Email"
            mode="outlined"
            style={styles.input}
            value={formData.email}
            onChangeText={(val) => handleChange('email', val)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          {!editingUser && (
            <TextInput
              label="Password"
              mode="outlined"
              style={styles.input}
              value={formData.password}
              onChangeText={(val) => handleChange('password', val)}
              secureTextEntry
            />
          )}
          
          <Menu
            visible={roleMenuVisible}
            onDismiss={closeRoleMenu}
            anchor={
              <Button
                mode="outlined"
                onPress={openRoleMenu}
                style={styles.input} 
                labelStyle={styles.pickerButtonLabel}
                contentStyle={styles.pickerButtonContent}
              >
                {`Role: ${formData.role}`}
              </Button>
            }
          >
            <Menu.Item onPress={() => selectRole('employee')} title="Employee" />
            <Menu.Item onPress={() => selectRole('manager')} title="Manager" />
            <Menu.Item onPress={() => selectRole('admin')} title="Admin" />
          </Menu>

          <View style={styles.buttonRow}>
            <Button mode="text" onPress={onClose}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const UserManagementPage = () => {
  const auth = useContext(AuthContext);
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      setUsers(Array.isArray(response.data.data) ? response.data.data : []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch users');
      setUsers([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = (id) => {
    if (auth?.user?._id === id) {
      Alert.alert("Error", "You cannot delete your own account.");
      return;
    }
    
    Alert.alert("Delete User", "Are you sure you want to delete this user?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await userAPI.deleteUser(id);
          fetchUsers(); 
        } catch (err) {
          Alert.alert("Error", "Failed to delete user.");
        }
      }}
    ]);
  };

  const handleSave = async (payload, id) => {
    try {
      if (id) {
        await userAPI.updateUser(id, payload);
      } else {
        await userAPI.createUser(payload);
      }
      setModalVisible(false); 
      fetchUsers(); 
    } catch (err) {
      console.error("Save User Error:", err.response?.data || err);
      Alert.alert("Error", "Failed to save user. Email may be taken.");
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setModalVisible(true);
  };
  
  const openEditModal = (user) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const renderUserItem = ({ item }) => (
    <List.Item
      style={styles.listItem}
      title={item.name}
      description={`${item.email} (${item.role})`}
      titleStyle={styles.itemName}
      descriptionStyle={styles.itemEmail}
      onPress={() => openEditModal(item)}
      left={() => <List.Icon icon="account" color={theme.colors.primary} />}
      right={() => (
        <IconButton
          icon="delete"
          iconColor="#e74c3c"
          onPress={() => handleDelete(item._id)}
        />
      )}
    />
  );

  if (loading && !users.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <UserFormModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        editingUser={editingUser}
      />

      {error && (
         <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={fetchUsers}>Retry</Button>
        </View>
      )}

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={item => item._id}
        onRefresh={fetchUsers}
        refreshing={loading}
        ListHeaderComponent={
          <Button
            icon="plus"
            mode="contained"
            onPress={openAddModal}
            style={styles.addButton}
          >
            Add New User
          </Button>
        }
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.emptyCard}>
              <Card.Title title="No users found." />
            </Card>
          ) : null
        }
        contentContainerStyle={{ padding: 10 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorBox: {
    padding: 10,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  addButton: {
    margin: 10,
  },
  emptyCard: {
    margin: 10,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
    paddingLeft: 15,
  },
  itemName: {
    fontWeight: 'bold',
  },
  itemEmail: {
    color: '#555',
  },
  modalView: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    maxHeight: '100%',
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

export default UserManagementPage;