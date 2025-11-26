import React, { useContext, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Title,
  Button,
  List,
  Text,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OrderContext } from '@/components/OrderContext';

export default function CartModal() {
  const router = useRouter();
  const order = useContext(OrderContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  const {
    orderItems,
    removeFromOrder,
    clearOrder,
    submitOrder,
    itemCount,
    totalPrice,
  } = order;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await submitOrder();
    setIsSubmitting(false);
    
    if (success) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Current Order</Title>
        <IconButton icon="close" onPress={() => router.back()} />
      </View>

      <FlatList
        data={orderItems}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.name} (x${item.quantity})`}
            description={`£${(item.price * item.quantity).toFixed(2)}`}
            right={() => (
              <IconButton
                icon="minus-circle"
                iconColor="#e74c3c"
                onPress={() => removeFromOrder(item._id)}
              />
            )}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text>Your order is empty.</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <Divider />}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total ({itemCount} items):</Text>
          <Text style={styles.totalPrice}>£{totalPrice.toFixed(2)}</Text>
        </View>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={isSubmitting || itemCount === 0}
          loading={isSubmitting}
          icon="check"
        >
          Complete Sale
        </Button>
        <Button
          mode="outlined"
          onPress={clearOrder}
          disabled={isSubmitting || itemCount === 0}
          style={{ marginTop: 10 }}
        >
          Clear Order
        </Button>
      </View>
    </SafeAreaView>
  );
}

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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});