import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { sharingService } from '../services/sharingService';

const SharedWorkoutPreview = ({ route, navigation }) => {
  const { token } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSharedWorkout = async () => {
      try {
        const data = await sharingService.getSharedWorkout(token);
        setWorkout(data);
      } catch (error) {
        Alert.alert('Error', error.message);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchSharedWorkout();
  }, [token]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Login Required', 'You must be logged in to save this workout.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    setSaving(true);
    try {
      await sharingService.saveSharedWorkout(token);
      Alert.alert('Success', 'Workout added to your library!');
      navigation.navigate('Workouts'); // Navigate to the workouts tab
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>← BACK</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>SHARED ROUTINE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{workout?.name?.toUpperCase()}</Text>
          <Text style={[styles.muscles, { color: colors.secondaryText }]}>{workout?.target_muscles?.toUpperCase()}</Text>
        </View>

        <View style={styles.exerciseList}>
          {workout?.workout_exercises?.map((item, index) => (
            <View key={index} style={[styles.exerciseItem, { borderBottomColor: colors.border }]}>
               <Text style={[styles.exName, { color: colors.text }]}>{item.exercises?.name}</Text>
               <Text style={[styles.exDetails, { color: colors.secondaryText }]}>
                {item.sets_target} SETS × {item.reps_target} REPS
               </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.text }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.saveText, { color: colors.background }]}>SAVE TO MY WORKOUTS</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  content: { padding: 20 },
  hero: { marginBottom: 30 },
  workoutName: { fontSize: 32, fontWeight: '900', marginBottom: 5 },
  muscles: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  exerciseList: { marginTop: 10 },
  exerciseItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  exName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  exDetails: { fontSize: 13, fontWeight: '600' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});

export default SharedWorkoutPreview;
