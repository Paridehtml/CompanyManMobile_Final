import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Card,
  Title,
  List,
  useTheme,
  Paragraph,
  Button,
  Menu,
  Divider,
} from 'react-native-paper';
import api from '@/services/api'; 
import { DatePickerModal, registerTranslation, en } from 'react-native-paper-dates';
import type { CalendarDate } from 'react-native-paper-dates'; 

registerTranslation('en', en);

interface SummaryData {
  periodRevenue: number;
  periodProfit?: number;
  periodMargin?: number;
  totalSalesForPeriod: number;
  bestSellingDish: string;
  bestSellingDishCount: number;
  bestSellingDishId: string | null;
}

interface CostData {
  foodCost: number;
  profit: number;
  profitMargin: number;
}

interface OrderItem {
  dishName: string;
  price: number;
}

interface OrderData {
  _id: string;
  orderNumber: number;
  items: OrderItem[];
  totalAmount: number;
  soldBy: { name: string };
  createdAt: string;
}

interface OrderCostData {
  orderId: string;
  totalAmount: number;
  totalFoodCost: number;
  totalProfit: number;
  missingCostData: boolean;
}

interface GroupedItem {
  dishName: string;
  price: number;
  quantity: number;
}

type Period = 'today' | 'last_7_days' | 'this_month' | 'this_year' | 'custom';

interface DateRange {
  startDate: Date | undefined;
  endDate: Date | undefined;
}

const periodLabels: Record<Period, string> = {
  'today': 'Today',
  'last_7_days': 'Last 7 Days',
  'this_month': 'This Month',
  'this_year': 'This Year',
  'custom': 'Custom Range',
};

