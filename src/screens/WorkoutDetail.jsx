import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, AntDesign, Ionicons, Feather } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import Body from 'react-native-body-highlighter';
import { workoutsService } from '../services/workoutsService';
import { exercisesService } from '../services/exercisesService';
import { useRepsAlert } from '../context/AlertContext';
import { mapMuscleSlug, EXERCISE_FILTERS, exerciseMatchesFilter } from '../utils/muscleUtils';

const frontSlugs = new Set(['chest', 'biceps', 'abs', 'obliques', 'quadriceps', 'tibialis', 'knees', 'front-deltoids']);
const backSlugs = new Set(['upper-back', 'triceps', 'lower-back', 'gluteal', 'hamstring', 'calves', 'rear-deltoids']);
const bothSlugs = new Set(['trapezius', 'forearm']);

const getViewsToShow = (data) => {
  let showFront = false;
  let showBack = false;

  if (!data || data.length === 0) return { showFront: true, showBack: true };

  for (const d of data) {
    if (frontSlugs.has(d.slug)) showFront = true;
    if (backSlugs.has(d.slug)) showBack = true;
    if (bothSlugs.has(d.slug)) {
      showFront = true;
      showBack = true;
    }
  }

  if (!showFront && !showBack) return { showFront: true, showBack: true };
  return { showFront, showBack };
};

