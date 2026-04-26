import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { exercisesService } from '../services/exercisesService';
import { Feather, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import { useRepsAlert } from '../context/AlertContext';
import { EXERCISE_FILTERS, exerciseMatchesFilter } from '../utils/muscleUtils';

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

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setWorkoutName('');
      setSearch('');
      setActiveFilter('ALL');
      setSelectedExercises([]);
    });
    return unsubscribe;
  }, [navigation]);

  // Toggle selection on tap (no inline sets/reps — that's on Screen 2)
  const handleRowPress = (ex) => {
    const isSelected = selectedExercises.find(s => s.id === ex.id);
    if (isSelected) {
      setSelectedExercises(prev => prev.filter(s => s.id !== ex.id));
    } else {
      setSelectedExercises(prev => [...prev, { ...ex, sets_target: '', reps_target: '' }]);
    }
  };

  // Validate then proceed to Screen 2
  const handleNext = () => {
    if (!workoutName.trim()) {
      showAlert('Error', 'Please enter a workout name.');
      return;
    }
    if (selectedExercises.length === 0) {
      showAlert('Error', 'Please select at least one exercise.');
      return;
    }
    navigation.navigate('ConfigureWorkout', {
      workoutName: workoutName.trim(),
      selectedExercises,
    });
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
              {EXERCISE_FILTERS.map((f) => (
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

            {/* Selected count badge in card header */}
          <View style={styles.selectedList}>
              {loading ? (
                <ActivityIndicator color={colors.text} style={{ padding: 40 }} />
              ) : (
                  <FlatList
                    data={filteredExercises}
                    keyExtractor={(ex) => String(ex.id)}
                    scrollEnabled={true}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    style={{ maxHeight: 400 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: ex, index }) => {
                      const isSelected = selectedExercises.find(s => s.id === ex.id);
                      return (
                        <TouchableOpacity
                          key={ex.id}
                          activeOpacity={1}
                          style={[
                            styles.exerciseItemContainer,
                            {
                              backgroundColor: isSelected ? (isDarkMode ? '#111' : '#F0F0F0') : colors.background,
                              borderColor: isSelected ? colors.accent : colors.border,
                              borderWidth: 1,
                              marginBottom: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 15,
                            }
                          ]}
                          onPress={() => handleRowPress(ex)}
                        >
                          {/* Check / index */}
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={22} color={colors.accent} style={{ marginRight: 16 }} />
                          ) : (
                            <Text style={[styles.exerciseId, { color: colors.secondaryText, marginRight: 16 }]}>
                              {String(index + 1).padStart(2, '0')}
                            </Text>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.exerciseName, { color: colors.text }]}>
                              {ex.name.toUpperCase()}
                            </Text>
                            <Text style={[styles.exerciseFocus, { color: colors.secondaryText }]}>
                              {ex.muscle_group?.toUpperCase() || 'GENERAL'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
              )}

              {filteredExercises.length === 0 && !loading && (
                <Text style={{ color: colors.secondaryText, textAlign: 'center', marginVertical: 20 }}>
                  NO MOVEMENTS MATCH YOUR SEARCH
                </Text>
              )}
            </View>
          </View>

          {/* Selection summary */}
          {selectedExercises.length > 0 && (
            <View style={[styles.selectionSummary, { borderColor: colors.border }]}>
              <Text style={[styles.selectionSummaryText, { color: colors.secondaryText }]}>
                {selectedExercises.length} MOVEMENT{selectedExercises.length !== 1 ? 'S' : ''} SELECTED
              </Text>
            </View>
          )}

          {/* Next CTA */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent }]}
            onPress={handleNext}
          >
            <Text style={[styles.saveBtnText, { color: isDarkMode ? '#000' : '#FFF' }]}>NEXT — SET TARGETS →</Text>
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
  selectionSummary: {
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  selectionSummaryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  saveBtn: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default AddWorkout;
