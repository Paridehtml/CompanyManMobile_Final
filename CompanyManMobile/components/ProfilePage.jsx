import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from './authContext'; 
import api from '../services/api';

const ProfilePage = () => {
  const auth = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    position: '',
    avatar: '',
  });
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (!auth || !auth.token) return;
    try {
      setLoading(true);
      
      const response = await api.get('/api/users/profile');
      
      const userData = response.data.data; 
      setUser(userData);
      setForm({
        name: userData.name || '',
        phone: userData.phone || '',
        position: userData.position || '',
        avatar: userData.avatar || '',
      });
      setError(null);
    } catch (err) { 
      console.error(err);
      setError('Failed to fetch profile.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (name, value) => {
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setError(null);
    try {
      await api.put('/api/users/profile', form);
      
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Profile update failed');
    }
  };

  if (!auth || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={fetchProfile} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text>No user data found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {editing ? (
          <View>
            <Text style={styles.title}>Edit Profile</Text>
            {form.avatar ? (
              <Image source={{ uri: form.avatar }} style={styles.avatar} />
            ) : null}
            
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(val) => handleChange('name', val)}
              placeholder="Your Name"
            />
            
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={user.email}
              editable={false}
              style={[styles.input, styles.disabledInput]}
            />
            
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(val) => handleChange('phone', val)}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
            
            <Text style={styles.label}>Position</Text>
            <TextInput
              style={styles.input}
              value={form.position}
              onChangeText={(val) => handleChange('position', val)}
              placeholder="Your Job Title"
            />
            
            <Text style={styles.label}>Avatar URL</Text>
            <TextInput
              style={styles.input}
              value={form.avatar}
              onChangeText={(val) => handleChange('avatar', val)}
              placeholder="http://..."
            />
            
            <View style={styles.buttonRow}>
              <Button title="Save" onPress={handleSave} />
              <Button title="Cancel" color="#888" onPress={() => setEditing(false)} />
            </View>
          </View>
        ) : (
          <View>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
               <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <Text style={styles.title}>{user.name}</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone || '-'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>{user.position || '-'}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user.isAdmin ? 'Admin' : 'Employee'}</Text>
            </View>
            
            <Button title="Edit Profile" onPress={() => setEditing(true)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#eee',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    alignSelf: 'center',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});

export default ProfilePage;