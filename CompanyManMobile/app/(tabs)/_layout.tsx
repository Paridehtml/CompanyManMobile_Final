import React, { useContext, useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router'; 
import { Modal, View, Text, Button, StyleSheet, Pressable, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { IconButton, List, useTheme, Divider, Badge } from 'react-native-paper'; 

import { AuthContext } from '@/components/authContext'; 
import { OrderContext } from '@/components/OrderContext';
import api from '@/services/api'; 

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  targetId?: string;
  status: string;
}

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function HeaderCartButton() {
  const router = useRouter();
  const order = useContext(OrderContext);
  if (!order) return null;
  const { itemCount } = order;
  return (
    <View style={{ marginRight: 10 }}> 
      <IconButton
        icon="cart"
        iconColor="black"
        onPress={() => router.push('/modal')}
      />
      {itemCount > 0 && (
        <Badge style={styles.cartBadge} size={20}>{itemCount}</Badge>
      )}
    </View>
  );
}

function HeaderMenu() {
  const router = useRouter();
  const auth = useContext(AuthContext);
  const theme = useTheme(); 
  const [modalVisible, setModalVisible] = useState(false);
  const openMenu = () => setModalVisible(true);
  const closeMenu = () => setModalVisible(false);
  const user = auth?.user;
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role ==='admin';
  const { logout } = auth || {};
  const navigate = (path: string) => {
    router.push(path as any); 
    closeMenu();
  };
  
  return (
    <>
      <View style={{ marginLeft: 10 }}>
        <IconButton
          icon="menu"
          iconColor="black"
          onPressIn={openMenu}
        />
      </View>
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable style={styles.menuContainer}>
            
            <List.Item
              title="Inbox"
              left={props => <List.Icon {...props} icon="email-outline" />}
              onPress={() => navigate('/(tabs)/alerts')}
            />
            
            <List.Item
              title="Profile"
              left={props => <List.Icon {...props} icon="account-circle" />}
              onPress={() => navigate('/(tabs)/profile')}
            />
            {isAdmin && (
              <List.Item
                title="Users"
                left={props => <List.Icon {...props} icon="account-group" />}
                onPress={() => navigate('/(tabs)/users')}
              />
            )}
            <Divider />
            <List.Item
              title="Logout"
              left={props => <List.Icon {...props} icon="logout" />}
              titleStyle={{ color: theme.colors.error }}
              onPress={() => {
                if (logout) logout();
                closeMenu();
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function TabLayout() {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [unreadNotifs, setUnreadNotifs] = useState<Notification[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  useEffect(() => { 
    if (auth && auth.isAuthenticated) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/api/notifications/my');
          const unread = res.data.data.filter((n: Notification) => n.status === 'unread');
          
          if (unread.length > 0) {
            setUnreadNotifs(unread);
            setIsModalVisible(true);
          }
        } catch (err) { console.error("Failed to fetch unread notifications", err); }
      };
      fetchUnread();
    }
  }, [auth, auth?.isAuthenticated]);
  
  const handleCloseNotification = async () => {
    const currentNotification = unreadNotifs[0];
    if (!currentNotification) {
      setIsModalVisible(false);
      return;
    }
    try {
      await api.put(`/api/notifications/${currentNotification._id}/read`);
    } catch (err) { console.error("Failed to mark notification as read", err); }
    
    setUnreadNotifs(prevNotifs => {
      const remainingNotifs = prevNotifs.slice(1);
      if (remainingNotifs.length === 0) {
        setIsModalVisible(false);
      }
      return remainingNotifs;
    });
  };
  const currentNotification = unreadNotifs[0];

  return (
    <>
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{currentNotification?.title}</Text>
            <Text style={styles.modalMessage}>{currentNotification?.message}</Text>
            <Button title="Dismiss" onPress={handleCloseNotification} />
          </View>
        </View>
      </Modal>

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          headerLeft: () => <HeaderMenu />,
          headerRight: () => <HeaderCartButton />,
          headerTitleAlign: 'center',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="shifts"
          options={{
            title: 'Shifts',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color }) => <TabBarIcon name="archive" color={color} />,
            href: isManagerOrAdmin ? '/(tabs)/inventory' : null, 
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: 'Sales',
            tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
            href: isManagerOrAdmin ? '/(tabs)/sales' : null, 
          }}
        />
        
        <Tabs.Screen
          name="waste"
          options={{
            title: 'Waste',
            tabBarIcon: ({ color }) => <TabBarIcon name="trash" color={color} />,
            href: null, 
             headerLeft: () => {
              const router = useRouter(); 
              return (
                <IconButton
                  icon="arrow-left"
                  iconColor="black"
                  onPress={() => router.back()} 
                />
              );
            },
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
            href: null,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Inbox',
            tabBarIcon: ({ color }) => <TabBarIcon name="inbox" color={color} />,
            href: null,
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color }) => <TabBarIcon name="group" color={color} />,
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 8,
    position: 'absolute',
    top: 100,
    left: 10, 
    width: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
  }
});