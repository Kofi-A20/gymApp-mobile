import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, TextInput, ActivityIndicator, Keyboard, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { exercisesService } from '../services/exercisesService';
import { Feather, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import { useRepsAlert } from '../context/AlertContext';
import { EXERCISE_FILTERS, exerciseMatchesFilter } from '../utils/muscleUtils';
import AppTile from '../components/AppTile';

// ─── Memoised exercise row to avoid full-list re-renders ─────────────────────
const ExerciseRow = React.memo(({ ex, index, isSelected, onPress, colors, isDarkMode }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    style={[
      styles.exerciseItemContainer,
      {
        backgroundColor: isSelected ? (isDarkMode ? '#111' : '#F0F0F0') : 'transparent',
        borderColor: isSelected ? colors.accent : colors.border,
        borderWidth: 1,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
      }
    ]}
    onPress={onPress}
  >
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
));

const CreateWorkout = ({ navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();
  const [workoutName, setWorkoutName] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [allExercises, setAllExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const listRef = useRef(null);


  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const data = await exercisesService.getAllExercises();
      setAllExercises(data);
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = useMemo(() => {
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

    return result;
  }, [search, activeFilter, allExercises]);

  // Reset scroll position when filter or search changes
  useEffect(() => {
    if (listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollTo({ y: 0, animated: false });
      }, 0);
    }
  }, [activeFilter, search]);

  // Toggle selection on tap (no inline sets/reps — that's on Screen 2)
  const handleRowPress = useCallback((ex) => {
    setSelectedExercises(prev => {
      const isSelected = prev.find(s => s.id === ex.id);
      if (isSelected) {
        return prev.filter(s => s.id !== ex.id);
      } else {
        return [...prev, { ...ex, sets_target: '', reps_target: '' }];
      }
    });
  }, []);

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
    <View
      style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      <RepsHeader
        leftIcon="close"
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ text: 'CANCEL', onPress: () => navigation.goBack() }]}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>

          <Text style={[styles.mainTitle, { color: colors.text }]}>CREATE{"\n"}WORKOUT</Text>

          {/* Workout Name Input */}
          <AppTile style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>WORKOUT NAME</Text>
            <TextInput
              style={[styles.mainInput, { color: colors.text }]}
              placeholder="E.G. HYPERTROPHY A"
              placeholderTextColor={isDarkMode ? '#333' : '#CCC'}
              value={workoutName}
              onChangeText={setWorkoutName}
              autoCapitalize="characters"
              blurOnSubmit={true}
              onSubmitEditing={Keyboard.dismiss}
            />
          </AppTile>

          {/* Movement Search */}
          <AppTile style={styles.searchBox}>
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
          </AppTile>

          {/* Body Focus Filters */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.secondaryText }]}>BODY FOCUS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {EXERCISE_FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => {
                    InteractionManager.runAfterInteractions(() => {
                      setActiveFilter(f);
                    });
                  }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: activeFilter === f ? colors.accent : 'transparent',
                      opacity: pressed ? 0.6 : 1,
                    },
                    activeFilter === f && { borderColor: colors.accent }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: activeFilter === f ? '#000' : colors.text }
                  ]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Exercise Selection List */}
          <AppTile style={styles.selectionCard}>
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
                <ScrollView
                  ref={listRef}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={{ maxHeight: 300 }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredExercises.map((ex, index) => {
                    const isSelected = !!selectedExercises.find(s => s.id === ex.id);
                    return (
                      <ExerciseRow
                        key={ex.id}
                        ex={ex}
                        index={index}
                        isSelected={isSelected}
                        onPress={() => handleRowPress(ex)}
                        colors={colors}
                        isDarkMode={isDarkMode}
                      />
                    );
                  })}
                  {filteredExercises.length === 0 && (
                    <Text style={{ color: colors.secondaryText, textAlign: 'center', marginVertical: 20 }}>
                      NO MOVEMENTS MATCH YOUR SEARCH
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>
          </AppTile>

          {/* Next CTA */}
          <AppTile
            onPress={handleNext}
            style={[styles.saveBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Text style={[styles.saveBtnText, { color: '#000' }]}>NEXT — SET TARGETS →</Text>
          </AppTile>

          <View style={{ height: 60 }} />

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
    paddingTop: 10,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -2,
    lineHeight: 52,
  },
  inputGroup: {
    padding: 20,
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  mainInput: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    paddingVertical: 5,
  },
  searchBox: {
    marginTop: 20,
    padding: 20,
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
    marginTop: 20,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  filterScroll: {
    paddingRight: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 24,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  selectionCard: {
    marginTop: 20,
    marginBottom: 20,
    padding: 24,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
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
  selectedList: {
    // container for the scrollview
  },
  exerciseItemContainer: {
    borderRadius: 16,
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
  saveBtn: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default CreateWorkout;
