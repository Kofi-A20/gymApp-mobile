import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const MOCK_SESSION = [
  {
    id: '01',
    group: 'CHEST',
    name: 'BARBELL BENCH PRESS',
    sets: [
      { id: 1, previous: '100 x 8', kg: '105', reps: '8' },
      { id: 2, previous: '100 x 8', kg: '105', reps: '6' },
    ]
  },
  {
    id: '02',
    group: 'BACK',
    name: 'WEIGHTED PULL UPS',
    sets: [
      { id: 1, previous: '20 x 10', kg: '25', reps: '10' },
      { id: 2, previous: '20 x 10', kg: '25', reps: '8' },
    ]
  }
];

const WeightsLog = () => {
  const { colors, isDarkMode, units } = useTheme();

  const ExerciseLog = ({ exercise }) => (
    <View style={styles.exerciseSection}>
      <Text style={[styles.groupLabel, { color: colors.secondaryText }]}>{exercise.id} / {exercise.group}</Text>
      <View style={styles.exerciseHeader}>
        <Text style={[styles.exerciseTitle, { color: colors.text }]}>{exercise.name}</Text>
        <TouchableOpacity style={styles.addNoteBtn}>
          <Text style={styles.addNoteText}>ADD NOTE</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tableHeader, { backgroundColor: colors.secondaryBackground }]}>
        <Text style={[styles.tableLabel, { flex: 0.5, color: colors.secondaryText }]}>SET</Text>
        <Text style={[styles.tableLabel, { flex: 1.5, color: colors.secondaryText }]}>PREVIOUS</Text>
        <Text style={[styles.tableLabel, { flex: 1.5, color: colors.secondaryText }]}>{units.toUpperCase()}</Text>
        <Text style={[styles.tableLabel, { flex: 1, color: colors.secondaryText }]}>REPS</Text>
      </View>

      {exercise.sets.map((set) => (
        <View key={set.id} style={styles.tableRow}>
          <Text style={[styles.rowText, { flex: 0.5, color: colors.text }]}>{set.id}</Text>
          <Text style={[styles.previousText, { flex: 1.5, color: colors.secondaryText }]}>{set.previous}</Text>
          <View style={[styles.inputWrapper, { flex: 1.5 }]}>
            <TextInput 
              style={[styles.rowInput, { color: colors.text, borderColor: colors.border }]} 
              defaultValue={set.kg}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <TextInput 
              style={[styles.rowInput, { color: colors.text, borderColor: colors.border }]} 
              defaultValue={set.reps}
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Ionicons name="menu" size={24} color={colors.text} />
          <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
          <View style={styles.avatarPlaceholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={[styles.subLabel, { color: colors.secondaryText }]}>CURRENT SESSION</Text>
            <Text style={[styles.mainTitle, { color: colors.text }]}>HYPERTROPHY{"\n"}B.</Text>

            {/* Stats Summary */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderLeftColor: isDarkMode ? '#CCFF00' : '#10B981' }]}>
                <Text style={[styles.statLabel, { color: colors.secondaryText }]}>DURATION</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>54:12</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.secondaryText }]}>VOLUME</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>12,450 {units.toUpperCase()}</Text>
              </View>
            </View>

            {/* Log Entry List */}
            {MOCK_SESSION.map((ex) => (
              <ExerciseLog key={ex.id} exercise={ex} />
            ))}

            {/* PR Milestone */}
            <View style={[styles.milestoneCard, { backgroundColor: colors.secondaryBackground }]}>
               <Text style={[styles.milestoneSub, { color: colors.secondaryText }]}>PR MILESTONE</Text>
               <Text style={[styles.milestoneTitle, { color: colors.text }]}>YOU ARE 5% STRONGER THAN LAST WEEK.</Text>
               <Text style={[styles.milestoneDesc, { color: colors.secondaryText }]}>
                  Consistency in the hypertrophy phase is showing significant neural adaptation in compound movements.
               </Text>
            </View>

            {/* Intensity Card */}
            <View style={[styles.intensityCard, { backgroundColor: isDarkMode ? '#121212' : '#000' }]}>
               <FontAwesome5 name="bolt" size={28} color={isDarkMode ? '#CCFF00' : '#FFF'} />
               <Text style={[styles.intensityLabel, { color: isDarkMode ? '#666' : '#999' }]}>INTENSITY</Text>
               <Text style={[styles.intensityValue, { color: isDarkMode ? '#FFF' : '#FFF' }]}>HIGH</Text>
            </View>

            {/* Finish Workout Button */}
            <TouchableOpacity style={[styles.finishBtn, { backgroundColor: isDarkMode ? '#FFF' : '#000' }]}>
               <Text style={[styles.finishBtnText, { color: isDarkMode ? '#000' : '#FFF' }]}>FINISH WORKOUT</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
