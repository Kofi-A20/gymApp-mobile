import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { exercisesService } from '../services/exercisesService';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, AntDesign, Feather, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import { useRepsAlert } from '../context/AlertContext';

const FILTERS = ['ALL', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'FOREARMS'];

const AddWorkout = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();
  const [workoutName, setWorkoutName] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [allExercises, setAllExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);
  const [draftTargets, setDraftTargets] = useState({ sets: '', reps: '' });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const data = await exercisesService.getAllExercises();
      setAllExercises(data);
      setFilteredExercises(data);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = allExercises;

    if (activeFilter !== 'ALL') {
      result = result.filter(ex => {
        const mg = ex.muscle_group?.toUpperCase() || '';
        const cat = ex.category?.toUpperCase() || '';
        if (activeFilter === 'FOREARMS') {
          return mg === 'FOREARMS' || ex.name.toUpperCase().includes('FOREARM');
        }
        return mg.includes(activeFilter) || cat.includes(activeFilter);
      });
    }

    if (search) {
      result = result.filter(ex =>
        ex.name.toUpperCase().includes(search.toUpperCase()) ||
        ex.muscle_group?.toUpperCase().includes(search.toUpperCase())
      );
    }

    setFilteredExercises(result);
  }, [search, activeFilter, allExercises]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setWorkoutName('');
      setSearch('');
      setActiveFilter('ALL');
      setSelectedExercises([]);
    });
    return unsubscribe;
  }, [navigation]);

  const handleRowPress = (ex) => {
    const isSelected = selectedExercises.find(s => s.id === ex.id);

    if (expandedExerciseId === ex.id) {
      setExpandedExerciseId(null);
    } else {
      setExpandedExerciseId(ex.id);
      setDraftTargets({
        sets: isSelected?.sets_target?.toString() || '',
        reps: isSelected?.reps_target?.toString() || ''
      });
    }
  };

  const handleSaveTargets = (exId) => {
    const isAlreadySelected = selectedExercises.find(ex => ex.id === exId);
    const updatedSets = draftTargets.sets;
    const updatedReps = draftTargets.reps;

    if (isAlreadySelected) {
      setSelectedExercises(prev =>
        prev.map(ex => ex.id === exId ? { ...ex, sets_target: updatedSets, reps_target: updatedReps } : ex)
      );
    } else {
      const exercise = allExercises.find(ex => ex.id === exId);
      setSelectedExercises(prev => [...prev, { ...exercise, sets_target: updatedSets, reps_target: updatedReps }]);
    }

    setExpandedExerciseId(null);
  };

  const handleCreateWorkout = async () => {
    if (!workoutName.trim()) {
      showAlert('Error', 'Please enter a workout name');
      return;
    }
    if (selectedExercises.length === 0) {
      showAlert('Error', 'Please select at least one exercise before saving your workout routine.');
      return;
    }

    const missingTargets = selectedExercises.find(ex => !ex.sets_target || !ex.reps_target);
    if (missingTargets) {
      showAlert('Error', `Please provide sets and reps for ${missingTargets.name.toUpperCase()}`);
      return;
    }

    setSaving(true);
    try {
      const exercisesList = selectedExercises.map(ex => ({
        exercise_id: ex.id,
        name: ex.name,
        sets_target: parseInt(ex.sets_target, 10),
        reps_target: parseInt(ex.reps_target, 10),
      }));

      await workoutsService.createWorkout(workoutName, '', exercisesList);
      showAlert('Success', 'Workout template created');
      navigation.goBack();
    } catch (error) {
      showAlert('Error', 'Failed to create workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        leftIcon="close"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ text: 'CANCEL', onPress: () => navigation.goBack() }]}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>NEW ENTRY</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>DEFINE{"\n"}THE SESSION</Text>

          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Precision starts before the first lift. Name your routine and select your movements from the reps library.
          </Text>

          {/* Workout Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>WORKOUT NAME</Text>
            <TextInput
              style={[styles.mainInput, { color: colors.text, borderBottomColor: colors.border }]}
              placeholder="E.G. HYPERTROPHY A"
              placeholderTextColor={isDarkMode ? '#333' : '#CCC'}
              value={workoutName}
              onChangeText={setWorkoutName}
              autoCapitalize="characters"
            />
          </View>

          {/* Movement Search */}
          <View style={[styles.searchBox, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.searchLabel, { color: colors.secondaryText }]}>MOVEMENT SEARCH</Text>
            <View style={styles.searchRow}>
              <Feather name="search" size={16} color={colors.secondaryText} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="FIND EXERCISE..."
                placeholderTextColor={colors.secondaryText}
                style={[styles.searchInput, { color: colors.text }]}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {/* Body Focus Filters */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.secondaryText }]}>BODY FOCUS</Text>
            <View style={styles.filterGrid}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setActiveFilter(f)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === f ? (isDarkMode ? '#FFF' : '#000') : 'transparent',
                      borderColor: colors.border
                    }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: activeFilter === f ? (isDarkMode ? '#000' : '#FFF') : colors.text }
                  ]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Exercise Selection List */}
          <View style={[styles.selectionCard, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <View style={styles.selectionHeader}>
              <Text style={[styles.selectionTitle, { color: colors.text }]}>EXERCISE{"\n"}SELECTION</Text>
              <Text style={[styles.selectionCount, { color: colors.secondaryText }]}>
                {String(selectedExercises.length).padStart(2, '0')} ITEMS{"\n"}SELECTED
              </Text>
            </View>

            <View style={styles.selectedList}>
              {loading ? (
                <ActivityIndicator color={colors.text} style={{ padding: 40 }} />
              ) : (
                <View style={{ maxHeight: 400 }}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {filteredExercises.map((ex, index) => {
                      const isSelected = selectedExercises.find(s => s.id === ex.id);
                      return (
                        <View
                          key={ex.id}
                          style={[
                            styles.exerciseItemContainer,
                            {
                              backgroundColor: isSelected ? isDarkMode ? '#111' : '#F5F5F5' : colors.background,
                              borderColor: colors.border,
                              borderWidth: 1,
                              marginBottom: 12
                            }
                          ]}
                        >
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}
                            onPress={() => handleRowPress(ex)}
                          >
                            <Text style={[
                              styles.exerciseId,
                              { color: isSelected ? colors.text : colors.secondaryText }
                            ]}>
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[
                                styles.exerciseName,
                                { color: colors.text }
                              ]}>{ex.name.toUpperCase()}</Text>
                              <Text style={[
                                styles.exerciseFocus,
                                { color: colors.secondaryText }
                              ]}>{ex.muscle_group?.toUpperCase() || 'GENERAL'}</Text>
                            </View>
                            {isSelected && expandedExerciseId !== ex.id && (
                              <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 16 }}>
                                {isSelected.sets_target} × {isSelected.reps_target}
                              </Text>
                            )}
                          </TouchableOpacity>

                          {expandedExerciseId === ex.id && (
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 15, gap: 15 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
                                <TextInput
                                  style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                                  placeholder="SETS"
                                  placeholderTextColor={colors.secondaryText}
                                  keyboardType="numeric"
                                  value={draftTargets.sets}
                                  onChangeText={(val) => setDraftTargets(prev => ({ ...prev, sets: val.replace(/[^0-9]/g, '') }))}
                                />
                                <Text style={{ color: colors.secondaryText, fontSize: 16 }}>×</Text>
                                <TextInput
                                  style={[styles.targetInput, { color: colors.text, borderColor: colors.border }]}
                                  placeholder="REPS"
                                  placeholderTextColor={colors.secondaryText}
                                  keyboardType="numeric"
                                  value={draftTargets.reps}
                                  onChangeText={(val) => setDraftTargets(prev => ({ ...prev, reps: val.replace(/[^0-9]/g, '') }))}
                                />
                              </View>
                              <TouchableOpacity
                                style={{ backgroundColor: colors.accent, paddingHorizontal: 30, paddingVertical: 10, borderRadius: 2 }}
                                onPress={() => handleSaveTargets(ex.id)}
                              >
                                <Text style={{ fontWeight: '800', fontSize: 12, color: '#000', letterSpacing: 1 }}>SAVE</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {filteredExercises.length === 0 && !loading && (
                <Text style={{ color: colors.secondaryText, textAlign: 'center', marginVertical: 20 }}>
                  NO MOVEMENTS MATCH YOUR SEARCH
                </Text>
              )}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={handleCreateWorkout}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>CREATE WORKOUT ROUTINE</Text>
            )}
          </TouchableOpacity>

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
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  cancelBtn: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -2,
    lineHeight: 52,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 25,
  },
  inputGroup: {
    marginTop: 50,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  mainInput: {
    fontSize: 36,
    fontWeight: '900',
    borderBottomWidth: 2,
    paddingVertical: 10,
    letterSpacing: -1,
  },
  searchBox: {
    marginTop: 40,
    padding: 20,
    borderRadius: 2,
    borderWidth: 1,
  },
  searchLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  filterSection: {
    marginTop: 40,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 1,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  selectionCard: {
    marginTop: 60,
    padding: 24,
    borderWidth: 1,
    borderRadius: 2,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  selectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectionCount: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  exerciseItemContainer: {
    borderRadius: 0,
  },
  exerciseId: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 20,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '900',
  },
  exerciseFocus: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  targetInput: {
    width: 60,
    borderBottomWidth: 2,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    paddingVertical: 5,
  },
  saveBtn: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    borderRadius: 2,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default AddWorkout;
