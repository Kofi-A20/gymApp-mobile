import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';

const EXERCISES_MOCK = [
  {
    name: 'FLAT BARBELL BENCH PRESS',
    details: '4 SETS | 6-8 REPS | 3:1:1 TEMPO',
    cues: [
      'Retract scapula and drive heels into the floor.',
      'Touch mid-sternum; do not bounce the weight.',
      'Maintain a slight arch in the lower back for stability.'
    ],
    sets: 4,
    completed: 3,
  },
  {
    name: 'ARNOLD PRESS',
    details: '3 SETS | 10-12 REPS | 2:0:2 TEMPO',
    cues: [
      'Rotate dumbbells during the eccentric phase.',
      'Ensure full lockout at the peak while keeping ears away from shoulders.'
    ],
    sets: 3,
    completed: 0,
  }
];

const WorkoutDetail = ({ route, navigation }) => {
  const { workout } = route.params || { workout: { name: 'PUSH 1', id: '01' } };
  const { colors, isDarkMode, units } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <AntDesign name="arrowleft" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' }} 
          style={styles.avatar} 
        />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.sessionId, { color: colors.secondaryText }]}>SESSION ID: P{workout.id}-772</Text>
          <Text style={[styles.workoutTitle, { color: colors.text }]}>{workout.name.toUpperCase()}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderLeftColor: colors.text }]}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>TARGET VOLUME</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>14,200 {units.toUpperCase()}</Text>
            </View>
            <View style={styles.statItem}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>ESTIMATED TIME</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>75 MIN</Text>
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
                  Heavy compound day focusing on explosive pectoral power and shoulder stability. Maintain rigid core tension throughout all vertical movements.
               </Text>
            </View>
          </View>

          {/* Exercise List */}
          <View style={styles.exerciseList}>
            {EXERCISES_MOCK.map((exercise, index) => (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
                    <Text style={[styles.exerciseDetails, { color: colors.secondaryText }]}>{exercise.details}</Text>
                  </View>
                  <AntDesign name="down" size={16} color={colors.text} />
                </View>

                {/* Coaching Cues */}
                <View style={[styles.cuesContainer, { backgroundColor: colors.secondaryBackground }]}>
                   <Text style={[styles.cuesTitle, { color: colors.secondaryText }]}>COACHING CUES</Text>
                   {exercise.cues.map((cue, cIdx) => (
                     <View key={cIdx} style={styles.cueRow}>
                        <Text style={[styles.cueId, { color: colors.text }]}>{(cIdx + 1).toString().padStart(2, '0')}</Text>
                        <Text style={[styles.cueText, { color: colors.text }]}>{cue}</Text>
                     </View>
                   ))}
                </View>

                {/* Set Tracker */}
                <View style={styles.trackerContainer}>
                   <View style={styles.setsWrapper}>
                      {[...Array(exercise.sets)].map((_, sIdx) => (
                        <View 
                          key={sIdx} 
                          style={[
                            styles.setBox, 
                            { 
                              backgroundColor: sIdx < exercise.completed ? (isDarkMode ? '#FFF' : '#000') : (isDarkMode ? '#333' : '#EEE'),
                              borderColor: colors.border
                            }
                          ]}
                        >
                          <Text style={[
                            styles.setNum, 
                            { color: sIdx < exercise.completed ? (isDarkMode ? '#000' : '#FFF') : colors.secondaryText }
                          ]}>{sIdx + 1}</Text>
                        </View>
                      ))}
                   </View>
                   <Text style={[styles.progressText, { color: colors.secondaryText }]}>
                      PROGRESS MONOLITH: {Math.round((exercise.completed / exercise.sets) * 100)}% COMPLETE
                   </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Log Action Button */}
          <TouchableOpacity style={styles.logBtn}>
            <Text style={styles.logBtnText}>LOG SESSION</Text>
            <AntDesign name="arrowright" size={20} color="#000" />
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
