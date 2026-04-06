import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { MaterialCommunityIcons, AntDesign, Feather } from '@expo/vector-icons';
import { useMonolithAlert } from '../context/AlertContext';

const ActiveWorkout = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const { activeSession, activeSets, logSet, finishWorkout, cancelWorkout } = useWorkout();
  const { showAlert } = useMonolithAlert();
  
  const [notes, setNotes] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = async () => {
    showAlert(
      "FINISH SESSION",
      "Are you sure you want to commit this session to the Monolith?",
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "COMMIT", 
          onPress: async () => {
            try {
              await finishWorkout(notes);
              navigation.navigate('Tabs', { screen: 'Log' });
            } catch (error) {
              showAlert("Error", "Failed to save session");
            }
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    showAlert(
      "CANCEL SESSION",
      "Discard all logged data? This action is irreversible.",
      [
        { text: "KEEP WORKING", style: "cancel" },
        { 
          text: "DISCARD", 
          style: "destructive",
          onPress: () => {
            cancelWorkout();
            navigation.goBack();
          }
        }
      ]
    );
  };

  if (!activeSession) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>NO ACTIVE SESSION</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#CCFF00' }}>GO BACK</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
           <AntDesign name="close" size={24} color={colors.secondaryText} />
        </TouchableOpacity>
        <View style={styles.timerContainer}>
           <MaterialCommunityIcons name="clock-outline" size={16} color="#CCFF00" />
           <Text style={[styles.timerText, { color: '#CCFF00' }]}>{formatTime(timer)}</Text>
        </View>
        <TouchableOpacity onPress={handleFinish}>
           <Text style={styles.finishBtn}>FINISH</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>ACTIVE PROTOCOL</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{activeSession.workout_name?.toUpperCase() || 'FREE SESSION'}</Text>

          {/* Exercise Logging Section */}
          {activeSession.exercises?.map((exercise, exIdx) => (
            <View key={exercise.exercise_id || exIdx} style={styles.exerciseSection}>
               <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name.toUpperCase()}</Text>
               
               {/* Logged Sets for this Exercise */}
               <View style={styles.setsList}>
                  {activeSets.filter(s => s.exercise_id === exercise.exercise_id).map((set, sIdx) => (
                    <View key={set.id || sIdx} style={[styles.setRow, { borderBottomColor: colors.border }]}>
                       <Text style={[styles.setNum, { color: colors.secondaryText }]}>SET {set.set_number}</Text>
                       <Text style={[styles.setData, { color: colors.text }]}>{set.weight_kg} {units.toUpperCase()} × {set.reps}</Text>
                       {set.is_pr && <MaterialCommunityIcons name="trophy" size={16} color="#CCFF00" />}
                    </View>
                  ))}
               </View>

               {/* Add Set Input */}
               <AddSetInputs 
                  exerciseId={exercise.exercise_id} 
                  onLog={logSet} 
                  colors={colors} 
                  units={units}
               />
            </View>
          ))}

          {/* Session Notes */}
          <View style={styles.notesContainer}>
             <Text style={[styles.notesLabel, { color: colors.secondaryText }]}>SESSION NOTES</Text>
             <TextInput 
                style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="ANY OBSERVATIONS?"
                placeholderTextColor={colors.secondaryText}
                multiline
                value={notes}
                onChangeText={setNotes}
             />
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const AddSetInputs = ({ exerciseId, onLog, colors, units }) => {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useMonolithAlert();

  const handleLog = async () => {
    if (!weight || !reps) return;
    setLoading(true);
    try {
      await onLog(exerciseId, parseFloat(weight), parseInt(reps));
      setWeight('');
      setReps('');
    } catch (error) {
      showAlert("Error", "Failed to log set");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.addSetRow, { backgroundColor: colors.secondaryBackground }]}>
      <View style={styles.inputWrapper}>
        <Text style={[styles.tinyLabel, { color: colors.secondaryText }]}>{units.toUpperCase()}</Text>
        <TextInput 
          style={[styles.smallInput, { color: colors.text }]}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          placeholder="0"
          placeholderTextColor={colors.secondaryText}
        />
      </View>
      <View style={styles.inputWrapper}>
        <Text style={[styles.tinyLabel, { color: colors.secondaryText }]}>REPS</Text>
        <TextInput 
          style={[styles.smallInput, { color: colors.text }]}
          keyboardType="numeric"
          value={reps}
          onChangeText={setReps}
          placeholder="0"
          placeholderTextColor={colors.secondaryText}
        />
      </View>
      <TouchableOpacity 
        style={[styles.addBtn, { backgroundColor: colors.text }]} 
        onPress={handleLog}
        disabled={loading}
      >
        {loading ? <ActivityIndicator size="small" color={colors.background} /> : <AntDesign name="plus" size={20} color={colors.background} />}
      </TouchableOpacity>
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  finishBtn: {
    color: '#CCFF00',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: -1,
  },
  exerciseSection: {
    marginTop: 40,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  setsList: {
    marginBottom: 10,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  setNum: {
    fontSize: 12,
    fontWeight: '700',
    width: 50,
  },
  setData: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  tinyLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 4,
  },
  smallInput: {
    fontSize: 18,
    fontWeight: '900',
    padding: 0,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesContainer: {
    marginTop: 60,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    padding: 15,
    borderRadius: 4,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ActiveWorkout;
