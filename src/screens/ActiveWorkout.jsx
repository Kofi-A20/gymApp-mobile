import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { useRepsAlert } from '../context/AlertContext';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';

const UI_STORAGE_KEY = '@reps_activeWorkout_ui';

const ActiveWorkout = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const insets = useSafeAreaInsets();
  const { activeSession, finishWorkout, cancelWorkout } = useWorkout();
  const { showAlert } = useRepsAlert();

  // Session timer
  const [sessionTimer, setSessionTimer] = useState(0);

  // Per-set input values: key = "exerciseId-setIndex", value = { weight, reps }
  const [setInputs, setSetInputs] = useState({});

  // Completed sets: key = "exerciseId-setIndex", value = true
  const [completedSets, setCompletedSets] = useState({});

  // Rest timer
  const [restDuration, setRestDuration] = useState('90');
  const [restRemaining, setRestRemaining] = useState(0);

  // Session notes
  const [notes, setNotes] = useState('');

  // Gate the persist effect — don't write state until restore has completed
  const hasRestored = useRef(false);

  // Allow navigation.goBack() through after user confirms DISCARD
  const discardConfirmed = useRef(false);

  // Session timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTimer(prev => prev + 1);
      setRestRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Restore UI state from AsyncStorage when session loads
  useEffect(() => {
    if (!activeSession?.id) return;
    hasRestored.current = false; // reset for new session
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(UI_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.sessionId === activeSession.id) {
            setSetInputs(saved.setInputs || {});
            setCompletedSets(saved.completedSets || {});
            setNotes(saved.notes || '');
            setRestDuration(saved.restDuration || '90');
          }
        }
      } catch (e) {
        // Nothing to restore
      } finally {
        hasRestored.current = true;
      }
    };
    restore();
  }, [activeSession?.id]);

  // Persist UI state to AsyncStorage on every change — only after restore is complete
  useEffect(() => {
    if (!activeSession?.id || !hasRestored.current) return;
    const save = async () => {
      try {
        await AsyncStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
          sessionId: activeSession.id,
          setInputs,
          completedSets,
          notes,
          restDuration,
        }));
      } catch (e) {
        // Fail silently
      }
    };
    save();
  }, [setInputs, completedSets, notes, restDuration, activeSession?.id]);

  // Hardware back button interception
  useEffect(() => {
    const onBack = () => {
      handleCancel();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  // Navigation gesture interception
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (discardConfirmed.current) return; // user confirmed — let it through
      e.preventDefault();
      handleCancel();
    });
    return unsubscribe;
  }, [navigation]);

  // Hide tab bar while active session is open
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleInputChange = (exId, setIdx, field, value) => {
    const key = `${exId}-${setIdx}`;
    setSetInputs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleTick = (exId, setIdx) => {
    const key = `${exId}-${setIdx}`;
    if (completedSets[key]) return;

    const weight = setInputs[key]?.weight;
    const reps = setInputs[key]?.reps;

    if (!weight || !reps) {
      showAlert('MISSING DATA', 'Enter weight and reps before completing a set.');
      return;
    }

    setCompletedSets(prev => ({ ...prev, [key]: true }));
    setRestRemaining(parseInt(restDuration) || 90);
  };

  const isSetLocked = (exId, setIdx) => {
    if (setIdx === 0) return false;
    const prevKey = `${exId}-${setIdx - 1}`;
    return !completedSets[prevKey];
  };

  const allSetsComplete = () => {
    if (!activeSession?.exercises) return false;
    for (const ex of activeSession.exercises) {
      const exId = ex.id || ex.exercise_id;
      const count = ex.sets_target || 3;
      for (let i = 0; i < count; i++) {
        if (!completedSets[`${exId}-${i}`]) return false;
      }
    }
    return true;
  };

  const handleFinish = () => {
    if (!allSetsComplete()) {
      showAlert(
        'INCOMPLETE SESSION',
        'Some sets are not yet marked complete. Finish anyway?',
        [
          { text: 'KEEP WORKING', style: 'cancel' },
          { text: 'FINISH EARLY', style: 'destructive', onPress: commitSession },
        ]
      );
    } else {
      showAlert(
        'FINISH SESSION',
        'Are you sure you want to commit this session to Reps?',
        [
          { text: 'CANCEL', style: 'cancel' },
          { text: 'COMMIT', onPress: commitSession },
        ]
      );
    }
  };

  const commitSession = async () => {
    try {
      await AsyncStorage.removeItem(UI_STORAGE_KEY);
      const setsToCommit = {};
      Object.keys(completedSets).forEach(key => {
        if (completedSets[key]) {
          setsToCommit[key] = {
            weight: setInputs[key]?.weight || '0',
            reps: setInputs[key]?.reps || '0',
          };
        }
      });
      await finishWorkout(setsToCommit, notes);
      navigation.navigate('Tabs', { screen: 'Log' });
    } catch (e) {
      showAlert('ERROR', 'Failed to save session. Please try again.');
    }
  };

  const handleCancel = useCallback(() => {
    showAlert(
      'CANCEL SESSION',
      'Discard all logged data? This action is irreversible.',
      [
        { text: 'KEEP WORKING', style: 'cancel' },
        {
          text: 'DISCARD',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(UI_STORAGE_KEY);
            await cancelWorkout();
            discardConfirmed.current = true;
            navigation.goBack();
          },
        },
      ]
    );
  }, [showAlert, cancelWorkout, navigation]);

  if (!activeSession) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader 
        leftIcon="close" 
        onLeftPress={handleCancel} 
        centerContent={
          <View style={styles.headerCenter}>
            {restRemaining > 0 && (
              <View style={[styles.restBadge, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name="timer-sand" size={11} color="#000" />
                <Text style={styles.restBadgeText}>{formatTime(restRemaining)}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text} />
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(sessionTimer)}</Text>
          </View>
        }
        rightActions={[{ text: 'FINISH', color: colors.accent, onPress: handleFinish }]}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Title */}
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>ACTIVE PROTOCOL</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {activeSession.workout_name?.toUpperCase() || 'FREE SESSION'}
          </Text>

          {/* Rest duration config */}
          <View style={styles.restConfig}>
            <Text style={[styles.restConfigLabel, { color: colors.secondaryText }]}>REST (SEC)</Text>
            <TextInput
              style={[styles.restConfigInput, { color: colors.text, borderColor: colors.border }]}
              value={restDuration}
              onChangeText={setRestDuration}
              keyboardType="numeric"
            />
          </View>

          {/* Exercise Sections */}
          {activeSession.exercises?.map((exercise, exIdx) => {
            const exId = exercise.id || exercise.exercise_id;
            const setsCount = exercise.sets_target || 3;

            const allDone = Array.from({ length: setsCount }).every((_, i) =>
              completedSets[`${exId}-${i}`]
            );

            return (
              <View key={exId} style={[styles.exerciseSection, { borderColor: colors.border }]}>
                {/* Exercise name row */}
                <View style={styles.exerciseNameRow}>
                  {allDone && (
                    <MaterialCommunityIcons name="check-circle" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  )}
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name?.toUpperCase()}
                  </Text>
                </View>

                {/* Sets table header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.thText, { flex: 0.5, color: colors.secondaryText }]}>SET</Text>
                  <Text style={[styles.thText, { flex: 1, textAlign: 'center', color: colors.secondaryText }]}>
                    {units.toUpperCase()}
                  </Text>
                  <Text style={[styles.thText, { flex: 1, textAlign: 'center', color: colors.secondaryText }]}>REPS</Text>
                  <Text style={[styles.thText, { flex: 0.5, textAlign: 'right', color: colors.secondaryText }]}>DONE</Text>
                </View>

                {/* Set rows */}
                {Array.from({ length: setsCount }).map((_, setIdx) => {
                  const key = `${exId}-${setIdx}`;
                  const locked = isSetLocked(exId, setIdx);
                  const done = !!completedSets[key];
                  const rowOpacity = locked ? 0.3 : 1;
                  const rowBg = done ? (isDarkMode ? '#1A2400' : '#F4FFD4') : 'transparent';

                  return (
                    <View
                      key={key}
                      style={[styles.setRow, { opacity: rowOpacity, backgroundColor: rowBg }]}
                    >
                      {/* Set number */}
                      <Text style={[styles.setNum, { color: done ? colors.accent : colors.secondaryText }]}>
                        {setIdx + 1}
                      </Text>

                      {/* Weight input */}
                      <TextInput
                        style={[
                          styles.setInput,
                          {
                            color: done ? colors.accent : colors.text,
                            borderBottomColor: done ? 'transparent' : colors.border,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor={colors.secondaryText}
                        value={setInputs[key]?.weight || ''}
                        onChangeText={v => handleInputChange(exId, setIdx, 'weight', v)}
                        editable={!done && !locked}
                      />

                      {/* Reps input */}
                      <TextInput
                        style={[
                          styles.setInput,
                          {
                            color: done ? colors.accent : colors.text,
                            borderBottomColor: done ? 'transparent' : colors.border,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor={colors.secondaryText}
                        value={setInputs[key]?.reps || ''}
                        onChangeText={v => handleInputChange(exId, setIdx, 'reps', v)}
                        editable={!done && !locked}
                      />

                      {/* Done checkbox */}
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          {
                            borderColor: done ? colors.accent : colors.border,
                            backgroundColor: done ? colors.accent : 'transparent',
                          },
                        ]}
                        onPress={() => handleTick(exId, setIdx)}
                        disabled={done || locked}
                      >
                        {done && <AntDesign name="check" size={12} color="#000" />}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Session notes */}
          <View style={styles.notesSection}>
            <Text style={[styles.subLabel, { color: colors.secondaryText }]}>SESSION LOGS</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="ANY OBSERVATIONS?"
              placeholderTextColor={colors.secondaryText}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    gap: 4,
    marginRight: 4,
  },
  restBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
  },
  finishBtn: {
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 20,
  },
  restConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  restConfigLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  restConfigInput: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '900',
    width: 52,
    textAlign: 'center',
  },
  exerciseSection: {
    marginTop: 28,
    borderWidth: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  thText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  setNum: {
    flex: 0.5,
    fontSize: 13,
    fontWeight: '900',
  },
  setInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    borderBottomWidth: 1,
    paddingVertical: 4,
    marginHorizontal: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  notesSection: {
    marginTop: 36,
    gap: 10,
  },
  notesInput: {
    borderWidth: 1,
    padding: 14,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
});

export default ActiveWorkout;
