import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Button,
  TouchableOpacity,
  Alert,
  Pressable, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api'; 
import { AuthContext } from './authContext'; 
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const NotificationItem = ({ item, onDelete, formatDate, getCardStyle }) => {
  const [expanded, setExpanded] = useState(false);

  const renderRightActions = (progress, dragX) => {
    return (
      <TouchableOpacity onPress={() => onDelete(item._id)} style={styles.deleteActionContainer}>
        <View style={styles.deleteActionView}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      <Pressable 
        onPress={() => setExpanded(!expanded)}
        style={[styles.cardBase, getCardStyle(item.type)]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
        
        <Text 
          style={styles.cardMessage} 
          numberOfLines={expanded ? undefined : 2}
          ellipsizeMode="tail"
        >
          {item.message}
        </Text>
        
        <Text style={styles.cardFooter}>
          {formatDate(item.createdAt)}
        </Text>
      </Pressable>
    </Swipeable>
  );
};

const NotificationPage = () => {
  const auth = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getCardStyle = (type) => {
    switch (type) {
      case 'stock_alert': return styles.cardStockAlert; 
      case 'marketing_suggestion': return styles.cardMarketingSuggestion; 
      default: return styles.cardDefault;
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!auth || !auth.token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/notifications/my');
      setNotifications(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = (id) => {
    api.delete(`/api/notifications/${id}`)
      .then(() => {
        setNotifications(prev => prev.filter(n => n._id !== id));
      })
      .catch(err => {
        Alert.alert("Error", "Failed to delete notification.");
        fetchNotifications(); 
      });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }
  
  if (error) {
     return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={fetchNotifications} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem 
              item={item} 
              onDelete={handleDelete} 
              formatDate={formatDate}
              getCardStyle={getCardStyle}
            />
          )}
          keyExtractor={item => item._id}
          onRefresh={fetchNotifications}
          refreshing={loading}
          ListHeaderComponent={<Text style={styles.mainTitle}>Notifications</Text>}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{color: '#666'}}>No new notifications.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 10 }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    padding: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
  cardBase: {
    padding: 15, 
    borderRadius: 8, 
    borderLeftWidth: 5,
    backgroundColor: '#f9f9f9', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10, 
    minHeight: 80, 
    justifyContent: 'center',
  },
  cardStockAlert: { borderLeftColor: '#e74c3c' },
  cardMarketingSuggestion: { borderLeftColor: '#2ecc71' },
  cardDefault: { borderLeftColor: '#ccc' },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1, 
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
    marginLeft: 10,
  },
  cardMessage: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
    lineHeight: 20, 
  },
  cardFooter: {
    fontSize: 10,
    color: '#999',
    marginTop: 10,
    textAlign: 'right',
  },
  deleteActionContainer: {
    width: 80,
    marginBottom: 10, 
  },
  deleteActionView: {
    backgroundColor: '#dd2c00',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  deleteActionText: {
    color: 'white',
    fontWeight: 'bold',
    padding: 10,
  },
});

export default NotificationPage;