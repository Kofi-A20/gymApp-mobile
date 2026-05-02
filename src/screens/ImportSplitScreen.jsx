import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useRepsAlert } from '../context/AlertContext';
import { workoutsService } from '../services/workoutsService';
import { splitsService } from '../services/splitsService';
import { exercisesService } from '../services/exercisesService';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ImportSplitScreen = ({ route, navigation }) => {
  const { splitData } = route.params;
  const payload = splitData.split_payload;

  const { colors, accentColor, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();

  const [step, setStep] = useState(1); // 1: Preview, 2: Customize
  const [loading, setLoading] = useState(false);
  const [allExercises, setAllExercises] = useState([]);

  // Customization state
  const [customAssignments, setCustomAssignments] = useState(
    payload.assignments.map((ass, idx) => ({
      ...ass,
      id: idx, // temp id for keying
    }))
  );

  useEffect(() => {
    exercisesService.getAllExercises().then(setAllExercises);
  }, []);

  const handleImport = async (finalAssignments) => {
    setLoading(true);
    try {
      const newWorkoutIds = [];

      // 1. Group assignments by routineName to avoid creating duplicate workouts
      const uniqueRoutines = {};
      finalAssignments.forEach(ass => {
        if (!uniqueRoutines[ass.routineName]) {
          uniqueRoutines[ass.routineName] = ass.exercises;
        }
      });

      const routineMap = {}; // originalName -> newWorkoutId

      for (const name of Object.keys(uniqueRoutines)) {
        const exercisesToCreate = [];
        for (const sharedEx of uniqueRoutines[name]) {
          // Find matching exercise in local DB
          const match = allExercises.find(e => e.name.toLowerCase() === sharedEx.name.toLowerCase());
          if (match) {
            exercisesToCreate.push({
              exercise_id: match.id,
              sets_target: sharedEx.sets_target,
              reps_target: sharedEx.reps_target
            });
          }
        }

        if (exercisesToCreate.length > 0) {
          const newWorkout = await workoutsService.createWorkout(name, 'Imported from split share', exercisesToCreate);
          routineMap[name] = newWorkout.id;
        }
      }

      // 2. Build the split object
      const newSplit = {
        id: String(Date.now()),
        name: payload.splitName,
        isActive: false,
        recurrenceWeeks: parseInt(payload.recurrenceWeeks) || 1,
        assignments: finalAssignments.map(ass => ({
          dayOfWeek: ass.dayOfWeek,
          hour: ass.hour,
          minute: ass.minute,
          routineId: routineMap[ass.routineName],
          routineName: ass.routineName,
          routineColor: null,
        })).filter(a => a.routineId) // Only keep assignments where workout was created
      };

      await splitsService.saveSplit(newSplit);

      showAlert('SPLIT IMPORTED', 'Workouts added to your library. Activate the split from your Calendar to start scheduling.', [
        { text: 'OK', onPress: () => navigation.navigate('Tabs', { screen: 'Workouts', params: { screen: 'WorkoutsLibrary' } }) }
      ]);
    } catch (error) {
      console.error('[IMPORT SPLIT] Error:', error);
      showAlert('IMPORT FAILED', 'An error occurred while importing the split.');
    } finally {
      setLoading(false);
    }
  };

  const updateAssignment = (idx, field, value) => {
    const next = [...customAssignments];
    next[idx] = { ...next[idx], [field]: value };
    setCustomAssignments(next);
  };

  if (step === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <RepsHeader onLeftPress={() => navigation.goBack()} title="PREVIEW SPLIT" />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={[styles.title, { color: colors.text }]}>{payload.splitName.toUpperCase()}</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>EVERY {payload.recurrenceWeeks} WEEK(S)</Text>
          </View>

          <View style={styles.listContainer}>
            {payload.assignments.map((ass, idx) => (
              <AppTile key={idx} style={styles.assignmentTile}>
                <View style={styles.tileHeader}>
                  <Text style={[styles.dayName, { color: accentColor }]}>{DAYS[ass.dayOfWeek]}</Text>
                  <Text style={[styles.workoutName, { color: colors.text }]}>{ass.routineName.toUpperCase()}</Text>
                </View>
                <Text style={[styles.exCount, { color: colors.secondaryText }]}>{ass.exercises.length} EXERCISES</Text>
              </AppTile>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accentColor }]} onPress={() => setStep(2)}>
            <Text style={[styles.primaryBtnText, { color: '#000' }]}>CUSTOMISE SCHEDULE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => handleImport(payload.assignments)}>
            {loading ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.secondaryBtnText, { color: colors.text }]}>USE AS IS</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Customize
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader onLeftPress={() => setStep(1)} title="CUSTOMISE SPLIT" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.listContainer}>
          {customAssignments.map((ass, idx) => (
            <AppTile key={idx} style={styles.editTile}>
              <Text style={[styles.editRoutineName, { color: colors.text }]}>{ass.routineName.toUpperCase()}</Text>

              <View style={styles.daySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
                  {DAYS.map((day, dIdx) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, { borderColor: colors.border }, ass.dayOfWeek === dIdx && { backgroundColor: accentColor, borderColor: accentColor }]}
                      onPress={() => updateAssignment(idx, 'dayOfWeek', dIdx)}
                    >
                      <Text style={[styles.dayChipText, { color: ass.dayOfWeek === dIdx ? '#000' : colors.text }]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.timeSelector}>
                <View style={styles.timeInputGroup}>
                  <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>HOUR</Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.text, borderBottomColor: colors.border }]}
                    value={String(ass.hour)}
                    onChangeText={(val) => updateAssignment(idx, 'hour', parseInt(val.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.timeDivider, { color: colors.text }]}>:</Text>
                <View style={styles.timeInputGroup}>
                  <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>MIN</Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.text, borderBottomColor: colors.border }]}
                    value={String(ass.minute).padStart(2, '0')}
                    onChangeText={(val) => updateAssignment(idx, 'minute', parseInt(val.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
            </AppTile>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: accentColor }]} onPress={() => handleImport(customAssignments)}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { color: '#000' }]}>IMPORT SPLIT</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  hero: { marginBottom: 40 },
  title: { fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 46 },
  subtitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  listContainer: { gap: 16 },
  assignmentTile: { padding: 24 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  dayName: { fontSize: 14, fontWeight: '900', width: 40 },
  workoutName: { fontSize: 18, fontWeight: '900', flex: 1 },
  exCount: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 56 },
  footer: { padding: 20, borderTopWidth: 1 },
  primaryBtn: { height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  primaryBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  secondaryBtn: { height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  secondaryBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },

  editTile: { padding: 20, marginBottom: 12 },
  editRoutineName: { fontSize: 16, fontWeight: '900', marginBottom: 15 },
  daySelector: { marginBottom: 20 },
  dayScroll: { gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: 20 },
  dayChipText: { fontSize: 10, fontWeight: '800' },
  timeSelector: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  timeInputGroup: { alignItems: 'center' },
  timeLabel: { fontSize: 8, fontWeight: '800', marginBottom: 4 },
  timeInput: { width: 50, borderBottomWidth: 2, textAlign: 'center', fontSize: 24, fontWeight: '900', paddingVertical: 5 },
  timeDivider: { fontSize: 24, fontWeight: '900', marginTop: 15 }
});

export default ImportSplitScreen;
