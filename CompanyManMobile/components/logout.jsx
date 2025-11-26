import React, { useContext } from 'react';
import { Button, Alert, StyleSheet, View } from 'react-native';
import { AuthContext } from './authContext'; 

const LogoutButton = () => {
  const auth = useContext(AuthContext);
  if (!auth) {
    return null; 
  }
  
  const { logout } = auth;

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Logout", 
          onPress: () => logout(),
          style: "destructive" 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} color="#e74c3c" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 10,
  }
});

export default LogoutButton;