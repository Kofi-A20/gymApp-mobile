import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { MaterialCommunityIcons, AntDesign, Ionicons, Feather } from '@expo/vector-icons';
import { workoutsService } from '../services/workoutsService';
import { exercisesService } from '../services/exercisesService';
import { useMonolithAlert } from '../context/AlertContext';

const FILTERS = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS'];

const WorkoutDetail = ({ route, navigation }) => {
  const { workout } = route.params || {};
  const { colors, isDarkMode } = useTheme();
  const { startWorkout } = useWorkout();
  const { showAlert } = useMonolithAlert();
  
  const [starting, setStarting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState({});
  const [editedExercises, setEditedExercises] = useState(workout?.exercises ? JSON.parse(JSON.stringify(workout.exercises)) : []);

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
      result = result.filter(ex => ex.muscle_group?.toUpperCase() === activeFilter);
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
      await startWorkout(workout.id);
      navigation.navigate('ActiveWorkout');
    } catch (error) {
      showAlert('Error', 'Failed to start workout session');
    } finally {
      setStarting(false);
    }
  };

  const handleSave = async () => {
    const missingTargets = editedExercises.find(ex => !ex.sets_target || !ex.reps_target);
    if (missingTargets) {
      showAlert('Error', `Please provide sets and reps for ${missingTargets.name.toUpperCase()}`);
      return;
    }

    try {
      setStarting(true);
      const exercisesList = editedExercises.map(ex => ({
        ...ex,
        sets_target: parseInt(ex.sets_target, 10),
        reps_target: parseInt(ex.reps_target, 10),
      }));
      await workoutsService.updateWorkout(workout.id, workout.name, workout.description, exercisesList);
      setIsEditMode(false);
    } catch (err) {
      showAlert("Error", "Failed to update workout. Please try again.");
    } finally {
      setStarting(false);
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
                await workoutsService.deleteWorkout(workout.id);
                navigation.goBack();
             } catch (err) {
                showAlert("Error", "Failed to delete workout");
             }
          }
        }
      ]
    );
  };

  if (!workout) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>WORKOUT NOT FOUND</Text>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.content}>
      <Text style={[styles.sessionId, { color: colors.secondaryText }]}>TEMPLATE_ID: {workout.id.split('-')[0].toUpperCase()}</Text>
      <Text style={[styles.workoutTitle, { color: colors.text }]}>{workout.name.toUpperCase()}</Text>

      {/* Stats Row */}
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

      {/* Featured Focus Section */}
      <View style={styles.focusContainer}>
        <View style={styles.imageWrapper}>
           <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600' }} 
              style={styles.focusImage} 
           />
           <View style={styles.focusOverlay}>
              <Text style={styles.focusOverlayText}>PRIMARY FOCUS</Text>
           </View>
        </View>
        <View style={styles.focusTextWrapper}>
           <Text style={[styles.focusDescription, { color: colors.text }]}>
              {workout.description || "A high-intensity protocol designed for structural hypertrophy and architectural strength. Maintain rigid core tension throughout all movements."}
           </Text>
        </View>
      </View>

      <View style={{height: 20}} />
    </View>
  );

  const renderFooter = () => (
    <View style={styles.content}>
      {isEditMode ? (
        <View>
          <TouchableOpacity 
            style={[styles.logBtn, { backgroundColor: '#FF3B30' }]}
            onPress={handleDeleteWorkout}
          >
            <Text style={[styles.logBtnText, { color: '#FFF' }]}>DELETE ROUTINE</Text>
            <MaterialCommunityIcons name="delete" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Inline Library Append UI */}
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
                {FILTERS.map((f) => (
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
                      <TouchableOpacity 
                        key={ex.id} 
                        style={{ flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background }}
                        onPress={() => setEditedExercises(prev => [...prev, { ...ex, sets_target: '', reps_target: '' }])}
                      >
                         <Text style={{ fontSize: 18, fontWeight: '800', marginRight: 20, color: colors.secondaryText }}>+</Text>
                         <View>
                            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{ex.name.toUpperCase()}</Text>
                            <Text style={{ fontSize: 8, fontWeight: '600', color: colors.secondaryText, marginTop: 2 }}>{ex.muscle_group?.toUpperCase() || 'GENERAL'}</Text>
                         </View>
                      </TouchableOpacity>
                    );
                  })
                )}
             </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.logBtn}
          onPress={handleStartSession}
          disabled={starting}
        >
          <Text style={styles.logBtnText}>{starting ? 'INITIALIZING...' : 'START SESSION'}</Text>
          <AntDesign name="play" size={20} color="#000" />
        </TouchableOpacity>
      )}
      <View style={{ height: 100 }} />
    </View>
  );

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

  const renderExerciseItem = ({ item, index }) => {
    const isExpanded = expandedExercises[index];

    return (
        <TouchableOpacity
          disabled={isEditMode}
          onPress={() => toggleExpand(index)}
          style={[
            styles.exerciseCard,
            { paddingHorizontal: 24, paddingVertical: 10, marginBottom: 20 },
            isEditMode && { backgroundColor: isDarkMode ? '#1A1A1A' : '#FAFAFA', borderRadius: 8, borderWidth: 1, borderColor: colors.border }
          ]}
        >
          <View style={styles.exerciseHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
              <View style={{flex: 1}}>
                <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name?.toUpperCase()}</Text>
                <Text style={[styles.exerciseDetails, { color: colors.secondaryText }]}>
                  {isEditMode ? `MOVEMENT ARCHIVE ${index + 1}` : `${item.sets_target || 3} SETS × ${item.reps_target || 10} REPS`}
                </Text>
              </View>
            </View>
            {isEditMode ? (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                 <View style={{flexDirection: 'row', gap: 10}}>
                   <TouchableOpacity onPress={() => moveExercise(index, -1)} disabled={index === 0}>
                     <Ionicons name="arrow-up-circle-outline" size={24} color={index === 0 ? colors.border : colors.text} />
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => moveExercise(index, 1)} disabled={index === editedExercises.length - 1}>
                     <Ionicons name="arrow-down-circle-outline" size={24} color={index === editedExercises.length - 1 ? colors.border : colors.text} />
                   </TouchableOpacity>
                 </View>
                 <TouchableOpacity onPress={() => {
                    setEditedExercises(prev => prev.filter((_, i) => i !== index));
                 }}>
                   <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
                 </TouchableOpacity>
              </View>
            ) : (
              <AntDesign name={isExpanded ? "down" : "right"} size={16} color={colors.text} />
            )}
          </View>

          {isEditMode ? (
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, gap: 15, marginTop: 15, backgroundColor: colors.secondaryBackground }}>
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
                <Text style={{color: colors.secondaryText, fontSize: 16}}>×</Text>
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
             isExpanded && (
               <View style={[styles.cuesContainer, { backgroundColor: colors.secondaryBackground }]}>
                  <Text style={[styles.cuesTitle, { color: colors.secondaryText }]}>COACHING CUES</Text>
                  <View style={styles.cueRow}>
                     <Text style={[styles.cueId, { color: colors.text }]}>01</Text>
                     <Text style={[styles.cueText, { color: colors.text }]}>Maintain absolute control throughout the full range of motion.</Text>
                  </View>
                  <View style={styles.cueRow}>
                     <Text style={[styles.cueId, { color: colors.text }]}>02</Text>
                     <Text style={[styles.cueText, { color: colors.text }]}>Mind-muscle synchronization is mandatory for adaptation.</Text>
                  </View>
               </View>
             )
          )}
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={{flex: 1, alignItems: 'flex-start'}}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <AntDesign name="arrowleft" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{flex: 1, alignItems: 'center'}}>
          {isEditMode ? (
             <TouchableOpacity onPress={() => { setIsEditMode(false); setEditedExercises(workout?.exercises ? JSON.parse(JSON.stringify(workout.exercises)) : []); }} style={{padding: 5}}>
                <Text style={{color: colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 1}}>CANCEL</Text>
             </TouchableOpacity>
          ) : (
             <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
          )}
        </View>

        <View style={{flex: 1, alignItems: 'flex-end'}}>
          <TouchableOpacity onPress={() => isEditMode ? handleSave() : setIsEditMode(true)} style={{padding: 5}}>
             <Text style={{color: isEditMode ? '#CCFF00' : colors.text, fontWeight: '700', fontSize: 12, letterSpacing: 1}}>
               {isEditMode ? 'DONE' : 'EDIT'}
             </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.container}>
        <FlatList
          data={editedExercises}
          keyExtractor={(item, index) => `item-${item.id || index}`}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          renderItem={renderExerciseItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
    backgroundColor: '#CCFF00', // Neon highlighter green
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginTop: 40,
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
