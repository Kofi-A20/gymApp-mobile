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
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { useRepsAlert } from '../context/AlertContext';
import { MaterialCommunityIcons, AntDesign, Ionicons, Feather } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import BottomSheet from '../components/BottomSheet';
import YoutubeIframe from 'react-native-youtube-iframe';
import { exerciseDBService } from '../services/exerciseDBService';

const UI_STORAGE_KEY = '@reps_activeWorkout_ui';

const ActiveWorkout = ({ navigation }) => {
  const { colors, isDarkMode, units, accentColor } = useTheme();
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

  // Info Sheet
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoData, setInfoData] = useState({ loading: false, details: null, video: null });
  const [activeInfoExName, setActiveInfoExName] = useState('');

  const openInfo = async (exercise) => {
    setActiveInfoExName(exercise.name);
    setInfoVisible(true);
    setInfoData({ loading: true, details: null, video: null });

    const details = await exerciseDBService.getExerciseDetails(exercise.name);
    const video = await exerciseDBService.getYouTubeVideo(exercise.name, exercise.muscle_group);
    
    setInfoData({ loading: false, details, video });
  };

  // Gate the persist effect — don't write state until restore has completed
  const hasRestored = useRef(false);

  // Allow navigation.goBack() through after user confirms DISCARD
  const discardConfirmed = useRef(false);

  // Refs for reps inputs to allow auto-focus
  const repsInputsRefs = useRef({});
  const restEndTime = useRef(0);

  // Session timer tick
  useEffect(() => {
    if (!activeSession?.started_at) return;
    const startMs = new Date(activeSession.started_at).getTime();

    const updateTimers = () => {
      const now = Date.now();
      setSessionTimer(Math.floor((now - startMs) / 1000));
      
      if (restEndTime.current > 0) {
        const remaining = Math.ceil((restEndTime.current - now) / 1000);
        if (remaining > 0) {
          setRestRemaining(remaining);
        } else {
          setRestRemaining(0);
          restEndTime.current = 0;
        }
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') updateTimers();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [activeSession?.started_at]);

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
            if (saved.restEndTime && saved.restEndTime > Date.now()) {
              restEndTime.current = saved.restEndTime;
              setRestRemaining(Math.ceil((saved.restEndTime - Date.now()) / 1000));
            } else {
              restEndTime.current = 0;
              setRestRemaining(0);
            }
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
          restEndTime: restEndTime.current,
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
    
    // Allow unticking an already completed set
    if (completedSets[key]) {
      setCompletedSets(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    const exercise = activeSession?.exercises?.find(ex => (ex.id || ex.exercise_id) === exId);
    const targetReps = exercise?.reps_target ? String(exercise.reps_target) : '';

    const weight = setInputs[key]?.weight;
    const reps = setInputs[key]?.reps !== undefined ? setInputs[key].reps : targetReps;

    if (!weight || !reps) {
      showAlert('MISSING DATA', 'Enter weight and reps before completing a set.');
      return;
    }

    // Make sure we save the auto-filled reps if they weren't explicitly typed
    if (setInputs[key]?.reps === undefined) {
      setSetInputs(prev => ({
        ...prev,
        [key]: { ...prev[key], reps },
      }));
    }

    setCompletedSets(prev => ({ ...prev, [key]: true }));
    const duration = parseInt(restDuration) || 90;
    restEndTime.current = Date.now() + duration * 1000;
    setRestRemaining(duration);
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
      discardConfirmed.current = true;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Tabs', params: { screen: 'Log', params: { resetTimestamp: Date.now() } } }],
      });
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
              <View style={[styles.restBadge, { backgroundColor: accentColor }]}>
                <MaterialCommunityIcons name="timer-sand" size={11} color="#000" />
                <Text style={styles.restBadgeText}>{formatTime(restRemaining)}</Text>
              </View>
            )}
            <MaterialCommunityIcons name="clock-outline" size={14} color={colors.text} />
            <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(sessionTimer)}</Text>
          </View>
        }
        rightActions={[{ text: 'FINISH', color: accentColor, onPress: handleFinish }]}
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
              <AppTile
                key={exId}
                style={[
                  styles.exerciseSection,
                  { backgroundColor: 'transparent', borderColor: colors.border }
                ]}
              >
                {/* Exercise name row */}
                <View style={styles.exerciseNameRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {allDone && (
                      <MaterialCommunityIcons name="check-circle" size={16} color={accentColor} style={{ marginRight: 8 }} />
                    )}
                    <Text style={[styles.exerciseName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                      {exercise.name?.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openInfo(exercise)} style={{ padding: 4 }}>
                    <Feather name="info" size={18} color={colors.secondaryText} />
                  </TouchableOpacity>
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
                      <Text style={[styles.setNum, { color: done ? accentColor : colors.secondaryText }]}>
                        {setIdx + 1}
                      </Text>

                      {/* Weight input */}
                      <TextInput
                        style={[
                          styles.setInput,
                          {
                            color: done ? accentColor : colors.text,
                            borderBottomColor: done ? 'transparent' : colors.border,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor={colors.secondaryText}
                        value={setInputs[key]?.weight || ''}
                        onChangeText={v => handleInputChange(exId, setIdx, 'weight', v)}
                        editable={!done && !locked}
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          repsInputsRefs.current[key]?.focus();
                        }}
                      />

                      {/* Reps input */}
                      <TextInput
                        ref={el => (repsInputsRefs.current[key] = el)}
                        style={[
                          styles.setInput,
                          {
                            color: done ? accentColor : colors.text,
                            borderBottomColor: done ? 'transparent' : colors.border,
                          },
                        ]}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor={colors.secondaryText}
                        value={setInputs[key]?.reps !== undefined ? setInputs[key].reps : (exercise.reps_target ? String(exercise.reps_target) : '')}
                        onChangeText={v => handleInputChange(exId, setIdx, 'reps', v)}
                        editable={!done && !locked}
                        onSubmitEditing={() => {
                          handleTick(exId, setIdx);
                        }}
                      />

                      {/* Done checkbox */}
                      <TouchableOpacity
                        style={[
                          styles.checkbox,
                          {
                            borderColor: done ? accentColor : colors.border,
                            backgroundColor: done ? accentColor : 'transparent',
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
              </AppTile>
            );
          })}


          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={infoVisible} onClose={() => setInfoVisible(false)} snapHeight="60%">
        <ScrollView style={{ width: '100%', marginTop: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.mainTitle, { color: colors.text, fontSize: 24, marginBottom: 20 }]}>
            {activeInfoExName?.toUpperCase()}
          </Text>
          {infoData.loading ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
          ) : (
            <View style={{ paddingBottom: 40 }}>
              {infoData.video && (
                <View style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden' }}>
                  <YoutubeIframe
                    height={200}
                    play={false}
                    videoId={infoData.video.videoId}
                  />
                </View>
              )}
              {infoData.details?.instructions && infoData.details.instructions.length > 0 && (
                <View>
                  <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 10, letterSpacing: 1 }}>INSTRUCTIONS</Text>
                  {infoData.details.instructions.map((step, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
                      <Text style={{ color: accentColor, fontWeight: '900', marginRight: 8, fontSize: 14 }}>{i + 1}.</Text>
                      <Text style={{ color: colors.secondaryText, flex: 1, lineHeight: 22, fontSize: 14 }}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </BottomSheet>
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
