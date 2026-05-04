import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';
import { exerciseDBService } from '../services/exerciseDBService';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useWorkout } from '../context/WorkoutContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import Body from 'react-native-body-highlighter';
import { workoutsService } from '../services/workoutsService';
import { useRepsAlert } from '../context/AlertContext';
import { mapMuscleSlug } from '../utils/muscleUtils';
import { TYPOGRAPHY } from '../theme/typography';

const frontSlugs = new Set(['chest', 'biceps', 'abs', 'obliques', 'quadriceps', 'tibialis', 'knees', 'front-deltoids']);
const backSlugs = new Set(['upper-back', 'triceps', 'lower-back', 'gluteal', 'hamstring', 'calves', 'rear-deltoids']);
const bothSlugs = new Set(['trapezius', 'forearm']);

const getViewsToShow = (data) => {
  let showFront = false;
  let showBack = false;

  if (!data || data.length === 0) return { showFront: true, showBack: true };

  for (const d of data) {
    if (frontSlugs.has(d.slug)) showFront = true;
    if (backSlugs.has(d.slug)) showBack = true;
    if (bothSlugs.has(d.slug)) {
      showFront = true;
      showBack = true;
    }
  }

  if (!showFront && !showBack) return { showFront: true, showBack: true };
  return { showFront, showBack };
};

const ExerciseVideo = ({ name, category }) => {
  const { colors, accentColor } = useTheme();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    exerciseDBService.getYouTubeVideo(name, category)
      .then(v => {
        setVideo(v);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [name, category]);

  if (loading) return <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />;
  if (!video) return null;

  return (
    <View style={{ borderRadius: 12, overflow: 'hidden', marginVertical: 15, backgroundColor: '#000' }}>
      <YoutubeIframe
        height={180}
        videoId={video.videoId}
        play={false}
      />
    </View>
  );
};

const WorkoutDetail = ({ route, navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const gender = profile?.gender === 'female' ? 'female' : 'male';
  const { startWorkout } = useWorkout();
  const { showAlert } = useRepsAlert();

  const [currentWorkout, setCurrentWorkout] = useState(route.params?.workout || null);
  const [loadingWorkout, setLoadingWorkout] = useState(!route.params?.workout);
  const [starting, setStarting] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState({});

  useFocusEffect(
    useCallback(() => {
      const targetId = route.params?.workoutId || route.params?.workout?.id;
      if (targetId) {
        workoutsService.getWorkoutDetail(targetId)
          .then(data => {
            setCurrentWorkout(data);
            setLoadingWorkout(false);
          })
          .catch(err => {
            console.error(err);
            showAlert("Error", "Failed to load workout details");
            if (!currentWorkout) navigation.goBack();
          });
      }
    }, [route.params?.workoutId, route.params?.workout?.id])
  );

  const toggleExpand = (index) => {
    setExpandedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleStartSession = async () => {
    try {
      setStarting(true);
      await startWorkout(currentWorkout.id);
      navigation.navigate('ActiveWorkout');
    } catch (error) {
      showAlert('Error', 'Failed to start workout session');
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
              await workoutsService.deleteWorkout(currentWorkout.id);
              navigation.goBack();
            } catch (err) {
              showAlert("Error", "Failed to delete workout");
            }
          }
        }
      ]
    );
  };

  if (loadingWorkout) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        onLeftPress={() => navigation.goBack()}
        title="REPS"
        rightActions={[{
          text: 'Edit',
          color: colors.text,
          onPress: () => navigation.navigate('CreateWorkout', { editWorkout: currentWorkout })
        }]}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.content}>
          <Text style={[styles.workoutTitle, { color: colors.text }]}>{currentWorkout.name.toUpperCase()}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statItem, { borderLeftColor: colors.text }]}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>EXERCISES</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{currentWorkout.exercises?.length || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>ESTIMATED TIME</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>~ {(currentWorkout.exercises?.length || 0) * 12} MIN</Text>
            </View>
          </View>
        </View>

        {/* ── Exercise list ── */}
        <View style={{ paddingHorizontal: 24 }}>
          {(currentWorkout.exercises || []).map((item, index) => {
            const isExpanded = expandedExercises[index];
            return (
              <AppTile
                key={item.exercise_id || item.id ? `ex-${item.exercise_id || item.id}` : `idx-${index}`}
                onPress={() => toggleExpand(index)}
                style={{ padding: 20, marginBottom: 12 }}
              >
                <View style={styles.exerciseHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name?.toUpperCase()}</Text>
                      <Text style={[styles.exerciseDetails, { color: colors.secondaryText }]}>
                        {item.sets_target || 3} SETS × {item.reps_target || 10} REPS
                      </Text>
                    </View>
                  </View>
                  <AntDesign name={isExpanded ? 'down' : 'right'} size={16} color={colors.text} />
                </View>

                {isExpanded && (() => {
                  const bodyData = [
                    ...(item.primary_muscles || []).map(m => ({ slug: mapMuscleSlug(m), intensity: 2 })),
                    ...(item.secondary_muscles || []).map(m => ({ slug: mapMuscleSlug(m), intensity: 1 })),
                  ].filter(d => d.slug);
                  const { showFront, showBack } = getViewsToShow(bodyData);
                  return (
                    <View style={{ paddingTop: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', paddingHorizontal: 10 }}>
                        {showFront && (
                          <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                            <Body data={bodyData} side="front" gender={gender} scale={0.5} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
                          </View>
                        )}
                        {showBack && (
                          <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                            <Body data={bodyData} side="back" gender={gender} scale={0.5} colors={['#FF9500', '#FF3B30']} border="#1C2733" />
                          </View>
                        )}
                      </View>

                      <ExerciseVideo name={item.name} category={item.category} />
                    </View>
                  );
                })()}
              </AppTile>
            );
          })}
        </View>

        {/* ── Footer ── */}
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: accentColor, marginBottom: 16 }]}
            onPress={handleStartSession}
            disabled={starting}
          >
            <Text style={styles.logBtnText}>{starting ? 'INITIALIZING...' : 'START SESSION'}</Text>
            <Ionicons name="play" size={20} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleDeleteWorkout}
          >
            <Text style={[styles.logBtnText, { color: '#FF3B30', fontSize: 14 }]}>DELETE ROUTINE</Text>
            <MaterialCommunityIcons name="delete" size={20} color="#FF3B30" />
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
    ...TYPOGRAPHY.heroTitle,
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
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
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginTop: 16,
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
