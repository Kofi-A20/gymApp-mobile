import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const CALENDAR_DATA = [
  { day: 1, type: 'light', active: true },
  { day: 2, type: 'LEGS / HYPERTR', active: true },
  { day: 3, type: 'light', active: true },
  { day: 4, type: 'rest', active: false },
  { day: 5, type: 'light', active: true },
  { day: 6, type: 'rest', active: false },
  { day: 7, type: 'light', active: true },
  { day: 8, type: 'rest', active: false },
  { day: 9, type: 'PEAK STRENG', active: true },
  { day: 10, type: 'light', active: true },
  { day: 11, type: 'rest', active: false },
  { day: 12, type: 'light', active: true },
  { day: 13, type: 'light', active: true },
  { day: 14, type: 'rest', active: false },
  { day: 15, type: 'light', active: true },
  { day: 16, type: 'rest', active: false },
  { day: 17, type: 'light', active: true },
  { day: 18, type: 'TODAY', active: false }, // Today special
];

const Calendar = () => {
  const { colors, isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="menu" size={24} color={colors.text} />
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <View style={styles.avatarPlaceholder} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>CURRENT CYCLE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>SEPTEMBER</Text>
          <Text style={[styles.yearTitle, { color: isDarkMode ? '#333' : '#E0E0E0' }]}>2024</Text>
          
          <Text style={[styles.description, { color: colors.secondaryText }]}>
             Consistency is the only metric that transforms into power. 18 sessions completed this month.
          </Text>

          {/* Custom Calendar Grid */}
          <View style={[styles.calendarGrid, { borderColor: colors.border }]}>
             <View style={styles.daysRow}>
                {DAYS.map(d => (
                  <Text key={d} style={[styles.dayLabel, { color: d === 'SUN' ? (isDarkMode ? '#FF453A' : '#D32F2F') : colors.secondaryText }]}>{d}</Text>
                ))}
             </View>

             <View style={styles.gridContent}>
                {/* Visualizing 4 weeks for mockup */}
                {[...Array(28)].map((_, i) => {
                  const dayData = CALENDAR_DATA.find(d => d.day === i + 1);
                  const isToday = dayData?.type === 'TODAY';
                  return (
                    <View key={i} style={[
                      styles.gridCell, 
                      { 
                        borderColor: colors.border,
                        backgroundColor: isToday ? 'transparent' : 'transparent',
                        borderColor: isToday ? (isDarkMode ? '#CCFF00' : '#10B981') : colors.border,
                        borderWidth: isToday ? 2 : 0.5
                      }
                    ]}>
                      <Text style={[
                        styles.dateNum, 
                        { color: (i + 1) === 18 ? colors.text : colors.secondaryText, opacity: (i + 1) > 18 ? 0.3 : 1 }
                      ]}>{(i + 1).toString().padStart(2, '0')}</Text>
                      
                      {dayData?.active && <View style={[styles.activeDot, { backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />}
                      
                      {dayData?.type && dayData.type.length > 5 && (
                        <View style={styles.typeTag}>
                          <View style={[styles.typeLine, { backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />
                          <Text style={[styles.typeText, { color: colors.text }]}>{dayData.type}</Text>
                        </View>
                      )}

                      {isToday && (
                        <View style={styles.todayTag}>
                          <Text style={[styles.todayText, { color: colors.secondaryText }]}>TODAY</Text>
                          <View style={[styles.todayCircle, { borderColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />
                        </View>
                      )}
                    </View>
                  );
                })}
             </View>
          </View>

          {/* Volume Growth Card */}
          <View style={[styles.growthCard, { backgroundColor: isDarkMode ? '#121212' : '#000' }]}>
             <Text style={[styles.growthSub, { color: isDarkMode ? '#666' : '#999' }]}>VOLUME GROWTH</Text>
             <Text style={[styles.growthValue, { color: '#FFF' }]}>+14%</Text>
             <Text style={[styles.growthDesc, { color: isDarkMode ? '#666' : '#999' }]}>COMPARED TO AUGUST</Text>
          </View>

          {/* Milestone Monitor */}
          <View style={[styles.milestoneCard, { backgroundColor: isDarkMode ? '#121212' : '#000' }]}>
             <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=300' }} 
                style={[styles.milestoneImg, { opacity: 0.1 }]} 
             />
             <View style={styles.milestoneContent}>
                <Text style={[styles.milestoneLabel, { color: isDarkMode ? '#666' : '#999' }]}>NEXT MILESTONE</Text>
                <Text style={[styles.milestoneValue, { color: '#FFF' }]}>250KG{"\n"}DEADLIFT</Text>
                
                <View style={styles.progressContainer}>
                   <View style={[styles.progressBar, { backgroundColor: '#333' }]}>
                      <View style={[styles.progressFill, { width: '78%', backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />
                   </View>
                   <Text style={[styles.progressPct, { color: '#FFF' }]}>78%</Text>
                </View>
             </View>
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
