import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from './authContext';
import api from '../services/api';
import { TextInput, Button, Title } from 'react-native-paper'; 

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useContext(AuthContext);
  const router = useRouter();

  if (!auth) {
    return null;
  }
  const { login } = auth;

  const handleRegister = async () => {
    setError('');
    
    if (!name || !email || !password) {
      const errorMsg = 'Please fill in all fields.';
      setError(errorMsg);
      Alert.alert('Registration Error', errorMsg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { 
        name, 
        email, 
        password,
      });
      login(res.data.token, res.data.user); 
      
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Registration failed';
      setError(errorMsg);
      Alert.alert('Registration Error', errorMsg);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Create Account</Title>
      
      <TextInput
        label="Name"
        mode="outlined"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      <TextInput
        label="Email"
        mode="outlined"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        label="Password"
        mode="outlined"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <Button 
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Register
      </Button>
      
      <View style={styles.loginLinkContainer}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    padding: 5,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#306eff',
    fontWeight: 'bold',
  },
});

export default RegisterPage;