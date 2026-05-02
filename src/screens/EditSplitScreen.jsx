import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, Alert, Platform, ActionSheetIOS } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import RepsHeader from '../components/RepsHeader';
import { splitsService } from '../services/splitsService';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import AppTile from '../components/AppTile';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FULL_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const EditSplitScreen = ({ navigation, route }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  
  const existingSplit = route.params?.split;
  const [splitName, setSplitName] = useState(existingSplit?.name || '');
  const [assignments, setAssignments] = useState(existingSplit?.assignments || []);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(existingSplit?.recurrenceWeeks || 1);
  
  const [workouts, setWorkouts] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0); // Show Sunday by default
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const data = await workoutsService.getUserWorkouts();
      setWorkouts(data);
    } catch (e) {
      console.error('Failed to load workouts', e);
    }
  };

  const handleSave = async () => {
    if (!splitName.trim()) {
      Alert.alert('Validation', 'Please enter a name for the split.');
      return;
    }
    if (assignments.length === 0) {
      Alert.alert('Validation', 'Please assign at least one routine to a day.');
      return;
    }

    const split = {
      id: existingSplit?.id || Date.now().toString(),
      name: splitName.trim(),
      isActive: existingSplit ? existingSplit.isActive : false,
      assignments,
      recurrenceWeeks,
    };

    try {
      await splitsService.saveSplit(split);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save split.');
    }
  };

  const handleRecurrenceSelect = () => {
    const options = ['Weekly', 'Every Two Weeks', 'Every Three Weeks', 'Every Month', 'Cancel'];
    const values = [1, 2, 3, 4];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4, title: 'Select Split Recurrence' },
        (index) => {
          if (index < 4) setRecurrenceWeeks(values[index]);
        }
      );
    } else {
      Alert.alert('Select Recurrence', '', [
        ...values.map((v, i) => ({ text: options[i], onPress: () => setRecurrenceWeeks(v) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const getRecurrenceLabel = () => {
    switch (recurrenceWeeks) {
      case 1: return 'Weekly';
      case 2: return 'Every Two Weeks';
      case 3: return 'Every Three Weeks';
      case 4: return 'Every Month';
      default: return 'Weekly';
    }
  };

  const handleAddRoutine = () => {
    if (workouts.length === 0) {
      Alert.alert('No Routines', 'You need to create a workout routine first.');
      return;
    }
    
    if (Platform.OS === 'ios') {
      const options = workouts.map(w => w.name);
      options.push('Cancel');
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Select Routine',
        },
        (buttonIndex) => {
          if (buttonIndex !== options.length - 1) {
            addAssignment(workouts[buttonIndex]);
          }
        }
      );
    } else {
      setShowRoutineModal(true);
    }
  };

  const addAssignment = (workout) => {
    const newAssignment = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      routineId: workout.id,
      routineName: workout.name,
      routineColor: workout.color || null,
      dayOfWeek: activeDayIndex,
      hour: 8,
      minute: 0,
    };
    setAssignments(prev => [...prev, newAssignment]);
    setShowRoutineModal(false);
  };

  const removeAssignment = (assignmentId) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  const openTimePicker = (assignmentId) => {
    setEditingAssignmentId(assignmentId);
    setShowTimePicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    
    if (event.type === 'set' && selectedDate && editingAssignmentId) {
      setAssignments(prev => prev.map(a => {
        if (a.id === editingAssignmentId) {
          return { ...a, hour: selectedDate.getHours(), minute: selectedDate.getMinutes() };
        }
        return a;
      }));
    }
  };

  const activeDayAssignments = assignments.filter(a => a.dayOfWeek === activeDayIndex);

  const getEditingDate = () => {
    if (!editingAssignmentId) return new Date();
    const assignment = assignments.find(a => a.id === editingAssignmentId);
    if (!assignment) return new Date();
    const d = new Date();
    d.setHours(assignment.hour, assignment.minute, 0, 0);
    return d;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        title={existingSplit ? "EDIT SPLIT" : "NEW SPLIT"}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ text: 'SAVE', onPress: handleSave, color: accentColor }]}
      />
      
      <ScrollView style={[styles.content, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>SPLIT NAME</Text>
          <AppTile style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={splitName}
              onChangeText={setSplitName}
              placeholder="e.g. Push Pull Legs"
              placeholderTextColor={colors.secondaryText}
            />
          </AppTile>
        </View>

        <View style={styles.scheduleHeader}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>WEEKLY SCHEDULE</Text>
          <TouchableOpacity
            onPress={handleRecurrenceSelect}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: colors.secondaryBackground,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{getRecurrenceLabel()}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Day Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorScroll}>
          {DAYS.map((dayName, index) => {
            const isSelected = activeDayIndex === index;
            const hasAssignments = assignments.some(a => a.dayOfWeek === index);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setActiveDayIndex(index)}
                style={[
                  styles.dayPill,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: accentColor, borderColor: accentColor }
                ]}
              >
                <Text style={[
                  styles.dayPillText,
                  { color: isSelected ? '#000' : colors.text }
                ]}>{dayName}</Text>
                {hasAssignments && (
                  <View style={[styles.indicatorDot, { backgroundColor: isSelected ? '#000' : accentColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.dayContent}>
          <Text style={[styles.selectedDayTitle, { color: colors.text }]}>{FULL_DAYS[activeDayIndex]} SCHEDULE</Text>

          {activeDayAssignments.length === 0 ? (
            <View style={[styles.emptyDayBox, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
              <Ionicons name="moon" size={32} color={colors.border} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyDayText, { color: colors.secondaryText }]}>REST DAY</Text>
              <Text style={[styles.emptyDaySubtext, { color: colors.secondaryText }]}>No routines assigned for this day.</Text>
            </View>
          ) : (
            activeDayAssignments.map(a => (
              <AppTile key={a.id} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <View style={[styles.colorIndicator, { backgroundColor: a.routineColor || accentColor }]} />
                  <Text style={[styles.aRoutine, { color: colors.text }]} numberOfLines={1}>{a.routineName}</Text>
                  <TouchableOpacity onPress={() => removeAssignment(a.id)} style={{ padding: 5 }}>
                    <MaterialCommunityIcons name="close-circle-outline" size={24} color={colors.secondaryText} />
                  </TouchableOpacity>
                </View>

                <View style={styles.assignmentControls}>
                  <TouchableOpacity style={styles.controlBox} onPress={() => openTimePicker(a.id)}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={colors.secondaryText} style={{ marginRight: 6 }} />
                    <Text style={[styles.controlText, { color: colors.text }]}>
                      {a.hour.toString().padStart(2, '0')}:{a.minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </AppTile>
            ))
          )}

          <TouchableOpacity style={[styles.addRoutineBtn, { borderColor: colors.border }]} onPress={handleAddRoutine}>
            <AntDesign name="plus" size={16} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.addRoutineText, { color: colors.text }]}>ADD ROUTINE TO {DAYS[activeDayIndex]}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Routine Selection Modal (Android only) */}
      <Modal visible={showRoutineModal} transparent animationType="slide" onRequestClose={() => setShowRoutineModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>PICK ROUTINE</Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)}>
                <AntDesign name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={workouts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => addAssignment(item)}
                >
                  <Text style={[styles.pickerName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
                  <AntDesign name="right" size={16} color={accentColor} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* iOS Native Time Picker Modal Wrapper */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal transparent animationType="fade" visible={showTimePicker}>
          <View style={styles.modalOverlay}>
            <View style={[styles.iosPickerBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={{ color: accentColor, fontWeight: '800' }}>DONE</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={getEditingDate()}
                mode="time"
                display="spinner"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                onChange={onTimeChange}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Native Time Picker */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={getEditingDate()}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  inputGroup: { marginBottom: 30 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    height: 60,
    justifyContent: 'center',
  },
  input: {
    fontSize: 18,
    fontWeight: '700',
  },
  scheduleHeader: {
    marginBottom: 15,
  },
  daySelectorScroll: {
    paddingBottom: 20,
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  dayContent: {
    marginTop: 10,
  },
  selectedDayTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  emptyDayBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyDayText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
  },
  emptyDaySubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  assignmentCard: {
    padding: 16,
    marginBottom: 16,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  aRoutine: {
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  assignmentControls: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
    paddingTop: 16,
    gap: 16,
  },
  controlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 12,
    fontWeight: '800',
  },
  addRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 10,
  },
  addRoutineText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    padding: 20,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  pickerName: {
    fontSize: 16,
    fontWeight: '900',
  },
  iosPickerBox: {
    width: '100%',
    borderRadius: 16,
    paddingBottom: 20,
    borderWidth: 1,
  },
  iosPickerHeader: {
    alignItems: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
});

export default EditSplitScreen;
