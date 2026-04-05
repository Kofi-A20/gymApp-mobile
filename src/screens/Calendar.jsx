import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { calendarService } from '../services/calendarService';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const Calendar = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const [stats, setStats] = useState({ completions: {}, monthCount: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchCalendarData();
    }, [])
  );

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const data = await calendarService.getMonthStats(month, year);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = () => {
    return new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
  };

  const currentYear = new Date().getFullYear();
  const today = new Date().getDate();

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
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>CURRENT CYCLE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{getMonthName()}</Text>
          <Text style={[styles.yearTitle, { color: isDarkMode ? '#333' : '#E0E0E0' }]}>{currentYear}</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText }]}>
             Consistency is the only metric that transforms into power. {stats.monthCount} sessions completed this month.
          </Text>

          {/* Custom Calendar Grid */}
          <View style={[styles.calendarGrid, { borderColor: colors.border }]}>
             <View style={styles.daysRow}>
                {DAYS.map(d => (
                  <Text key={d} style={[styles.dayLabel, { color: d === 'SUN' ? (isDarkMode ? '#FF453A' : '#D32F2F') : colors.secondaryText }]}>{d}</Text>
                ))}
             </View>

             <View style={styles.gridContent}>
                {loading ? (
                  <ActivityIndicator color={colors.text} style={{ margin: 50 }} />
                ) : (
                  [...Array(35)].map((_, i) => {
                    const dayNum = i + 1;
                    const sessionCount = stats.completions[dayNum] || 0;
                    const isToday = dayNum === today;
                    return (
                      <View key={i} style={[
                        styles.gridCell, 
                        { 
                          borderColor: isToday ? (isDarkMode ? '#CCFF00' : '#10B981') : colors.border,
                          borderWidth: isToday ? 2 : 0.5
                        }
                      ]}>
                        <Text style={[
                          styles.dateNum, 
                          { color: dayNum === today ? colors.text : colors.secondaryText, opacity: dayNum > today ? 0.3 : 1 }
                        ]}>{dayNum.toString().padStart(2, '0')}</Text>
                        
                        {sessionCount > 0 && <View style={[styles.activeDot, { backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />}
                      </View>
                    );
                  })
                )}
             </View>
          </View>

          {/* Volume Growth Card Placeholder */}
          <View style={[styles.growthCard, { backgroundColor: isDarkMode ? '#121212' : '#000' }]}>
             <Text style={[styles.growthSub, { color: isDarkMode ? '#666' : '#999' }]}>VOLUME GROWTH</Text>
             <Text style={[styles.growthValue, { color: '#FFF' }]}>--</Text>
             <Text style={[styles.growthDesc, { color: isDarkMode ? '#666' : '#999' }]}>CALCULATING ADAPTATION...</Text>
          </View>

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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  mainTitle: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 68,
  },
  yearTitle: {
    fontSize: 72,
    fontWeight: '300',
    letterSpacing: -4,
    lineHeight: 68,
    marginTop: -10,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 20,
    textAlign: 'right',
  },
  calendarGrid: {
    marginTop: 60,
    borderWidth: 0,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dayLabel: {
    width: '14.2%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '14.28%',
    aspectRatio: 0.65,
    padding: 6,
    borderWidth: 0.5,
  },
  dateNum: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -1,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  typeTag: {
    marginTop: 8,
  },
  typeLine: {
    height: 2,
    width: '80%',
    marginBottom: 2,
  },
  typeText: {
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 8,
  },
  todayTag: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    alignItems: 'center',
  },
  todayText: {
    fontSize: 7,
    fontWeight: '900',
    marginBottom: 2,
  },
  todayCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  growthCard: {
    marginTop: 60,
    padding: 40,
    alignItems: 'center',
  },
  growthSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  growthValue: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -4,
    marginVertical: 10,
  },
  growthDesc: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  milestoneCard: {
    marginTop: 12,
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  milestoneImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  milestoneContent: {
    flex: 1,
    padding: 40,
    justifyContent: 'center',
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  milestoneValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 30,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressBar: {
    flex: 1,
    height: 40,
  },
  progressFill: {
    height: '100%',
  },
  progressPct: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  }
});

export default Calendar;
