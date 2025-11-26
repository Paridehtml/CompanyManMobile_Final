import React, { useState, useContext } from 'react';
import { View, StyleSheet, Alert, Text, Image } from 'react-native'; 
import { useRouter } from 'expo-router';
import { AuthContext } from './authContext';
import api from '../services/api';
import { TextInput, Button, Title } from 'react-native-paper'; 

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  
  const { login } = useContext(AuthContext);
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      
      // Save the token and user data
      login(res.data.token, res.data.user); 
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Login failed';
      setError(errorMsg);
      Alert.alert('Login Error', errorMsg);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Title style={styles.title}>Login</Title>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        style={styles.input}
      />
      
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Button 
        mode="contained" 
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Login
      </Button>
      
      <View style={styles.registerLink}>
        <Text>Don't have an account? </Text>
        <Text style={styles.link} onPress={() => router.push('/register')}>
          Register
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120, 
    height: 120,
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
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: 'blue',
    fontWeight: 'bold',
  },
});

export default LoginPage;