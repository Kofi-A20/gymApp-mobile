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
  Alert,
  ActionSheetIOS,
  Platform,
  PanResponder,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { sessionsService } from '../services/sessionsService';
import { workoutsService } from '../services/workoutsService';
import { splitsService } from '../services/splitsService';
import { MaterialCommunityIcons, AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';

const { width } = Dimensions.get('window');
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PLANNED_STORAGE_KEY = '@reps_plannedSessions';

const Calendar = ({ navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessionsByDate, setSessionsByDate] = useState({});
  const [plannedSessions, setPlannedSessions] = useState([]);
  const [monthStats, setMonthStats] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // For multi-session day picker
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [sheetSelectionMode, setSheetSelectionMode] = useState(false);
  const [sheetSelectedSessions, setSheetSelectedSessions] = useState([]);

  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.5) {
          Animated.timing(panY, { toValue: 500, duration: 300, useNativeDriver: true }).start(() => {
            setSelectedDayData(null);
          });
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;


  const handleSheetSelectAll = () => {
    if (sheetSelectionMode) {
      setSheetSelectionMode(false);
      setSheetSelectedSessions([]);
    } else {
      setSheetSelectionMode(true);
      setSheetSelectedSessions(selectedDayData?.planned?.map(p => p.id) || []);
    }
  };

  const toggleSheetSelection = (id) => {
    if (sheetSelectedSessions.includes(id)) {
      setSheetSelectedSessions(prev => prev.filter(sId => sId !== id));
    } else {
      setSheetSelectedSessions(prev => [...prev, id]);
    }
  };

  const handleSheetBatchDelete = async () => {
    if (sheetSelectedSessions.length === 0) return;

    Alert.alert(
      "DELETE SESSIONS",
      `Are you sure you want to delete ${sheetSelectedSessions.length} planned session(s)?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            const sessionsToDelete = plannedSessions.filter(p => sheetSelectedSessions.includes(p.id));
            for (const s of sessionsToDelete) {
              if (s.notificationId) {
                await Notifications.cancelScheduledNotificationAsync(s.notificationId);
              }
            }

            const updated = plannedSessions.filter(p => !sheetSelectedSessions.includes(p.id));
            setPlannedSessions(updated);
            await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(updated));

            setSelectedDayData(prev => prev ? { ...prev, planned: prev.planned.filter(p => !sheetSelectedSessions.includes(p.id)) } : null);
            setSheetSelectedSessions([]);
            setSheetSelectionMode(false);
          }
        }
      ]
    );
  };

  const handleSessionOptions = (item) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Time', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setEditingSession(item);
            const date = new Date(item.dateTime);
            setEditHour(date.getHours());
            setEditMinute(date.getMinutes());
            setSelectedDayData(null);
            setTimeout(() => {
              setShowEditTimeModal(true);
            }, 300);
          } else if (buttonIndex === 2) {
            deletePlannedSession(item);
            setSelectedDayData(prev => prev ? { ...prev, planned: prev.planned.filter(p => p.id !== item.id) } : null);
          }
        }
      );
    } else {
      Alert.alert(
        'Session Options',
        'Choose an action for this session',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Edit Time', onPress: () => {
              setEditingSession(item);
              const date = new Date(item.dateTime);
              setEditHour(date.getHours());
              setEditMinute(date.getMinutes());
              setSelectedDayData(null);
              setTimeout(() => {
                setShowEditTimeModal(true);
              }, 300);
            }
          },
          {
            text: 'Delete', style: 'destructive', onPress: () => {
              deletePlannedSession(item);
              setSelectedDayData(prev => prev ? { ...prev, planned: prev.planned.filter(p => p.id !== item.id) } : null);
            }
          }
        ]
      );
    }
  };

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

  // Edit Time Modal State
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editHour, setEditHour] = useState(8);
  const [editMinute, setEditMinute] = useState(0);

  const planDateVal = new Date();
  planDateVal.setHours(planHour, planMinute, 0, 0);

  const editDateVal = new Date();
  editDateVal.setHours(editHour, editMinute, 0, 0);

  const onPlanTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      setPlanHour(selectedDate.getHours());
      setPlanMinute(selectedDate.getMinutes());
    }
  };

  const onEditTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      setEditHour(selectedDate.getHours());
      setEditMinute(selectedDate.getMinutes());
    }
  };

  const handleConfirmEditTime = async () => {
    if (!editingSession) return;
    try {
      if (editingSession.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(editingSession.notificationId).catch(() => { });
      }

      const newDate = new Date(editingSession.dateTime);
      newDate.setHours(editHour, editMinute, 0, 0);

      if (newDate < new Date()) {
        Alert.alert('INVALID TIME', 'CANNOT PLAN A SESSION IN THE PAST.');
        return;
      }

      let notificationId = null;
      try {
        notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'TIME TO TRAIN',
            body: `${editingSession.workoutName.toUpperCase()} IS SCHEDULED FOR NOW.`,
            data: { workoutId: editingSession.workoutId },
            sound: true,
          },
          trigger: {
            type: 'date',
            date: newDate,
          },
        });
      } catch (e) {
        console.warn(e);
      }

      const updatedSession = {
        ...editingSession,
        dateTime: newDate.toISOString(),
        notificationId
      };

      const updated = plannedSessions.map(p => p.id === updatedSession.id ? updatedSession : p).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      setPlannedSessions(updated);
      await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(updated));

      const editingSessionDateStr = editingSession.dateTime.split('T')[0];

      setShowEditTimeModal(false);
      setEditingSession(null);

      const todayStr = new Date().toISOString().split('T')[0];
      const isFutureOrToday = editingSessionDateStr >= todayStr;
      const dayPlanned = updated.filter(p => p.dateTime.split('T')[0] === editingSessionDateStr);
      const dayCompleted = sessionsByDate[editingSessionDateStr] || [];

      setTimeout(() => {
        panY.setValue(0);
        setSelectedDayData({
          dateStr: editingSessionDateStr,
          planned: dayPlanned,
          completed: dayCompleted,
          isFutureOrToday
        });
      }, 300);

      // Auto-scroll to the upcoming sessions section
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: upcomingSectionY, animated: true });
      }, 500);
    } catch (e) {
      console.error(e);
      Alert.alert('ERROR', 'FAILED TO UPDATE SESSION.');
    }
  };

  // Batch Deletion State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);

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
      splitsService.syncNotifications();
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
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

      data.forEach(s => {
        const dateStr = s.completed_at.split('T')[0];
        if (!sessionMap[dateStr]) sessionMap[dateStr] = [];
        sessionMap[dateStr].push(s);
      });

      setSessionsByDate(sessionMap);
      setMonthStats({ count: Object.keys(sessionMap).length });
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
        workoutColor: workout.color || null,
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

  const toggleSelection = (id) => {
    if (selectedSessions.includes(id)) {
      setSelectedSessions(prev => prev.filter(sId => sId !== id));
      if (selectedSessions.length === 1) setIsSelectionMode(false);
    } else {
      setSelectedSessions(prev => [...prev, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSessions.length === plannedSessions.length) {
      setSelectedSessions([]);
      setIsSelectionMode(false);
    } else {
      setSelectedSessions(plannedSessions.map(p => p.id));
      setIsSelectionMode(true);
    }
  };

  const handleBatchDelete = () => {
    if (selectedSessions.length === 0) return;

    Alert.alert(
      "DELETE SESSIONS",
      `Are you sure you want to delete ${selectedSessions.length} planned session(s)?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            const sessionsToDelete = plannedSessions.filter(p => selectedSessions.includes(p.id));
            for (const s of sessionsToDelete) {
              if (s.notificationId) {
                await Notifications.cancelScheduledNotificationAsync(s.notificationId);
              }
            }

            const updated = plannedSessions.filter(p => !selectedSessions.includes(p.id));
            setPlannedSessions(updated);
            await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(updated));

            setSelectedSessions([]);
            setIsSelectionMode(false);
          }
        }
      ]
    );
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
    const isFutureOrToday = dateStr >= todayStr;
    const dayPlanned = plannedSessions.filter(p => p.dateTime.split('T')[0] === dateStr);
    const dayCompleted = sessionsByDate[dateStr] || [];

    if (isFutureOrToday || dayPlanned.length > 0 || dayCompleted.length > 0) {
      panY.setValue(0);
      setSelectedDayData({
        dateStr,
        planned: dayPlanned,
        completed: dayCompleted,
        isFutureOrToday
      });
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
        plannedColors: plannedSessions
          .filter(p => p.dateTime.split('T')[0] === dateStr)
          .map(p => p.workoutColor || null),
      });
    }
    let nextDay = 1;
    while (days.length < totalCells) { days.push({ day: nextDay++, isCurrentMonth: false }); }
    return days;
  };

  const Indicator = ({ type, color }) => {
    const indicatorColor = color || accentColor;
    // TODO: For completed sessions, color coding requires fetching the workout color from session data
    if (type === 'completed') {
      return (
        <View style={[styles.indicator, { backgroundColor: indicatorColor }]}>
          <MaterialCommunityIcons name="check" size={8} color="#000" />
        </View>
      );
    }
    return (
      <View style={[styles.indicator, { borderWidth: 1, borderColor: indicatorColor, backgroundColor: 'transparent' }]} />
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
      <RepsHeader
        selectionMode={isSelectionMode}
        selectedCount={selectedSessions.length}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedSessions([]); }}
        onDeleteSelected={handleBatchDelete}
        onSelectAll={handleSelectAll}
        rightActions={[{ icon: 'book-open-outline', library: 'MaterialCommunityIcons', onPress: () => navigation.navigate('SplitsScreen') }]}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
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
            <View style={[styles.statBox, { borderLeftColor: accentColor }]}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>COMPLETIONS</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{monthStats.count}</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.daysRow}>
              {DAYS.map(d => <Text key={d} style={[styles.dayLabel, { color: colors.secondaryText }]}>{d}</Text>)}
            </View>
            <View style={styles.gridOuter}>
              {getMonthDays().map((item, idx) => {
                const plannedColor = item.plannedColors && item.plannedColors.length > 0 ? (item.plannedColors[0] || accentColor) : null;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayCell,
                      { borderColor: colors.border },
                      item.isToday && { backgroundColor: isDarkMode ? '#1A1D0E' : '#F7FFD6', borderColor: accentColor, borderWidth: 1 },
                      !item.isCurrentMonth && { opacity: 0.1 },
                      (idx % 7 === 6) && { borderRightWidth: 0 },
                      (idx >= 35) && { borderBottomWidth: 0 },
                      plannedColor && { borderLeftWidth: 4, borderLeftColor: plannedColor, backgroundColor: isDarkMode ? `${plannedColor}1A` : `${plannedColor}10` }
                    ]}
                    onPress={() => item.isCurrentMonth && handleDayPress(item.dateStr)}
                    disabled={!item.isCurrentMonth}
                  >
                    <Text style={[styles.dayNum, { color: item.isToday ? accentColor : (item.isCurrentMonth ? colors.text : colors.secondaryText) }]}>
                      {item.day.toString().padStart(2, '0')}
                    </Text>
                    <View style={styles.indicatorContainer}>
                      {item.hasSession && <Indicator type="completed" />}
                    </View>
                  </TouchableOpacity>
                )
              })}
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

            {plannedSessions.length === 0 ? (
              <View style={[styles.plannedTable, { borderColor: colors.border, justifyContent: 'center' }]}>
                <Text style={{ color: colors.secondaryText, textAlign: 'center', padding: 20, fontSize: 10 }}>NO UPCOMING SESSIONS SCHEDULED</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.upcomingStrip}>
                {plannedSessions.filter(s => s.dateTime > new Date().toISOString()).slice(0, 10).map(item => {
                  const itemColor = item.workoutColor || accentColor;
                  return (
                    <AppTile
                      key={item.id}
                      style={[
                        styles.upcomingCard,
                        { borderLeftColor: itemColor }
                      ]}
                      onPress={() => {
                        const getLocalYMD = (d) => {
                          const date = new Date(d);
                          return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        };

                        item.localDateStr = getLocalYMD(item.dateTime);
                        const dateStr = item.localDateStr;

                        const dayPlanned = plannedSessions.filter(p => {
                          p.localDateStr = getLocalYMD(p.dateTime);
                          return p.localDateStr === dateStr;
                        });

                        const dayCompleted = sessionsByDate[dateStr] || [];
                        const todayStr = getLocalYMD(new Date());

                        panY.setValue(0);
                        setSelectedDayData({
                          dateStr,
                          planned: dayPlanned,
                          completed: dayCompleted,
                          isFutureOrToday: item.localDateStr >= todayStr
                        });
                      }}
                    >
                      <View style={styles.ucDateRow}>
                        <Text style={[styles.ucDate, { color: colors.secondaryText }]}>
                          {new Date(item.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                        </Text>
                        <Text style={[styles.ucTime, { color: colors.text }]}>
                          {new Date(item.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={[styles.ucName, { color: colors.text }]} numberOfLines={2}>
                        {item.workoutName.toUpperCase()}
                      </Text>
                    </AppTile>
                  )
                })}
              </ScrollView>
            )}
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
                  <AntDesign name="plus" size={16} color={accentColor} />
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
              <View style={[styles.dateChip, { backgroundColor: accentColor, borderColor: accentColor, alignSelf: 'flex-start', marginBottom: 10 }]}>
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
                      planDateIndex === index && { backgroundColor: accentColor, borderColor: accentColor }
                    ]}
                  >
                    <Text style={[styles.dateChipText, { color: planDateIndex === index ? '#000' : colors.text }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={[styles.pLabel, { color: colors.secondaryText, marginTop: 20 }]}>TIME</Text>
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <DateTimePicker
                value={planDateVal}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPlanTimeChange}
                textColor={colors.text}
              />
            </View>

            <View style={styles.pActionRow}>
              <TouchableOpacity style={[styles.pBtn, { flex: 1 }]} onPress={() => setShowPlanModal(false)}>
                <Text style={[styles.pBtnText, { color: colors.secondaryText }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pBtn, { flex: 2, backgroundColor: accentColor }]}
                onPress={handleConfirmPlan}
              >
                <Text style={[styles.pBtnText, { color: '#000' }]}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT TIME MODAL */}
      <Modal visible={showEditTimeModal} transparent animationType="fade" onRequestClose={() => setShowEditTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.planBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 20 }]}>EDIT TIME</Text>

            {editingSession && (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 4 }}>
                  {editingSession.workoutName.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.secondaryText }}>
                  {new Date(editingSession.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <DateTimePicker
                value={editDateVal}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onEditTimeChange}
                textColor={colors.text}
              />
            </View>

            <View style={styles.pActionRow}>
              <TouchableOpacity style={[styles.pBtn, { flex: 1 }]} onPress={() => setShowEditTimeModal(false)}>
                <Text style={[styles.pBtnText, { color: colors.secondaryText }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pBtn, { flex: 2, backgroundColor: accentColor }]}
                onPress={handleConfirmEditTime}
              >
                <Text style={[styles.pBtnText, { color: '#000' }]}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Day Sheet Modal */}
      <Modal visible={!!selectedDayData} transparent animationType="none" onRequestClose={() => setSelectedDayData(null)}>
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <Animated.View style={[
            styles.modalContent,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 0,
              maxHeight: '75%',
              flexShrink: 1,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30,
            },
            { transform: [{ translateY: panY }] }
          ]}>
            <View {...panResponder.panHandlers} style={{ width: '100%', alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={[styles.modalHeader, { justifyContent: 'flex-start' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedDayData ? new Date(selectedDayData.dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase() : ''}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDayData?.planned?.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[styles.subLabel, { color: colors.secondaryText, marginBottom: 0 }]}>SCHEDULED</Text>
                    {selectedDayData.planned.length >= 2 && (
                      <TouchableOpacity onPress={handleSheetSelectAll}>
                        <Text style={{ color: accentColor, fontWeight: '900', fontSize: 10, letterSpacing: 1 }}>
                          {sheetSelectionMode ? 'CANCEL' : 'SELECT ALL'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {selectedDayData.planned.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => sheetSelectionMode ? toggleSheetSelection(item.id) : null}
                      activeOpacity={sheetSelectionMode ? 0.7 : 1}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {sheetSelectionMode && (
                          <MaterialCommunityIcons
                            name={sheetSelectedSessions.includes(item.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={20}
                            color={sheetSelectedSessions.includes(item.id) ? accentColor : colors.border}
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.workoutColor || accentColor, marginRight: 10 }} />
                        <View>
                          <Text style={[styles.pickerName, { color: colors.text }]}>{item.workoutName.toUpperCase()}</Text>
                          <Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            {new Date(item.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                        {!sheetSelectionMode && (
                          <TouchableOpacity onPress={() => handleSessionOptions(item)} style={{ padding: 5 }}>
                            <Feather name="more-horizontal" size={20} color={colors.text} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedDayData?.completed?.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.subLabel, { color: colors.secondaryText, marginBottom: 10 }]}>COMPLETED</Text>
                  {selectedDayData.completed.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setSelectedDayData(null); navigation.navigate('SessionHistoryDetail', { session: item }); }}
                    >
                      <View>
                        <Text style={[styles.pickerName, { color: colors.text }]}>{item.workout_name.toUpperCase()}</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                          {new Date(item.completed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <AntDesign name="right" size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {(!selectedDayData?.planned?.length && !selectedDayData?.completed?.length) && (
                <Text style={{ color: colors.secondaryText, textAlign: 'center', marginVertical: 30, fontSize: 12 }}>NO SESSIONS FOR THIS DAY</Text>
              )}
            </ScrollView>

            {sheetSelectionMode && sheetSelectedSessions.length > 0 && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#FF3B30', justifyContent: 'center', marginTop: 10, paddingVertical: 15 }]}
                onPress={handleSheetBatchDelete}
              >
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={[styles.addBtnText, { fontSize: 12, color: '#FFF' }]}>DELETE SELECTED</Text>
              </TouchableOpacity>
            )}

            {selectedDayData?.isFutureOrToday && !sheetSelectionMode && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: accentColor, justifyContent: 'center', marginTop: 20, paddingVertical: 15 }]}
                onPress={() => {
                  const targetDate = selectedDayData.dateStr;
                  setSelectedDayData(null);
                  openAddPlanned(targetDate);
                }}
              >
                <AntDesign name="plus" size={16} color="#000" />
                <Text style={[styles.addBtnText, { fontSize: 12 }]}>SCHEDULE WORKOUT</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
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
  plannedTable: { borderWidth: 1, minHeight: 100, maxHeight: 300, overflow: 'hidden' },
  upcomingStrip: { flexDirection: 'row', paddingVertical: 10 },
  upcomingCard: {
    width: 160,
    height: 100,
    marginRight: 12,
    borderLeftWidth: 4,
    padding: 12,
    justifyContent: 'space-between'
  },
  ucDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ucDate: { fontSize: 10, fontWeight: '800' },
  ucTime: { fontSize: 10, fontWeight: '800' },
  ucName: { fontSize: 14, fontWeight: '900', marginTop: 8 },
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