const SalesPage = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [bestSellerDetails, setBestSellerDetails] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); 
  const theme = useTheme();
  
  const [period, setPeriod] = useState<Period>('today');
  const [menuVisible, setMenuVisible] = useState(false);
  const [range, setRange] = useState<DateRange>({ startDate: undefined, endDate: undefined });
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedOrderCost, setExpandedOrderCost] = useState<OrderCostData | null>(null);
  const [isOrderCostLoading, setIsOrderCostLoading] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);
  
  const selectPeriod = (newPeriod: Period) => {
    closeMenu();
    if (newPeriod === 'custom') {
      setDatePickerVisible(true);
    } else {
      setPeriod(newPeriod);
      setRange({ startDate: undefined, endDate: undefined });
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBestSellerDetails(null);
    
    try {
      let summaryUrl = `/api/sales/summary?period=${period}`;
      let transactionsUrl = `/api/sales?period=${period}`;
      
      if (period === 'custom' && range.startDate && range.endDate) {
        const startDateStr = range.startDate.toISOString();
        const endDateStr = range.endDate.toISOString();
        summaryUrl += `&startDate=${startDateStr}&endDate=${endDateStr}`;
        transactionsUrl += `&startDate=${startDateStr}&endDate=${endDateStr}`;
      }

      const summaryRes = await api.get(summaryUrl);
      const transactionsRes = await api.get(transactionsUrl);
      
      const summaryData: SummaryData = summaryRes.data.data;
      setSummary(summaryData);
      setOrders(transactionsRes.data.data);

      if (summaryData && summaryData.bestSellingDishId) {
        try {
          const costRes = await api.get(`/api/menu/${summaryData.bestSellingDishId}/cost`);
          setBestSellerDetails(costRes.data.data);
        } catch (costErr) {
          console.error("Failed to fetch best-seller cost", costErr);
        }
      }
      
    } catch (err) {
      setError('Failed to fetch sales data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const onConfirmRange = ({ startDate, endDate }: { startDate: CalendarDate; endDate: CalendarDate; }) => {
    setDatePickerVisible(false);
    setRange({ startDate: new Date(startDate), endDate: new Date(endDate) }); 
    setPeriod('custom');
  };

  const handleAccordionPress = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setExpandedOrderCost(null);
      return;
    }

    setExpandedOrderId(orderId);
    setExpandedOrderCost(null);
    setIsOrderCostLoading(true);

    try {
      const res = await api.get(`/api/sales/order/${orderId}/cost`);
      setExpandedOrderCost(res.data.data);
    } catch (err) {
      console.error("Failed to fetch order cost", err);
    } finally {
      setIsOrderCostLoading(false);
    }
  };

  const renderHeader = () => {
    const getPeriodLabel = () => {
      if (period === 'custom' && range.startDate && range.endDate) {
        const startDateString = range.startDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endDateString = range.endDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
        return `${startDateString} - ${endDateString}`;
      }
      return periodLabels[period];
    };

    return (
      <View style={styles.headerContainer}>
        <View style={styles.menuAnchor}>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <Button mode="outlined" onPressIn={openMenu} icon="calendar-range">
                {getPeriodLabel()}
              </Button>
            }
          >
            <Menu.Item onPress={() => selectPeriod('today')} title="Today" />
            <Menu.Item onPress={() => selectPeriod('last_7_days')} title="Last 7 Days" />
            <Menu.Item onPress={() => selectPeriod('this_month')} title="This Month" />
            <Menu.Item onPress={() => selectPeriod('this_year')} title="This Year" />
            <Menu.Item onPress={() => selectPeriod('custom')} title="Custom Range..." />
          </Menu>
        </View>
        
        <View style={styles.cardRow}>
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.cardTitle}>Revenue</Title>
                {/* CHANGED: $ to £ */}
                <Paragraph style={styles.cardContent}>
                  £{summary?.periodRevenue?.toFixed(2) || '0.00'}
                </Paragraph>
                
                {summary && summary.periodMargin !== undefined && (
                  <Text style={{ color: 'green', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                    {Number(summary.periodMargin).toFixed(1)}% Margin
                  </Text>
                )}
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.cardTitle}>Total Orders</Title>
                <Paragraph style={styles.cardContent}>
                  {summary?.totalSalesForPeriod || '0'}
                </Paragraph>
                {summary && summary.periodMargin !== undefined && (
                   <Text style={{ color: 'transparent', fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>
                      Spacer Text
                   </Text>
                )}
              </Card.Content>
            </Card>
        </View>
        
        <Card style={styles.fullCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Best-Seller</Title>
            <Paragraph style={styles.cardContent}>
              {summary?.bestSellingDish || 'N/A'} 
              {summary && summary.bestSellingDishCount > 0 && ` (${summary.bestSellingDishCount} sold)`}
            </Paragraph>
            
            {bestSellerDetails ? (
              <Paragraph style={[styles.profitMargin, { color: theme.colors.primary }]}>
                {/* CHANGED: $ to £ */}
                Profit Margin: {bestSellerDetails.profitMargin.toFixed(0)}% 
                (Cost: £{bestSellerDetails.foodCost.toFixed(2)})
              </Paragraph>
            ) : (
              summary && !!summary.bestSellingDishId && (
                <ActivityIndicator size="small" style={{alignSelf: 'flex-start'}} />
              )
            )}
            
          </Card.Content>
        </Card>
        
        <Title style={styles.listTitle}>All Orders</Title>
      </View>
    );
  };

  const renderOrder = ({ item }: { item: OrderData }) => {
    const groupedItems = item.items.reduce((acc, dish) => {
      if (acc[dish.dishName]) {
        acc[dish.dishName].quantity += 1;
      } else {
        acc[dish.dishName] = {
          dishName: dish.dishName,
          price: dish.price,
          quantity: 1,
        };
      }
      return acc;
    }, {} as Record<string, GroupedItem>);

    const isExpanded = expandedOrderId === item._id;

    return (
      <List.Accordion
        style={styles.listItem}
        // CHANGED: $ to £
        title={`Order #${item.orderNumber} - £${(item.totalAmount || 0).toFixed(2)}`}
        description={`Sold by: ${item.soldBy?.name || 'Unknown'} at ${new Date(item.createdAt).toLocaleTimeString()}`}
        left={() => <List.Icon icon="receipt" color={theme.colors.primary} />}
        onPress={() => handleAccordionPress(item._id)}
        expanded={isExpanded}
      >
        {Object.values(groupedItems).map((dish: GroupedItem, index: number) => (
          <List.Item
            key={index}
            title={`${dish.dishName} (x${dish.quantity})`}
            // CHANGED: $ to £
            description={`£${(dish.price * dish.quantity).toFixed(2)}`}
            style={styles.subItem}
            left={() => <List.Icon icon="circle-small" />}
          />
        ))}
        
        {isExpanded && (
          <View>
            <Divider />
            {isOrderCostLoading && <ActivityIndicator style={{ marginVertical: 10 }} />}
            
            {expandedOrderCost && expandedOrderCost.orderId === item._id && (
              <>
                <List.Item
                  // CHANGED: $ to £
                  title={`Total Food Cost: £${expandedOrderCost.totalFoodCost.toFixed(2)}`}
                  style={styles.subItem}
                  titleStyle={styles.costText}
                  left={() => <List.Icon icon="cash" />}
                />
                <List.Item
                  title={`Total Profit: £${expandedOrderCost.totalProfit.toFixed(2)}`}
                  style={styles.subItem}
                  titleStyle={[styles.costText, { color: theme.colors.primary }]}
                  left={() => <List.Icon icon="chart-line" color={theme.colors.primary} />}
                />
                {expandedOrderCost.missingCostData && (
                  <List.Item
                    title="Profit calculation is incomplete."
                    description="Missing cost data for one or more items."
                    descriptionStyle={{color: 'orange'}}
                    style={styles.subItem}
                    left={() => <List.Icon icon="alert" color="orange" />}
                  />
                )}
              </>
            )}
          </View>
        )}
      </List.Accordion>
    );
  };

  if (loading && !orders.length) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {error && (
        <View style={styles.centered}>
          <Text style={{ color: 'red' }}>{error}</Text>
          <Button onPress={fetchData}>Retry</Button>
        </View>
      )}
      
      <DatePickerModal
        locale="en"
        mode="range"
        visible={datePickerVisible}
        onDismiss={() => setDatePickerVisible(false)}
        startDate={range.startDate}
        endDate={range.endDate}
        onConfirm={onConfirmRange}
      />
      
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        onRefresh={fetchData}
        refreshing={loading}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <Card style={styles.emptyCard}>
              <Card.Title title="No orders recorded for this period." />
            </Card>
          ) : null
        }
        contentContainerStyle={styles.listContent}
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
  },
  headerContainer: {
    padding: 8,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  menuAnchor: {
    width: '100%',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  card: {
    width: '48%', 
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
  profitMargin: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  listTitle: {
    width: '100%',
    marginTop: 10,
    marginLeft: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  subItem: {
    paddingLeft: 40,
    backgroundColor: '#fdfdfd',
  },
  costText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyCard: {
    margin: 10,
    padding: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default SalesPage;