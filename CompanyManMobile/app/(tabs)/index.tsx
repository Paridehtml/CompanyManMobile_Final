import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  Title,
  Paragraph,
  useTheme,
  Text,
  Button,
  List,
  Icon, 
} from 'react-native-paper';
import api from '@/services/api'; 
import { AuthContext } from '@/components/authContext'; 
import { useRouter } from 'expo-router'; 

interface SummaryData {
  periodRevenue: number;
  totalSalesForPeriod: number;
  bestSellingDish: string;
  bestSellingDishCount: number;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  status: string;
}

interface Shift {
  _id: string;
  user: { name: string, _id: string };
  date: string;
  startTime: string;
  endTime: string;
  role: string;
}

const ManagerDashboard = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const auth = useContext(AuthContext);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryRes = await api.get('/api/sales/summary?period=today');
      setSummary(summaryRes.data.data);
      
      const notifyRes = await api.get('/api/notifications/my');
      setNotifications(notifyRes.data.data.slice(0, 3) || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Could not load all dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth?.loading || !auth?.token) {
        return; 
    }
    fetchData();
  }, [fetchData, auth?.token, auth?.loading]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} />
      }
    >
      {error && (
        <Card style={styles.card}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.error }}>{error}</Paragraph>
            <Button onPress={fetchData}>Retry</Button>
          </Card.Content>
        </Card>
      )}

      <Title style={styles.subHeader}>Today's Snapshot</Title>
      {loading && !summary && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}
      
      {summary && (
        <View style={styles.cardRow}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Revenue</Title>
              <Paragraph style={styles.cardContent}>
                £{summary.periodRevenue.toFixed(2)}
              </Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Orders</Title>
              <Paragraph style={styles.cardContent}>
                {summary.totalSalesForPeriod}
              </Paragraph>
            </Card.Content>
          </Card>
          <Card style={styles.fullCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Best-Seller</Title>
              <Paragraph style={styles.cardContent}>
                {summary.bestSellingDish || 'N/A'}
                {summary.bestSellingDishCount > 0 && ` (${summary.bestSellingDishCount} sold)`}
              </Paragraph>
            </Card.Content>
          </Card>
        </View>
      )}

      <Title style={styles.subHeader}>What's New</Title>
      {loading && !summary && <ActivityIndicator size="small" />}
      
      {!loading && notifications.length === 0 && (
        <Card style={styles.fullCard}>
          <Card.Content>
            <Paragraph>No new alerts. All systems normal.</Paragraph>
          </Card.Content>
        </Card>
      )}

      {notifications.map((notif) => (
        <List.Item
          key={notif._id}
          style={styles.notificationItem}
          title={notif.title}
          description={notif.message}
          descriptionNumberOfLines={3}
          left={() => <List.Icon icon="alert-circle" color={theme.colors.error} />}
        />
      ))}

      <Title style={styles.subHeader}>Quick Actions</Title>
      
      <Button 
        mode="contained" 
        icon="chart-bar" 
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        onPress={() => router.push('/(tabs)/sales')}
      >
        View Sales Report
      </Button>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button 
          mode="outlined" 
          icon="archive" 
          style={[styles.actionButton, { width: '48%' }]}
          contentStyle={styles.actionButtonContent}
          onPress={() => router.push('/(tabs)/inventory')}
        >
          Inventory
        </Button>
        
        <Button 
          mode="outlined" 
          icon="calendar-edit" 
          style={[styles.actionButton, { width: '48%' }]}
          contentStyle={styles.actionButtonContent}
          onPress={() => router.push('/(tabs)/shifts')}
        >
          Manage Shifts
        </Button>
      </View>
    </ScrollView>
  );
};

const EmployeeDashboard = () => {
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const router = useRouter();
  const auth = useContext(AuthContext); 

  const fetchEmployeeData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/shifts/next-upcoming'); 
      setNextShift(res.data.data); 

      const notifRes = await api.get('/api/notifications/my');
      const recentNotifs = notifRes.data.data.slice(0, 3);
      setMyNotifications(recentNotifs);

    } catch (err) {
      console.error('Failed to fetch employee data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth?.loading || !auth?.token) {
        return; 
    }
    fetchEmployeeData();
  }, [fetchEmployeeData, auth?.token, auth?.loading]);

  const formatShiftTime = (shift: Shift) => {
    try {
      // 1. Parse the main date
      const shiftDate = new Date(shift.date);
      const combineDateAndTime = (baseDate: Date, timeString: string) => {
        if (!timeString) return baseDate;
        const [hours, minutes] = timeString.split(':').map(Number);
        const newDate = new Date(baseDate);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
      };

      const start = combineDateAndTime(shiftDate, shift.startTime);
      const end = combineDateAndTime(shiftDate, shift.endTime);

      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
      const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

      const dateStr = start.toLocaleDateString(undefined, dateOptions);
      const timeStr = `${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleTimeString(undefined, timeOptions)}`;
      
      return { date: dateStr, time: timeStr };
    } catch (e) {
      return { date: 'Invalid Date', time: 'Check Schedule' };
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchEmployeeData} />
      }
    >
      <Title style={styles.subHeader}>Your Next Shift</Title>
      
      {loading && <ActivityIndicator size="large" style={{ marginVertical: 20 }} />}

      {!loading && (
        <Card style={styles.fullCard}>
          <Card.Content>
            {nextShift ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon source="calendar-clock" size={30} color={theme.colors.primary} />
                  <Title style={[styles.cardTitle, { marginLeft: 10, fontSize: 18 }]}>
                    {formatShiftTime(nextShift).date}
                  </Title>
                </View>
                <Paragraph style={[styles.cardContent, { fontSize: 20, marginTop: 10 }]}>
                  {formatShiftTime(nextShift).time}
                </Paragraph>
              </>
            ) : (
              <Paragraph style={styles.cardContent}>
                You have no upcoming shifts.
              </Paragraph>
            )}
          </Card.Content>
        </Card>
      )}

      {myNotifications.length > 0 && (
        <>
          <Title style={styles.subHeader}>Notifications</Title>
          {myNotifications.map((notif) => (
            <Card key={notif._id} style={[styles.fullCard, { marginBottom: 8, backgroundColor: 'white' }]}>
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                   <Icon source="bell-ring" size={20} color={theme.colors.primary} />
                   <Title style={{ fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>{notif.title}</Title>
                </View>
                <Paragraph>{notif.message}</Paragraph>
              </Card.Content>
            </Card>
          ))}
        </>
      )}
      
      <Title style={styles.subHeader}>Quick Actions</Title>
      <Button 
        mode="contained" 
        icon="calendar" 
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        onPress={() => router.push('/(tabs)/shifts')}
      >
        View Full Schedule
      </Button>
      <Button 
        mode="outlined" 
        icon="book-open-variant" 
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        onPress={() => router.push('/(tabs)/menu')}
      >
        View Menu
      </Button>
    </ScrollView>
  );
};

const HomePage = () => {
  const auth = useContext(AuthContext);
  const user = auth?.user;
  
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Title style={styles.header}>Welcome, {user?.name || 'User'}</Title>
      </View>

      {isManagerOrAdmin ? <ManagerDashboard /> : <EmployeeDashboard />}
      
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5ff', 
  },
  scrollContainer: {
    padding: 16,
    paddingTop: 0, 
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', 
    marginBottom: 10,
  },
  fullCard: {
    width: '100%', 
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    paddingLeft: 15,
  },
  actionButton: {
    marginVertical: 6,
  },
  actionButtonContent: {
    height: 50,
  },
});

export default HomePage;