import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { sessionsService } from '../services/sessionsService';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const WeightsLog = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [])
  );

  const fetchSessions = async () => {
    try {
      const data = await sessionsService.getSessionHistory();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const SessionCard = ({ session }) => {
    const date = new Date(session.created_at).toLocaleDateString('en-US', {
      month: 'SHORT',
      day: 'NUMERIC',
      year: '2-DIGIT',
    }).toUpperCase();

    return (
      <TouchableOpacity 
        style={[styles.sessionCard, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('WorkoutDetail', { workout: { id: session.workout_id, name: session.workout_name, exercises: session.exercises } })}
      >
        <View style={styles.sessionHeader}>
          <Text style={[styles.sessionDate, { color: colors.secondaryText }]}>{date}</Text>
          <MaterialCommunityIcons name="check-decagram" size={18} color="#CCFF00" />
        </View>
        <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.workout_name?.toUpperCase() || 'FREE SESSION'}</Text>
        
        <View style={styles.sessionFooter}>
          <Text style={[styles.sessionStat, { color: colors.secondaryText }]}>
            {session.total_volume_kg || 0} {units.toUpperCase()} TOTAL
          </Text>
          <Text style={[styles.sessionStat, { color: colors.secondaryText }]}>
             {Math.round((new Date(session.completed_at) - new Date(session.created_at)) / 60000)} MIN
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="menu" size={24} color={colors.text} />
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
           <MaterialCommunityIcons name="account" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>CHRONOLOGICAL ARCHIVE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>SESSION{"\n"}HISTORY.</Text>

          {loading ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ color: colors.secondaryText }}>NO HISTORY COMMITTED</Text>
              <TouchableOpacity 
                style={styles.startBtn}
                onPress={() => navigation.navigate('Workouts')}
              >
                <Text style={{ color: '#000', fontWeight: '900' }}>START FIRST SESSION</Text>
              </TouchableOpacity>
            </View>
          )}

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
    paddingHorizontal: 24,
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
    backgroundColor: '#EEE',
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
    letterSpacing: 1,
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 10,
    lineHeight: 52,
    letterSpacing: -2,
    marginBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 60,
  },
  statBox: {
    borderLeftWidth: 4,
    paddingLeft: 15,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
  exerciseSection: {
    marginBottom: 60,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exerciseTitle: {
    fontSize: 28,
    fontWeight: '900',
    flex: 1,
  },
  addNoteBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addNoteText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 10,
  },
  tableLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 15,
  },
  rowText: {
    fontSize: 22,
    fontWeight: '900',
  },
  previousText: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  inputWrapper: {
    paddingHorizontal: 5,
  },
  rowInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 2,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
  },
  milestoneCard: {
    padding: 30,
    marginBottom: 12,
    borderRadius: 0,
  },
  milestoneSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
  },
  milestoneTitle: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
    marginBottom: 15,
  },
  milestoneDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  intensityCard: {
    padding: 60,
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 40,
  },
  intensityLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 20,
    letterSpacing: 2,
  },
  intensityValue: {
    fontSize: 56,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  finishBtn: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 0,
  },
  finishBtnText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default WeightsLog;
