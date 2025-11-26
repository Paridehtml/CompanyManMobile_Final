import React, { useState, useEffect, useCallback, useContext, useMemo, memo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { userAPI } from '../services/api';
import { AuthContext } from './authContext'; 

import {
  Button,
  TextInput,
  Modal,
  Portal,
  Title,
  TouchableRipple,
  Icon,
  useTheme,
} from 'react-native-paper';

const ShiftFormModal = ({ visible, onClose, onSave, staffList, initialData }) => {
  const [staffId, setStaffId] = useState(initialData?.staffId || '');
  const [shiftType, setShiftType] = useState(initialData?.shiftType || 'morning');
  const [notes, setNotes] = useState(initialData?.notes || '');

  useEffect(() => {
    setStaffId(initialData?.staffId || '');
    setShiftType(initialData?.shiftType || 'morning');
    setNotes(initialData?.notes || '');
  }, [initialData]);

  const handleSave = () => {
    if (!staffId) return Alert.alert('Error', 'Please select a staff member.');
    
    let startTime, endTime;
    switch(shiftType) {
      case 'morning': startTime = '09:00'; endTime = '17:00'; break;
      case 'afternoon': startTime = '12:00'; endTime = '20:00'; break;
      case 'evening': startTime = '17:00'; endTime = '01:00'; break;
      default: startTime = '09:00'; endTime = '17:00';
    }
    
    const payload = {
      ...initialData,
      staffId,
      shiftType,
      notes,
      startTime,
      endTime,
      date: new Date(initialData.date).toISOString(),
    };
    onSave(payload, initialData._id); 
  };
  
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalView}>
        <ScrollView>
          <Title style={styles.modalTitle}>{initialData?._id ? "Edit Shift" : "Add Shift"}</Title>
          <Text style={styles.label}>Staff Member:</Text>
          <ScrollView style={styles.staffPickerContainer}>
            {(staffList || []).map(user => (
              <Button key={user._id} mode={staffId === user._id ? "contained" : "outlined"} style={styles.pickerButton} onPress={() => setStaffId(user._id)}>
                {user.name}
              </Button>
            ))}
          </ScrollView>
          <Text style={styles.label}>Shift Type:</Text>
          <View style={styles.staffPicker}>
            {['morning', 'afternoon', 'evening'].map(type => (
              <Button key={type} mode={shiftType === type ? "contained" : "outlined"} style={styles.pickerButton} onPress={() => setShiftType(type)}>
                {type}
              </Button>
            ))}
          </View>
          <Text style={styles.label}>Notes:</Text>
          <TextInput label="Optional notes" mode="outlined" style={styles.input} value={notes} onChangeText={setNotes} />
          <View style={styles.buttonRow}>
            <Button mode="text" onPress={onClose}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Save</Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const ShiftItem = memo(({ item, isManagerOrAdmin, onEdit, onDelete }) => {
  const now = new Date();
  const [hours, minutes] = item.endTime.split(':').map(Number);
  const shiftEndDate = new Date(item.date);
  shiftEndDate.setHours(hours, minutes, 0, 0);
  if (hours < 5) shiftEndDate.setDate(shiftEndDate.getDate() + 1);
  const isPast = shiftEndDate < now;

  return (
    <TouchableRipple onPress={() => onEdit(item)} disabled={isPast || !isManagerOrAdmin}>
      <View style={[styles.itemContainer, isPast && styles.pastItemContainer]}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTime}>{item.startTime} - {item.endTime}</Text>
          <Text style={styles.itemType}>{item.shiftType}</Text>
          <Text style={styles.itemName}>{item.staffName}</Text>
          {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
        </View>
        {isManagerOrAdmin && (
          <View style={styles.itemActions}>
            <Button mode="text" onPress={() => onEdit(item)} disabled={isPast}>Edit</Button>
            <Button mode="text" textColor="#e74c3c" onPress={() => onDelete(item._id)}>Delete</Button>
          </View>
        )}
      </View>
    </TouchableRipple>
  );
});

const StaffScheduler = () => {
  const auth = useContext(AuthContext); 
  const theme = useTheme();
  const isManagerOrAdmin = auth?.user?.role === 'admin' || auth?.user?.role === 'manager';

  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [shifts, setShifts] = useState([]); 
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showHistory, setShowHistory] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState(null);

  const fetchShifts = useCallback(async () => {
    if (!auth || !auth.token) return; 
    try {
      setLoading(true); 
      setError(null);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 5); 
      
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();
      
      const shiftsRes = await api.get(`/api/shifts?startDate=${startStr}&endDate=${endStr}`);
      setShifts(shiftsRes.data.data || []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load schedule');
    } finally {
      setLoading(false); 
    }
  }, [auth, currentDate]);

  useEffect(() => {
    if (!auth || !auth.token || !isManagerOrAdmin) return; 
    const fetchStaff = async () => {
       try {
         const staffRes = await userAPI.getAllUsers();
         setStaffList(Array.isArray(staffRes.data.data) ? staffRes.data.data : []);
       } catch (err) { console.error("Failed to load staff list", err); }
    };
    fetchStaff();
  }, [auth, isManagerOrAdmin]); 

  useEffect(() => {
    fetchShifts();
    setShowHistory(false);
  }, [fetchShifts]); 

  const sections = useMemo(() => {
    const grouped = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateKey = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
        
        if (isCurrentMonth && !showHistory && dateObj < today) {
            continue;
        }

        grouped[dateKey] = { title: dateKey, data: [] };
    }

    shifts.forEach(shift => {
        const shiftDate = new Date(shift.date);
        const dateKey = shiftDate.toISOString().slice(0, 10);
        
        if (grouped[dateKey]) {
            grouped[dateKey].data.push({
                ...shift,
                staffName: shift.staffId?.name || 'Unknown',
                staffId: shift.staffId?._id || shift.staffId
            });
        }
    });

    const shiftOrder = { morning: 1, afternoon: 2, evening: 3 };
    Object.values(grouped).forEach(day => {
        day.data.sort((a, b) => {
             const orderA = shiftOrder[a.shiftType] || 99;
             const orderB = shiftOrder[b.shiftType] || 99;
             return orderA - orderB;
        });
    });

    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, [shifts, currentDate, showHistory]);

  const changeMonth = (amount) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + amount);
    setCurrentDate(newDate);
  };

  const handleSaveShift = async (payload, id) => {
    try {
      if (id) await api.put(`/api/shifts/${id}`, payload);
      else await api.post('/api/shifts', payload);
      setModalVisible(false);
      setShiftToEdit(null);
      fetchShifts(); 
    } catch (e) { Alert.alert("Error", "Failed to save shift."); }
  };
  
  const handleDeleteShift = useCallback((id) => {
    Alert.alert("Delete Shift", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await api.delete(`/api/shifts/${id}`); fetchShifts(); } 
        catch (e) { Alert.alert("Error", "Failed to delete."); }
      }}
    ]);
  }, [fetchShifts]);

  const openAddModal = (dayISOString) => {
    setShiftToEdit({ date: dayISOString }); 
    setModalVisible(true);
  };

  const openEditModal = useCallback((shift) => {
    setShiftToEdit(shift);
    setModalVisible(true);
  }, []);

  const renderSectionHeader = ({ section }) => {
    const dateObj = new Date(section.title);
    const dateLabel = dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
    
    const now = new Date();
    const isToday = dateObj.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const isPast = dateObj < new Date(now.setHours(0,0,0,0));

    return (
      <View style={[styles.sectionHeader, isToday && styles.todayHeader, isPast && styles.pastSectionHeader]}>
        <Text style={[styles.sectionHeaderText, isToday && styles.todayText]}>{dateLabel} {isToday ? "(Today)" : ""}</Text>
        {isManagerOrAdmin && (
          <Button icon="plus" mode="text" onPress={() => openAddModal(section.title)} disabled={isPast}>
            Add
          </Button>
        )}
      </View>
    );
  };

  const shouldShowHistoryButton = useMemo(() => {
      const now = new Date();
      const isCurrentMonth = currentDate.getMonth() === now.getMonth() && currentDate.getFullYear() === now.getFullYear();
      return isCurrentMonth && !showHistory;
  }, [currentDate, showHistory]);

  if (!auth || auth.loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ShiftFormModal 
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setShiftToEdit(null); }}
        onSave={handleSaveShift}
        staffList={staffList}
        initialData={shiftToEdit}
      />
      
      <View style={styles.monthSelector}>
        <Button mode="text" onPress={() => changeMonth(-1)}>&lt; Prev</Button>
        <Text style={styles.monthTitle}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
        <Button mode="text" onPress={() => changeMonth(1)}>Next &gt;</Button>
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.listLoadingIndicator} />}

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item._id || `day-${item.title}-${index}`}
        renderItem={({ item }) => (
          <ShiftItem item={item} isManagerOrAdmin={isManagerOrAdmin} onEdit={openEditModal} onDelete={handleDeleteShift} />
        )}
        renderSectionHeader={renderSectionHeader}
        onRefresh={fetchShifts}
        refreshing={loading}
        
        ListHeaderComponent={
            shouldShowHistoryButton ? (
                <TouchableOpacity 
                    style={styles.historyButton} 
                    onPress={() => setShowHistory(true)}
                >
                    <Icon source="history" size={20} color={theme.colors.primary} />
                    <Text style={[styles.historyButtonText, {color: theme.colors.primary}]}>
                        Show Previous Days
                    </Text>
                </TouchableOpacity>
            ) : null
        }

        renderSectionFooter={({ section }) => {
          if (section.data.length === 0) {
            return <View style={styles.emptyDay}><Text style={styles.emptyDayText}>No shifts</Text></View>;
          }
          return null;
        }}
        initialNumToRender={15}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  errorText: { color: 'red', textAlign: 'center', padding: 10 },
  listLoadingIndicator: { padding: 10 },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  monthTitle: { fontSize: 18, fontWeight: 'bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#f0f0f0', borderBottomWidth: 1, borderBottomColor: '#eee' },
  todayHeader: { backgroundColor: '#e3f2fd' },
  sectionHeaderText: { fontSize: 16, fontWeight: 'bold' },
  todayText: { color: '#1976d2' },
  pastSectionHeader: { opacity: 0.6 },
  emptyDay: { padding: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  emptyDayText: { color: '#ccc', fontStyle: 'italic', textAlign: 'center', fontSize: 12 },
  itemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pastItemContainer: { opacity: 0.5, backgroundColor: '#f9f9f9' },
  itemInfo: { flex: 1, marginRight: 10 },
  itemTime: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  itemType: { textTransform: 'capitalize', color: '#888', fontSize: 12, marginTop: 2 },
  itemName: { fontWeight: 'bold', fontSize: 16, marginTop: 4 },
  itemNotes: { color: '#555', fontStyle: 'italic', marginTop: 3 },
  itemActions: { flexDirection: 'row' },
  modalView: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10, maxHeight: '100%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  input: { backgroundColor: '#ffffff', marginBottom: 10 },
  pickerButtonContent: { height: 56, justifyContent: 'center' },
  pickerButtonLabel: { color: '#1C1B1F', fontWeight: 'normal', marginLeft: 14, textAlign: 'left' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  staffPickerContainer: { maxHeight: 150, borderWidth: 1, borderColor: '#eee', borderRadius: 5, padding: 5, marginBottom: 10 },
  staffPicker: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, marginBottom: 10 },
  pickerButton: { margin: 3 },
  historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 15,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      marginBottom: 10
  },
  historyButtonText: {
      marginLeft: 8,
      fontWeight: 'bold',
  }
});

export default StaffScheduler;