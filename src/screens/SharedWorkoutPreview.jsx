import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { sharingService } from '../services/sharingService';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RepsHeader from '../components/MonolithHeader';
import { useRepsAlert } from '../context/AlertContext';

const SharedWorkoutPreview = ({ route, navigation }) => {
  const { token } = route.params;
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();
  const { startWorkout } = useWorkout();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile(); // Just in case, though not used yet
  const { showAlert } = useRepsAlert();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSharedWorkout = async () => {
      try {
        const data = await sharingService.getSharedWorkout(token);
        setWorkout(data);
      } catch (error) {
        showAlert('LINK EXPIRED', 'This routine is no longer valid or accessible.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchSharedWorkout();
  }, [token]);

  const handleSave = async () => {
    if (!user) {
      showAlert('AUTHENTICATION REQUIRED', 'Login to integrate this routine into your library.', [
        { text: 'CANCEL', style: 'cancel' },
        { text: 'LOG IN', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    setSaving(true);
    try {
      await sharingService.saveSharedWorkout(token);
      showAlert('DEPLOYED', 'Routine successfully integrated into your library.');
      navigation.navigate('Workouts');
    } catch (error) {
      showAlert('ERROR', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStart = () => {
     if (!user) {
        showAlert('AUTHENTICATION REQUIRED', 'Login to initiate workout protocols.');
        return;
     }
     startWorkout(workout);
     navigation.navigate('ActiveWorkout');
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader 
        onLeftPress={() => navigation.goBack()} 
        title="SHARED PROTOCOL" 
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{workout?.name?.toUpperCase()}</Text>
          <Text style={[styles.muscles, { color: colors.secondaryText }]}>{workout?.target_muscles?.toUpperCase()}</Text>
        </View>

        <View style={styles.exerciseList}>
          {workout?.workout_exercises?.map((item, index) => (
            <View key={index} style={[styles.exerciseItem, { borderBottomColor: colors.border }]}>
               <View style={styles.exHeader}>
                  <Text style={[styles.exIndex, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>{(index + 1).toString().padStart(2, '0')}</Text>
                  <Text style={[styles.exName, { color: colors.text }]}>{item.exercises?.name?.toUpperCase()}</Text>
               </View>
               <Text style={[styles.exDetails, { color: colors.secondaryText }]}>
                {item.sets_target} SETS × {item.reps_target} REPS
               </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.quickStartBtn, { borderColor: isDarkMode ? '#CCFF00' : '#10B981' }]}
          onPress={handleQuickStart}
        >
           <Text style={[styles.quickStartText, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>START SESSION NOW</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: isDarkMode ? '#CCFF00' : '#000' }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={isDarkMode ? '#000' : '#FFF'} />
          ) : (
            <Text style={[styles.saveText, { color: isDarkMode ? '#000' : '#FFF' }]}>INTEGRATE TO LIBRARY</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  backBtn: { padding: 5 },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  content: { padding: 24 },
  hero: { marginBottom: 40 },
  workoutName: { fontSize: 48, fontWeight: '900', letterSpacing: -2, lineHeight: 46 },
  muscles: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 10 },
  exerciseList: { marginTop: 10 },
  exerciseItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  exIndex: { fontSize: 14, fontWeight: '900', fontFamily: 'monospace' },
  exName: { fontSize: 18, fontWeight: '900', flex: 1 },
  exDetails: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: 32 },
  quickStartBtn: {
     marginTop: 40,
     padding: 20,
     borderWidth: 1.5,
     alignItems: 'center',
  },
  quickStartText: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

export default SharedWorkoutPreview;
