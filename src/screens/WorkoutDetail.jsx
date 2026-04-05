import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';

const WorkoutDetail = ({ route, navigation }) => {
  const { workout } = route.params || {};
  const { colors, isDarkMode, units } = useTheme();
  const { startWorkout } = useWorkout();
  const [starting, setStarting] = useState(false);

  const handleStartSession = async () => {
    try {
      setStarting(true);
      await startWorkout(workout.id);
      navigation.navigate('ActiveWorkout');
    } catch (error) {
      Alert.alert('Error', 'Failed to start workout session');
    } finally {
      setStarting(false);
    }
  };

  if (!workout) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>WORKOUT NOT FOUND</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="arrowleft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons name="account" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.sessionId, { color: colors.secondaryText }]}>TEMPLATE_ID: {workout.id.split('-')[0].toUpperCase()}</Text>
          <Text style={[styles.workoutTitle, { color: colors.text }]}>{workout.name.toUpperCase()}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderLeftColor: colors.text }]}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>MOVEMENTS</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>{workout.exercises?.length || 0}</Text>
            </View>
            <View style={styles.statItem}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>ESTIMATED TIME</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>~ { (workout.exercises?.length || 0) * 12} MIN</Text>
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

          {/* Exercise List */}
          <View style={styles.exerciseList}>
            {workout.exercises?.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name.toUpperCase()}</Text>
                    <Text style={[styles.exerciseDetails, { color: colors.secondaryText }]}>MOVEMENT ARCHIVE {index + 1}</Text>
                  </View>
                  <AntDesign name="right" size={16} color={colors.text} />
                </View>

                {/* Coaching Cues */}
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
              </View>
            ))}
          </View>

          {/* Start Action Button */}
          <TouchableOpacity 
            style={styles.logBtn}
            onPress={handleStartSession}
            disabled={starting}
          >
            <Text style={styles.logBtnText}>{starting ? 'INITIALIZING...' : 'START SESSION'}</Text>
            <AntDesign name="play" size={20} color="#000" />
          </TouchableOpacity>

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
  backBtn: {
    padding: 5,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
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
    marginBottom: 50,
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
  exerciseList: {
    marginTop: 20,
  },
  exerciseCard: {
    marginBottom: 40,
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
  trackerContainer: {
    marginTop: 20,
  },
  setsWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  setBox: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: 1,
  },
  setNum: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    fontStyle: 'italic',
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
});

export default WorkoutDetail;
