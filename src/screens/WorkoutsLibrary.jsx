import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { workoutsService } from '../services/workoutsService';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const WorkoutsLibrary = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { profile } = useProfile();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const data = await workoutsService.getUserWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const WorkoutCard = ({ item }) => {
    // Determine muscle groups from exercises
    const muscles = item.exercises?.map(ex => ex.name.split(' ')[0]).slice(0, 3).join(' / ') || 'MIXED';
    
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('WorkoutDetail', { workout: item })}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sequenceId, { color: colors.secondaryText }]}>TEMPLATE_ID: {item.id.split('-')[0].toUpperCase()}</Text>
          <MaterialCommunityIcons name="lightning-bolt" size={20} color={colors.secondaryText} />
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
          <Text style={[styles.muscleGroups, { color: colors.secondaryText }]}>{muscles.toUpperCase()}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.progressContainer}>
             <Text style={[styles.sequenceId, { color: colors.secondaryText }]}>
               {item.exercises?.length || 0} MOVEMENTS
             </Text>
          </View>
          <Text style={[styles.startBtn, { color: '#CCFF00' }]}>START SESSION</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Monolith Brand Header */}
        <View style={styles.brandHeader}>
          <Ionicons name="menu" size={24} color={colors.text} />
          <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
             <MaterialCommunityIcons name="account" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>WORKOUT LIBRARY / Q3 CYCLE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>STRENGTH{"\n"}ARCHIVE.</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            A curated selection of high-intensity protocols designed for structural hypertrophy and neurological adaptation.
          </Text>

          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
            ) : workouts.length > 0 ? (
              workouts.map((workout) => (
                <WorkoutCard key={workout.id} item={workout} />
              ))
            ) : (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Text style={{ color: colors.secondaryText, marginBottom: 20 }}>NO TEMPLATES FOUND</Text>
                <TouchableOpacity 
                   style={[styles.card, { borderColor: colors.border, borderStyle: 'dashed' }]}
                   onPress={() => navigation.navigate('AddWorkout')}
                >
                   <Text style={[styles.startBtn, { color: colors.text }]}>+ CREATE NEW ROUTINE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Cumulative Volume Footer */}
          <View style={styles.volumeContainer}>
            <Text style={[styles.volumeTitle, { color: colors.text }]}>CUMULATIVE VOLUME</Text>
            <View style={styles.volumeGrid}>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>WEEKLY LOAD</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>--</Text>
                <Text style={[styles.volumeSub, { color: colors.secondaryText }]}>
                  {profile?.units === 'kg' ? 'KILOGRAMS' : 'POUNDS'}
                </Text>
              </View>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>ACTIVE TIME</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>--</Text>
                <Text style={[styles.volumeSub, { color: colors.secondaryText }]}>HOURS / WEEK</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 60,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  avatarPlaceholder: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -1,
    lineHeight: 44,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 20,
    lineHeight: 20,
  },
  listContainer: {
    marginTop: 50,
  },
  card: {
    padding: 24,
    marginBottom: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  sequenceId: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardInfo: {
    marginBottom: 40,
  },
  workoutName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  muscleGroups: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  progressBar: {
    width: 30,
    height: 3,
  },
  startBtn: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  volumeContainer: {
    marginTop: 60,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  volumeTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 30,
  },
  volumeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeItem: {
    flex: 1,
  },
  volumeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  volumeValue: {
    fontSize: 32,
    fontWeight: '900',
    marginTop: 10,
  },
  volumeSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default WorkoutsLibrary;
