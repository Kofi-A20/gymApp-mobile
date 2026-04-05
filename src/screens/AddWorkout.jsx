import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { exercisesService } from '../services/exercisesService';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, AntDesign, Feather } from '@expo/vector-icons';

const FILTERS = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS'];

const AddWorkout = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
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
      result = result.filter(ex => ex.body_part?.toUpperCase() === activeFilter);
    }

    if (search) {
      result = result.filter(ex => 
        ex.name.toUpperCase().includes(search.toUpperCase()) || 
        ex.body_part?.toUpperCase().includes(search.toUpperCase())
      );
    }

    setFilteredExercises(result);
  }, [search, activeFilter, allExercises]);

  const toggleExerciseSelection = (exercise) => {
    const isSelected = selectedExercises.find(ex => ex.id === exercise.id);
    if (isSelected) {
      setSelectedExercises(selectedExercises.filter(ex => ex.id !== exercise.id));
    } else {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const handleCreateWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }

    setSaving(true);
    try {
      // Create the workout with the selected exercises
      // In our current schema, we need to pass exercises as an array of IDs or names
      // The workoutsService.createWorkout takes (name, description, exercises)
      const exercisesList = selectedExercises.map(ex => ({
        exercise_id: ex.id,
        name: ex.name,
      }));
      
      await workoutsService.createWorkout(workoutName, '', exercisesList);
      Alert.alert('Success', 'Workout template created');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <AntDesign name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
           <Text style={[styles.cancelBtn, { color: colors.text }]}>CANCEL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>NEW ENTRY</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>DEFINE{"\n"}THE SESSION</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText }]}>
             Precision starts before the first lift. Name your routine and select your movements from the monolith library.
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
                  filteredExercises.map((ex, index) => {
                    const isSelected = selectedExercises.find(s => s.id === ex.id);
                    return (
                      <TouchableOpacity 
                        key={ex.id} 
                        style={[
                          styles.exerciseItem, 
                          { 
                            backgroundColor: isSelected ? colors.text : colors.background, 
                            borderColor: colors.border 
                          }
                        ]}
                        onPress={() => toggleExerciseSelection(ex)}
                      >
                         <Text style={[
                           styles.exerciseId, 
                           { color: isSelected ? colors.background : colors.secondaryText }
                         ]}>
                           {String(index + 1).padStart(2, '0')}
                         </Text>
                         <View>
                            <Text style={[
                              styles.exerciseName, 
                              { color: isSelected ? colors.background : colors.text }
                            ]}>{ex.name.toUpperCase()}</Text>
                            <Text style={[
                              styles.exerciseFocus, 
                              { color: isSelected ? colors.background : colors.secondaryText }
                            ]}>{ex.body_part?.toUpperCase() || 'GENERAL'}</Text>
                         </View>
                         {isSelected && (
                           <AntDesign name="check" size={20} color={colors.background} style={{ marginLeft: 'auto' }} />
                         )}
                      </TouchableOpacity>
                    );
                  })
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
            style={[styles.saveBtn, { backgroundColor: '#CCFF00' }]} 
            onPress={handleCreateWorkout}
            disabled={saving}
          >
             {saving ? (
               <ActivityIndicator color="#000" />
             ) : (
               <Text style={styles.saveBtnText}>COMMIT WORKOUT</Text>
             )}
          </TouchableOpacity>

          {/* Branded Footer */}
          <View style={styles.brandedFooter}>
             <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=600' }}
                style={styles.footerImage}
             />
             <View style={styles.footerOverlay}>
                <Text style={styles.footerTitle}>VISUAL{"\n"}DISCIPLINE</Text>
                <View style={styles.footerLine} />
                <Text style={styles.footerSub}>FORM FOLLOWS FOCUS</Text>
             </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
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
  appendBtn: {
    marginTop: 10,
    padding: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appendBtnText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 10,
    letterSpacing: 1,
  },
  brandedFooter: {
    marginTop: 60,
    height: 400,
    position: 'relative',
  },
  footerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    opacity: 0.8,
  },
  footerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerTitle: {
    color: '#000',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1,
  },
  footerLine: {
    width: 60,
    height: 3,
    backgroundColor: '#000',
    marginVertical: 20,
  },
  footerSub: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default AddWorkout;
