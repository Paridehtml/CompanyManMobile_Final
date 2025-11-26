import React, { createContext, useState } from 'react';
import { Alert } from 'react-native';
import api from '@/services/api';

interface Dish {
  _id: string;
  name: string;
  price: number;
}

interface CartItem extends Dish {
  quantity: number;
}

interface OrderContextType {
  orderItems: CartItem[]; 
  addToOrder: (dish: Dish) => void;
  removeFromOrder: (dishId: string) => void;
  clearOrder: () => void;
  submitOrder: () => Promise<boolean>;
  itemCount: number;
  totalPrice: number;
}

export const OrderContext = createContext<OrderContextType | null>(null);

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  const addToOrder = (dish: Dish) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item._id === dish._id);

      if (existingItem) {
        return prevItems.map(item => 
          item._id === dish._id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { ...dish, quantity: 1 }];
      }
    });
  };

  const removeFromOrder = (dishId: string) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item._id === dishId);

      if (!existingItem) return prevItems;

      if (existingItem.quantity > 1) {
        return prevItems.map(item =>
          item._id === dishId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prevItems.filter(item => item._id !== dishId);
      }
    });
  };

  const clearOrder = () => {
    setOrderItems([]);
  };

  const submitOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert("Error", "Your order is empty.");
      return false;
    }

    try {
      const dishIds = orderItems.reduce((acc, item) => {
        for (let i = 0; i < item.quantity; i++) {
          acc.push(item._id);
        }
        return acc;
      }, [] as string[]);
      
      const res = await api.post('/api/sales', { dishIds });
      
      Alert.alert("Success!", `Sale recorded for $${res.data.total.toFixed(2)}`);
      clearOrder(); 
      return true;
      
    } catch (err) {
      const errorMsg = (err as any).response?.data?.msg || "Could not process order.";
      Alert.alert("Sale Failed", errorMsg);
      return false;
    }
  };

  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <OrderContext.Provider
      value={{
        orderItems,
        addToOrder,
        removeFromOrder,
        clearOrder,
        submitOrder,
        itemCount,
        totalPrice,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};