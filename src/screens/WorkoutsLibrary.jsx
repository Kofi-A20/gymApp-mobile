import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const WORKOUTS = [
  { id: '01', name: 'Push 1', muscles: 'CHEST / SHOULDERS / TRICEPS', icon: 'lightning-bolt', progress: [1, 0, 0] },
  { id: '02', name: 'Pull 1', muscles: 'BACK / REAR DELTS / BICEPS', icon: 'waves', progress: [1, 1, 0] },
  { id: '03', name: 'Legs 1', muscles: 'QUADS / HAMSTRINGS / CALVES', icon: 'home-outline', progress: [0, 0, 0] },
  { id: '04', name: 'Push 2', muscles: 'INCLINE FOCUS / TRICEP PEAK', icon: 'target', progress: [1, 0, 0] },
  { id: '05', name: 'Pull 2', muscles: 'WIDTH FOCUS / BICEP GIRTH', icon: 'arrow-up-down', progress: [1, 1, 1] },
  { id: '06', name: 'Legs 2', muscles: 'POSTERIOR CHAIN / EXPLOSIVE POWER', icon: 'chevron-double-up', progress: [1, 0, 0] },
];

const WorkoutsLibrary = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();

  const WorkoutCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('WorkoutDetail', { workout: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.sequenceId, { color: colors.secondaryText }]}>SEQUENCE {item.id}</Text>
        <MaterialCommunityIcons name={item.icon} size={20} color={colors.secondaryText} />
      </View>
      
      <View style={styles.cardInfo}>
        <Text style={[styles.workoutName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.muscleGroups, { color: colors.secondaryText }]}>{item.muscles}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.progressContainer}>
          {item.progress.map((p, idx) => (
            <View 
              key={idx} 
              style={[
                styles.progressBar, 
                { backgroundColor: p ? (isDarkMode ? '#FFF' : '#000') : (isDarkMode ? '#333' : '#EEE') }
              ]} 
            />
          ))}
        </View>
        <Text style={[styles.startBtn, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>START SESSION</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Monolith Brand Header */}
        <View style={styles.brandHeader}>
          <Ionicons name="menu" size={24} color={colors.text} />
          <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
          <View style={styles.avatarPlaceholder}>
             <MaterialCommunityIcons name="account" size={24} color={colors.text} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>WORKOUT LIBRARY / Q3 CYCLE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>STRENGTH{"\n"}ARCHIVE.</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            A curated selection of high-intensity protocols designed for structural hypertrophy and neurological adaptation.
          </Text>

          <View style={styles.listContainer}>
            {WORKOUTS.map((workout) => (
              <WorkoutCard key={workout.id} item={workout} />
            ))}
          </View>

          {/* Cumulative Volume Footer */}
          <View style={styles.volumeContainer}>
            <Text style={[styles.volumeTitle, { color: colors.text }]}>CUMULATIVE VOLUME</Text>
            <View style={styles.volumeGrid}>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>WEEKLY LOAD</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>42,500</Text>
                <Text style={[styles.volumeSub, { color: colors.secondaryText }]}>{units === 'kg' ? 'KILOGRAMS' : 'POUNDS'}</Text>
              </View>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>ACTIVE TIME</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>08:12</Text>
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
