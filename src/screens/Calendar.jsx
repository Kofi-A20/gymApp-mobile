import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { sessionsService } from '../services/sessionsService';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import RepsHeader from '../components/MonolithHeader';

const { width } = Dimensions.get('window');
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PLANNED_STORAGE_KEY = '@reps_plannedSessions';

const Calendar = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessionsByDate, setSessionsByDate] = useState({});
  const [plannedSessions, setPlannedSessions] = useState([]);
  const [monthStats, setMonthStats] = useState({ count: 0, totalVolume: 0 });
  const [loading, setLoading] = useState(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // For multi-session day picker
  const [selectedDaySessions, setSelectedDaySessions] = useState(null);

  // For Adding Planned Session
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableWorkouts, setAvailableWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Custom Planning Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [schedulingDate, setSchedulingDate] = useState(null); // The date selected from calendar
  const [planHour, setPlanHour] = useState(new Date().getHours());
  const [planMinute, setPlanMinute] = useState(0); 
  const [planDateIndex, setPlanDateIndex] = useState(0); // For manual selection if needed
  
  // For scrolling to Upcoming section
  const scrollRef = useRef(null);
  const [upcomingSectionY, setUpcomingSectionY] = useState(0);

  // Cache the next 30 days
  const next30Days = useRef([]);
  if (next30Days.current.length === 0) {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        date: d,
        label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }).toUpperCase(),
        dateStr: d.toISOString().split('T')[0]
      });
    }
    next30Days.current = dates;
  }

  useFocusEffect(
    useCallback(() => {
      fetchMonthData();
      loadPlannedSessions();
    }, [currentDate])
  );

  // Request notifications permissions
  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    })();
  }, []);

  const fetchMonthData = async () => {
    if (!hasInitialLoaded) setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const data = await sessionsService.getSessionsForMonth(year, month);

      const sessionMap = {};
      let totalVolume = 0;

      data.forEach(s => {
        const dateStr = s.completed_at.split('T')[0];
        if (!sessionMap[dateStr]) sessionMap[dateStr] = [];
        sessionMap[dateStr].push(s);
        totalVolume += (s.total_volume_kg || 0);
      });

      setSessionsByDate(sessionMap);
      setMonthStats({ count: Object.keys(sessionMap).length, totalVolume });
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
      setHasInitialLoaded(true);
    }
  };

  const loadPlannedSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(PLANNED_STORAGE_KEY);
      if (stored) {
        setPlannedSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load planned sessions:', e);
    }
  };

  const savePlannedSession = async (workout, dateTime) => {
    try {
      let notificationId = null;
      try {
        // 1. Schedule local notification - using 'date' trigger for Expo Go compatibility
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'TIME TO TRAIN',
            body: `${workout.name.toUpperCase()} IS SCHEDULED FOR NOW.`,
            data: { workoutId: workout.id },
            sound: true,
          },
          trigger: {
            type: 'date',
            date: dateTime,
          },
        });
      } catch (triggerError) {
        console.warn('Failed to schedule notification (likely Expo Go limitation):', triggerError);
      }

      const newPlanned = {
        id: Date.now().toString(),
        workoutId: workout.id,
        workoutName: workout.name,
        dateTime: dateTime.toISOString(),
        notificationId,
      };
      
      const updated = [...plannedSessions, newPlanned].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      setPlannedSessions(updated);
      await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(updated));
      setShowAddModal(false);
      setSelectedWorkout(null);
      
      // Auto-scroll to the upcoming sessions section
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: upcomingSectionY, animated: true });
      }, 500);
    } catch (e) {
      console.error('Save planned session error:', e);
      Alert.alert('ERROR', 'FAILED TO SAVE PLANNED SESSION.');
    }
  };

  const deletePlannedSession = async (session) => {
    try {
      // 1. Cancel notification if it exists
      if (session.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(session.notificationId);
      }

      // 2. Remove from local storage
      const updated = plannedSessions.filter(p => p.id !== session.id);
      setPlannedSessions(updated);
      await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Delete planned session error:', e);
      Alert.alert('ERROR', 'FAILED TO DELETE PLANNED SESSION.');
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const handleConfirmPlan = () => {
    if (!selectedWorkout) return;

    // Use schedulingDate from calendar tap OR fallback to the 30-day picker index
    const dateToUse = schedulingDate ? new Date(schedulingDate + 'T00:00:00') : next30Days.current[planDateIndex].date;
    const finalDate = new Date(dateToUse);
    finalDate.setHours(planHour, planMinute, 0, 0);

    // Validation: Not in the past
    if (finalDate < new Date()) {
      Alert.alert('INVALID TIME', 'CANNOT PLAN A SESSION IN THE PAST.');
      return;
    }

    savePlannedSession(selectedWorkout, finalDate);
    setShowPlanModal(false);
    setSchedulingDate(null);
  };

  const handleDayPress = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const daySessions = sessionsByDate[dateStr];

    if (dateStr >= todayStr) {
      // Future or today - open scheduling flow
      openAddPlanned(dateStr);
    } else if (daySessions && daySessions.length > 0) {
      // Past - view history
      if (daySessions.length === 1) {
        navigation.navigate('SessionHistoryDetail', { session: daySessions[0] });
      } else {
        setSelectedDaySessions({ date: dateStr, items: daySessions });
      }
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startDayOffset = firstDay;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = 42;
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startDayOffset; i++) {
      days.push({ day: prevMonthLastDay - (startDayOffset - 1 - i), isCurrentMonth: false });
    }
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({
        day: d,
        isCurrentMonth: true,
        isToday,
        dateStr,
        hasSession: !!sessionsByDate[dateStr],
        hasPlanned: plannedSessions.some(p => p.dateTime.split('T')[0] === dateStr)
      });
    }
    let nextDay = 1;
    while (days.length < totalCells) { days.push({ day: nextDay++, isCurrentMonth: false }); }
    return days;
  };

  const Indicator = ({ type, count }) => {
    if (type === 'completed') {
      return (
        <View style={[styles.indicator, { backgroundColor: '#CCFF00' }]}>
          <MaterialCommunityIcons name="check" size={8} color="#000" />
        </View>
      );
    }
    return (
      <View style={[styles.indicator, { borderWidth: 1, borderColor: '#CCFF00', backgroundColor: 'transparent' }]} />
    );
  };

  const openAddPlanned = async (targetDateStr = null) => {
    try {
      const data = await workoutsService.getUserWorkouts();
      setAvailableWorkouts(data);
      setSchedulingDate(targetDateStr);
      
      // If we have a target date from the calendar, we'll use it.
      // If not (legacy button press), we'll default to today in the list.
      if (!targetDateStr) {
        setPlanDateIndex(0);
      }
      
      setShowAddModal(true);
    } catch (e) {
      Alert.alert('ERROR', 'FAILED TO LOAD ROUTINES');
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const yearName = currentDate.getFullYear();

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader />

      <ScrollView 
        ref={scrollRef}
        style={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.monthNav}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subLabel, { color: colors.secondaryText }]}>CURRENT CYCLE</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.mainTitle, { color: colors.text }]}>{monthName}</Text>
              <Text style={[styles.yearTitle, { color: isDarkMode ? '#1A1A1A' : '#F0F0F0' }]}>{yearName}</Text>
            </View>
            <View style={styles.navBtns}>
              <TouchableOpacity onPress={prevMonth} style={styles.navIcon}><AntDesign name="left" size={20} color={colors.text} /></TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={styles.navIcon}><AntDesign name="right" size={20} color={colors.text} /></TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.statBox, { borderLeftColor: '#CCFF00' }]}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>COMPLETIONS</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{monthStats.count}</Text>
            </View>
            <View style={[styles.statBox, { borderLeftColor: '#CCFF00' }]}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>TOTAL VOLUME</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{monthStats.totalVolume.toLocaleString()} KG</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.daysRow}>
              {DAYS.map(d => <Text key={d} style={[styles.dayLabel, { color: colors.secondaryText }]}>{d}</Text>)}
            </View>
            <View style={styles.gridOuter}>
              {getMonthDays().map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    { borderColor: colors.border },
                    item.isToday && { backgroundColor: isDarkMode ? '#1A1D0E' : '#F7FFD6', borderColor: '#CCFF00', borderWidth: 1 },
                    !item.isCurrentMonth && { opacity: 0.1 },
                    (idx % 7 === 6) && { borderRightWidth: 0 },
                    (idx >= 35) && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => item.isCurrentMonth && handleDayPress(item.dateStr)}
                  disabled={!item.isCurrentMonth}
                >
                  <Text style={[styles.dayNum, { color: item.isToday ? '#CCFF00' : (item.isCurrentMonth ? colors.text : colors.secondaryText) }]}>
                    {item.day.toString().padStart(2, '0')}
                  </Text>
                  <View style={styles.indicatorContainer}>
                    {item.hasPlanned && <Indicator type="planned" />}
                    {item.hasSession && <Indicator type="completed" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View 
            style={styles.plannedSection}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setUpcomingSectionY(layout.y);
            }}
          >
            <View style={styles.plannedHeader}>
              <Text style={[styles.subLabel, { color: colors.secondaryText }]}>UPCOMING SESSIONS</Text>
            </View>

            <View style={[styles.plannedTable, { borderColor: colors.border }]}>
              {plannedSessions.length === 0 ? (
                <Text style={{ color: colors.secondaryText, textAlign: 'center', padding: 20, fontSize: 10 }}>NO UPCOMING SESSIONS SCHEDULED</Text>
              ) : (
                plannedSessions.map(item => (
                  <View key={item.id} style={[styles.plannedRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.dateBlock}>
                      <Text style={[styles.pDate, { color: colors.text }]}>{new Date(item.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</Text>
                      <Text style={[styles.pTime, { color: colors.secondaryText }]}>{new Date(item.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text style={[styles.pName, { color: colors.text }]}>{item.workoutName.toUpperCase()}</Text>
                    <TouchableOpacity onPress={() => deletePlannedSession(item)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Select Workout Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>PICK ROUTINE</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><AntDesign name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <FlatList
              data={availableWorkouts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedWorkout(item);
                    setShowAddModal(false);
                    setShowPlanModal(true);
                  }}>
                  <Text style={[styles.pickerName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
                  <AntDesign name="plus" size={16} color="#CCFF00" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* PLAN DETAILS MODAL (Custom Date/Time) */}
      <Modal visible={showPlanModal} transparent animationType="fade" onRequestClose={() => setShowPlanModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.planBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 20 }]}>PLAN YOUR SESSION</Text>

            <Text style={[styles.pLabel, { color: colors.secondaryText }]}>DAY</Text>
            {schedulingDate ? (
              <View style={[styles.dateChip, { backgroundColor: '#CCFF00', borderColor: '#CCFF00', alignSelf: 'flex-start', marginBottom: 10 }]}>
                <Text style={[styles.dateChipText, { color: '#000' }]}>
                  {new Date(schedulingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {next30Days.current.map((d, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setPlanDateIndex(index)}
                    style={[
                      styles.dateChip,
                      { borderColor: colors.border },
                      planDateIndex === index && { backgroundColor: '#CCFF00', borderColor: '#CCFF00' }
                    ]}
                  >
                    <Text style={[styles.dateChipText, { color: planDateIndex === index ? '#000' : colors.text }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={[styles.pLabel, { color: colors.secondaryText, marginTop: 20 }]}>TIME (24H)</Text>
            <View style={styles.timePickerRow}>
              {/* Hour */}
              <View style={styles.timeCol}>
                <TouchableOpacity onPress={() => setPlanHour(h => (h + 1) % 24)}><Ionicons name="chevron-up" size={24} color={colors.text} /></TouchableOpacity>
                <Text style={[styles.timeVal, { color: colors.text }]}>{planHour.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setPlanHour(h => (h - 1 + 24) % 24)}><Ionicons name="chevron-down" size={24} color={colors.text} /></TouchableOpacity>
              </View>

              <Text style={[styles.timeVal, { color: colors.text, marginHorizontal: 15 }]}>:</Text>

              {/* Minute */}
              <View style={styles.timeCol}>
                <TouchableOpacity onPress={() => setPlanMinute(m => (m + 5) % 60)}><Ionicons name="chevron-up" size={24} color={colors.text} /></TouchableOpacity>
                <Text style={[styles.timeVal, { color: colors.text }]}>{planMinute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => setPlanMinute(m => (m - 5 + 60) % 60)}><Ionicons name="chevron-down" size={24} color={colors.text} /></TouchableOpacity>
              </View>
            </View>

            <View style={styles.pActionRow}>
              <TouchableOpacity style={[styles.pBtn, { flex: 1 }]} onPress={() => setShowPlanModal(false)}>
                <Text style={[styles.pBtnText, { color: colors.secondaryText }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pBtn, { flex: 2, backgroundColor: '#CCFF00' }]}
                onPress={handleConfirmPlan}
              >
                <Text style={[styles.pBtnText, { color: '#000' }]}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Multi-Session Modal */}
      <Modal visible={!!selectedDaySessions} transparent animationType="fade" onRequestClose={() => setSelectedDaySessions(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>PICK SESSION</Text>
              <TouchableOpacity onPress={() => setSelectedDaySessions(null)}><AntDesign name="close" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <FlatList data={selectedDaySessions?.items} keyExtractor={item => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.pickerItem, { borderBottomColor: colors.border }]} onPress={() => { setSelectedDaySessions(null); navigation.navigate('SessionHistoryDetail', { session: item }); }}>
                <View><Text style={[styles.pickerName, { color: colors.text }]}>{item.workout_name.toUpperCase()}</Text></View>
                <AntDesign name="right" size={16} color={colors.secondaryText} />
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, height: 60 },
  brandTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 30 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  navBtns: { flexDirection: 'row', gap: 15, marginTop: 10 },
  navIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  subLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  mainTitle: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 40 },
  yearTitle: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 40, marginTop: -2 },
  summaryRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  statBox: { flex: 1, borderLeftWidth: 3, paddingLeft: 12 },
  statLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '900' },
  gridContainer: { marginBottom: 40 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 },
  dayLabel: { width: (width - 48) / 7, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  gridOuter: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  dayCell: { width: '14.285%', height: 60, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#333', padding: 4, justifyContent: 'space-between' },
  dayNum: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  indicatorContainer: { alignSelf: 'flex-end', alignItems: 'center', gap: 2 },
  indicator: { width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  plannedSection: { marginTop: 20 },
  plannedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  addBtn: { backgroundColor: '#CCFF00', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#000', fontSize: 10, fontWeight: '900', marginLeft: 4 },
  plannedTable: { borderWidth: 1, minHeight: 100, maxHeight: 300, overflow: 'hidden' },
  plannedRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  dateBlock: { width: 80 },
  pDate: { fontSize: 13, fontWeight: '900' },
  pTime: { fontSize: 9, fontWeight: '700' },
  pName: { fontSize: 16, fontWeight: '900', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '60%', borderWidth: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  pickerName: { fontSize: 16, fontWeight: '900' },
  planBox: {
    width: '100%',
    borderWidth: 1,
    padding: 24,
  },
  pLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  timeCol: {
    alignItems: 'center',
    gap: 5,
  },
  timeVal: {
    fontSize: 32,
    fontWeight: '900',
  },
  pActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 30,
    paddingTop: 10,
    gap: 10,
  },
  pBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  deleteBtn: {
    padding: 5,
    marginLeft: 10,
  },
});

export default Calendar;