const WorkoutDetail = ({ route, navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const gender = profile?.gender === 'female' ? 'female' : 'male';
  const { startWorkout } = useWorkout();
  const { showAlert } = useRepsAlert();

  const [currentWorkout, setCurrentWorkout] = useState(route.params?.workout || null);
  const [loadingWorkout, setLoadingWorkout] = useState(!route.params?.workout);
  const [starting, setStarting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState({});
  const [editedExercises, setEditedExercises] = useState([]);
  const [editedWorkoutName, setEditedWorkoutName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route.params?.workout) {
      setCurrentWorkout(route.params.workout);
      setEditedExercises(JSON.parse(JSON.stringify(route.params.workout.exercises || [])));
      setEditedWorkoutName(route.params.workout.name || '');
      setLoadingWorkout(false);
    } else if (route.params?.workoutId) {
      fetchWorkoutDetail(route.params.workoutId);
    }
  }, [route.params]);

  const fetchWorkoutDetail = async (id) => {
    try {
      setLoadingWorkout(true);
      const data = await workoutsService.getWorkoutDetail(id);
      setCurrentWorkout(data);
      setEditedExercises(JSON.parse(JSON.stringify(data.exercises || [])));
      setEditedWorkoutName(data.name || '');
    } catch (err) {
      showAlert("Error", "Failed to load workout details");
      navigation.goBack();
    } finally {
      setLoadingWorkout(false);
    }
  };

  const toggleExpand = (index) => {
    if (isEditMode) return;
    setExpandedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [allExercises, setAllExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  useEffect(() => {
    if (isEditMode && allExercises.length === 0) {
      fetchExercises();
    }
  }, [isEditMode]);

  const fetchExercises = async () => {
    try {
      setLoadingExercises(true);
      const data = await exercisesService.getAllExercises();
      setAllExercises(data);
      setFilteredExercises(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    let result = allExercises;
    if (activeFilter !== 'ALL') {
      result = result.filter(ex => exerciseMatchesFilter(ex, activeFilter));
    }
    if (search) {
      result = result.filter(ex =>
        ex.name.toUpperCase().includes(search.toUpperCase()) ||
        ex.muscle_group?.toUpperCase().includes(search.toUpperCase())
      );
    }
    setFilteredExercises(result);
  }, [search, activeFilter, allExercises]);

  const handleStartSession = async () => {
    try {
      setStarting(true);
      await startWorkout(currentWorkout.id);
      navigation.navigate('ActiveWorkout');
    } catch (error) {
      showAlert('Error', 'Failed to start workout session');
    } finally {
      setStarting(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      Keyboard.dismiss();

      const missingTargets = editedExercises.find(ex => !ex.sets_target || !ex.reps_target);
      if (missingTargets) {
        showAlert('Missing data', `Please provide sets and reps for ${missingTargets.name}.`);
        setSaving(false);
        return;
      }

      const exercisesList = editedExercises.map(ex => ({
        ...ex,
        sets_target: parseInt(ex.sets_target, 10),
        reps_target: parseInt(ex.reps_target, 10),
      }));
      const newName = editedWorkoutName.trim() || (currentWorkout?.name || 'UNNAMED');

      // Dirty check: exit silently if nothing has changed
      const nameUnchanged = newName === (currentWorkout?.name || '');
      const exercisesUnchanged =
        exercisesList.length === (currentWorkout?.exercises || []).length &&
        exercisesList.every((ex, i) => {
          const orig = (currentWorkout?.exercises || [])[i];
          return orig &&
            (ex.exercise_id || ex.id) === (orig.exercise_id || orig.id) &&
            ex.sets_target === (parseInt(orig.sets_target, 10) || orig.sets_target) &&
            ex.reps_target === (parseInt(orig.reps_target, 10) || orig.reps_target);
        });

      if (nameUnchanged && exercisesUnchanged) {
        setIsEditMode(false);
        setSaving(false);
        return;
      }

      if (!currentWorkout?.id) throw new Error('Missing workout ID');

      await workoutsService.updateWorkout(currentWorkout.id, newName, currentWorkout.description, exercisesList);

      setCurrentWorkout(prev => ({ ...prev, name: newName, exercises: exercisesList }));
      setIsEditMode(false);
      showAlert('Success', 'Routine updated successfully.');
    } catch (err) {
      console.error('Workout saving error:', err);
      showAlert('Error', 'Failed to update workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkout = () => {
    showAlert(
      "Delete Workout",
      "Are you sure you want to delete this routine?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutsService.deleteWorkout(currentWorkout.id);
              navigation.goBack();
            } catch (err) {
              showAlert("Error", "Failed to delete workout");
            }
          }
        }
      ]
    );
  };

  if (loadingWorkout) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  const moveExercise = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === editedExercises.length - 1) return;
    setEditedExercises(prev => {
      const newItems = [...prev];
      const temp = newItems[index];
      newItems[index] = newItems[index + direction];
      newItems[index + direction] = temp;
      return newItems;
    });
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        onLeftPress={() => navigation.goBack()}
        centerContent={isEditMode ? (
          <TouchableOpacity onPress={() => {
            setIsEditMode(false);
            setEditedExercises(currentWorkout?.exercises ? JSON.parse(JSON.stringify(currentWorkout.exercises)) : []);
            setEditedWorkoutName(currentWorkout?.name || '');
          }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>CANCEL</Text>
          </TouchableOpacity>
        ) : null}
        title={isEditMode ? "" : "REPS"}
        rightActions={[{
          text: saving ? 'SAVING...' : (isEditMode ? 'Done' : 'Edit'),
          color: isEditMode ? accentColor : colors.text,
          onPress: () => {
            if (saving) return;
            if (isEditMode) handleSave();
            else setIsEditMode(true);
          }
        }]}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.content}>
          {isEditMode ? (
            <>
              <TextInput
                style={[styles.workoutTitle, { color: colors.text, padding: 0, margin: 0, borderBottomWidth: 1, borderBottomColor: colors.border }]}
                value={editedWorkoutName}
                onChangeText={setEditedWorkoutName}
                placeholder="ROUTINE NAME"
                placeholderTextColor={colors.secondaryText}
                autoCapitalize="characters"
              />
            </>
          ) : (
            <Text style={[styles.workoutTitle, { color: colors.text }]}>{currentWorkout.name.toUpperCase()}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderLeftColor: colors.text }]}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>MOVEMENTS</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{editedExercises.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>ESTIMATED TIME</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>~ {editedExercises.length * 12} MIN</Text>
            </View>
          </View>
        </View>

        {/* ── Exercise list ── */}
        <View style={{ paddingHorizontal: 24 }}>
        {editedExercises.map((item, index) => {
          const isExpanded = expandedExercises[index];
          return (
            <AppTile
              key={item.exercise_id || item.id ? `ex-${item.exercise_id || item.id}` : `idx-${index}`}
              onPress={isEditMode ? undefined : () => toggleExpand(index)}
              style={{ padding: 20, marginBottom: 12 }}
            >
              <View style={styles.exerciseHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name?.toUpperCase()}</Text>
                    <Text style={[styles.exerciseDetails, { color: colors.secondaryText }]}>
                      {isEditMode ? `MOVEMENT ARCHIVE ${index + 1}` : `${item.sets_target || 3} SETS × ${item.reps_target || 10} REPS`}
                    </Text>
                  </View>
                </View>
                {isEditMode ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity onPress={() => moveExercise(index, -1)} disabled={index === 0}>
                        <Ionicons name="arrow-up-circle-outline" size={24} color={index === 0 ? colors.border : colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveExercise(index, 1)} disabled={index === editedExercises.length - 1}>
                        <Ionicons name="arrow-down-circle-outline" size={24} color={index === editedExercises.length - 1 ? colors.border : colors.text} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setEditedExercises(prev => prev.filter((_, i) => i !== index))}>
                      <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <AntDesign name={isExpanded ? 'down' : 'right'} size={16} color={colors.text} />
                )}
              </View>

              {isEditMode ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 15, marginTop: 15 }}>
                  <TextInput
                    style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="SETS"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                    value={String(item.sets_target || '')}
                    onChangeText={(val) => {
                      const numValue = val.replace(/[^0-9]/g, '');
                      setEditedExercises(prev => {
                        const copy = [...prev];
                        copy[index] = { ...copy[index], sets_target: numValue };
                        return copy;
                      });
                    }}
                  />
                  <Text style={{ color: colors.secondaryText, fontSize: 16 }}>×</Text>
                  <TextInput
                    style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="REPS"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                    value={String(item.reps_target || '')}
                    onChangeText={(val) => {
                      const numValue = val.replace(/[^0-9]/g, '');
                      setEditedExercises(prev => {
                        const copy = [...prev];
                        copy[index] = { ...copy[index], reps_target: numValue };
                        return copy;
                      });
                    }}
                  />
                </View>
              ) : (
                isExpanded && (() => {
                  const bodyData = [
                    ...(item.primary_muscles || []).map(m => ({ slug: mapMuscleSlug(m), intensity: 2 })),
                    ...(item.secondary_muscles || []).map(m => ({ slug: mapMuscleSlug(m), intensity: 1 })),
                  ].filter(d => d.slug);
                  const { showFront, showBack } = getViewsToShow(bodyData);
                  return (
                    <View style={{ paddingTop: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 10 }}>
                        {showFront && (
                          <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                            <Body data={bodyData} side="front" gender={gender} scale={0.5} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
                          </View>
                        )}
                        {showBack && (
                          <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                            <Body data={bodyData} side="back" gender={gender} scale={0.5} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })()
              )}
            </AppTile>
          );
        })}
        </View>

        {/* ── Footer ── */}
        <View style={styles.content}>
          {isEditMode ? (
            <View>
              <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#FF3B30' }]} onPress={handleDeleteWorkout}>
                <Text style={[styles.logBtnText, { color: '#FFF' }]}>DELETE ROUTINE</Text>
                <MaterialCommunityIcons name="delete" size={24} color="#FFF" />
              </TouchableOpacity>

              <View style={{ marginTop: 60, borderTopWidth: 1, borderColor: colors.border, paddingTop: 40 }}>
                <Text style={[styles.statLabel, { color: colors.secondaryText, marginBottom: 20 }]}>APPEND MOVEMENTS</Text>

                <View style={[styles.searchBox, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="search" size={16} color={colors.secondaryText} style={{ marginRight: 8 }} />
                    <TextInput
                      placeholder="FIND EXERCISE..."
                      placeholderTextColor={colors.secondaryText}
                      style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }}
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, marginBottom: 30 }}>
                  {EXERCISE_FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setActiveFilter(f)}
                      style={{ paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: activeFilter === f ? (isDarkMode ? '#FFF' : '#000') : 'transparent' }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '800', color: activeFilter === f ? (isDarkMode ? '#000' : '#FFF') : colors.text }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View>
                  {loadingExercises ? (
                    <ActivityIndicator color={colors.text} style={{ padding: 40 }} />
                  ) : (
                    filteredExercises.map((ex) => {
                      const alreadyAdded = editedExercises.find(s => (s.exercise_id || s.id) === ex.id);
                      if (alreadyAdded) return null;
                      return (
                        <AppTile
                          key={ex.id}
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 12 }}
                          onPress={() => setEditedExercises(prev => [...prev, { ...ex, sets_target: '', reps_target: '' }])}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '800', marginRight: 20, color: colors.secondaryText }}>+</Text>
                          <View>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{ex.name.toUpperCase()}</Text>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: colors.secondaryText, marginTop: 2 }}>{ex.muscle_group?.toUpperCase() || 'GENERAL'}</Text>
                          </View>
                        </AppTile>
                      );
                    })
                  )}
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.logBtn, { backgroundColor: accentColor }]}
              onPress={handleStartSession}
              disabled={starting}
            >
              <Text style={styles.logBtnText}>{starting ? 'INITIALIZING...' : 'START SESSION'}</Text>
              <Ionicons name="play" size={20} color="#000" />
            </TouchableOpacity>
          )}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  backBtn: {
    padding: 5,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sessionId: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  workoutTitle: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 40,
  },
  statItem: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  focusContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imageWrapper: {
    flex: 1,
    aspectRatio: 0.8,
  },
  focusImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  focusOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  focusOverlayText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  focusTextWrapper: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  focusDescription: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  exerciseCard: {
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  exerciseDetails: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },
  cuesContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 2,
  },
  cuesTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  cueRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cueId: {
    fontSize: 12,
    fontWeight: '900',
    marginRight: 12,
  },
  cueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  logBtn: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginTop: 16,
  },
  logBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 10,
    letterSpacing: 1,
  },
  searchBox: {
    padding: 20,
    borderRadius: 2,
    borderWidth: 1,
  },
  targetInput: {
    width: 60,
    borderBottomWidth: 2,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    paddingVertical: 5,
  },
});

export default WorkoutDetail;
