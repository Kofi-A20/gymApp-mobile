import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import RepsHeader from '../components/RepsHeader';
import { splitsService } from '../services/splitsService';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const EditSplitScreen = ({ navigation, route }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  const existingSplit = route.params?.split;
  const [splitName, setSplitName] = useState(existingSplit?.name || '');
  const [assignments, setAssignments] = useState(existingSplit?.assignments || []);
  
  const [workouts, setWorkouts] = useState([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  
  // State for active assignment being edited
  const [activeDayIndex, setActiveDayIndex] = useState(null); // 0-6
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [planHour, setPlanHour] = useState(8);
  const [planMinute, setPlanMinute] = useState(0);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(1);

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
    };

    try {
      await splitsService.saveSplit(split);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save split.');
    }
  };

  const removeAssignment = (assignmentId) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  const openAddRoutine = (dayOfWeek) => {
    setActiveDayIndex(dayOfWeek);
    setShowRoutineModal(true);
  };

  const handleSelectRoutine = (workout) => {
    setSelectedRoutine(workout);
    setShowRoutineModal(false);
    setRecurrenceWeeks(1);
    setShowTimeModal(true);
  };

  const handleConfirmTime = () => {
    if (!selectedRoutine) return;

    const newAssignment = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      routineId: selectedRoutine.id,
      routineName: selectedRoutine.name,
      routineColor: selectedRoutine.color || null,
      dayOfWeek: activeDayIndex,
      hour: planHour,
      minute: planMinute,
      recurrenceWeeks: recurrenceWeeks,
    };

    setAssignments(prev => [...prev, newAssignment]);
    setShowTimeModal(false);
    setSelectedRoutine(null);
    setActiveDayIndex(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        title={existingSplit ? "EDIT SPLIT" : "NEW SPLIT"}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ text: 'SAVE', onPress: handleSave, color: colors.accent }]}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>SPLIT NAME</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#111' : '#FFF' }]}
            value={splitName}
            onChangeText={setSplitName}
            placeholder="e.g. Push Pull Legs"
            placeholderTextColor={colors.secondaryText}
          />
        </View>

        <View style={styles.scheduleHeader}>
          <Text style={[styles.label, { color: colors.secondaryText, marginBottom: 0 }]}>WEEKLY SCHEDULE</Text>
        </View>

        {DAYS.map((dayName, dayIndex) => {
          const dayAssignments = assignments.filter(a => a.dayOfWeek === dayIndex);
          return (
            <View key={dayIndex} style={[styles.dayBlock, { borderColor: colors.border }]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, { color: colors.text }]}>{dayName}</Text>
                <TouchableOpacity onPress={() => openAddRoutine(dayIndex)} style={styles.addIconBtn}>
                  <AntDesign name="plus" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {dayAssignments.length === 0 ? (
                <Text style={[styles.emptyDayText, { color: colors.secondaryText }]}>Rest day</Text>
              ) : (
                dayAssignments.map(a => (
                  <View key={a.id} style={[styles.assignmentCard, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5', borderLeftColor: a.routineColor || colors.accent }]}>
                    <View style={styles.assignmentInfo}>
                      <Text style={[styles.aRoutine, { color: colors.text }]}>{a.routineName}</Text>
                      <Text style={[styles.aTime, { color: colors.secondaryText }]}>
                        {a.hour.toString().padStart(2, '0')}:{a.minute.toString().padStart(2, '0')} • {(a.recurrenceWeeks || 1) === 1 ? 'Every Week' : `Every ${a.recurrenceWeeks} Weeks`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeAssignment(a.id)} style={{ padding: 5 }}>
                      <MaterialCommunityIcons name="close" size={20} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          );
        })}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Routine Selection Modal */}
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
                  onPress={() => handleSelectRoutine(item)}
                >
                  <Text style={[styles.pickerName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
                  <AntDesign name="right" size={16} color={colors.accent} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Time Selection Modal */}
      <Modal visible={showTimeModal} transparent animationType="fade" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.planBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center', marginBottom: 20 }]}>SET TIME</Text>
            
            <Text style={[styles.label, { color: colors.secondaryText, marginTop: 10, textAlign: 'center' }]}>TIME (24H)</Text>
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

            <Text style={[styles.label, { color: colors.secondaryText, marginTop: 10, textAlign: 'center' }]}>REPEATS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 10 }}>
              {[1, 2, 3, 4].map(w => (
                <TouchableOpacity 
                  key={w} 
                  onPress={() => setRecurrenceWeeks(w)}
                  style={[
                    styles.recurrenceChip,
                    { borderColor: colors.border },
                    recurrenceWeeks === w && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                >
                  <Text style={[styles.recurrenceText, { color: recurrenceWeeks === w ? '#000' : colors.text }]}>
                    {w === 1 ? 'Every Week' : `Every ${w} Weeks`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.pActionRow}>
              <TouchableOpacity style={[styles.pBtn, { flex: 1 }]} onPress={() => setShowTimeModal(false)}>
                <Text style={[styles.pBtnText, { color: colors.secondaryText }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pBtn, { flex: 2, backgroundColor: colors.accent }]} onPress={handleConfirmTime}>
                <Text style={[styles.pBtnText, { color: '#000' }]}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  inputGroup: { marginBottom: 30 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  scheduleHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 10,
  },
  dayBlock: {
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  addIconBtn: {
    padding: 5,
  },
  emptyDayText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  assignmentInfo: {
    flex: 1,
  },
  aRoutine: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  aTime: {
    fontSize: 12,
    fontWeight: '700',
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
  planBox: {
    width: '100%',
    borderWidth: 1,
    padding: 24,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
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
    marginTop: 20,
    paddingTop: 10,
    gap: 10,
  },
  pBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  pBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  recurrenceChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  recurrenceText: {
    fontSize: 12,
    fontWeight: '900',
  },
});

export default EditSplitScreen;
