import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const ACTIVITY_LEVELS = [
  { label: 'SEDENTARY', factor: 1.2 },
  { label: 'LIGHT', factor: 1.375 },
  { label: 'MODERATE', factor: 1.55 },
  { label: 'ACTIVE', factor: 1.725 },
];

const Calories = () => {
  const { colors, isDarkMode, units } = useTheme();
  
  // State for diagnostics
  const [weight, setWeight] = useState(78.5);
  const [height, setHeight] = useState(182);
  const [activity, setActivity] = useState(1); // LIGHT as default

  // Mifflin-St Jeor Equation (Approx for Men)
  const bmr = useMemo(() => Math.round(10 * weight + 6.25 * height - 5 * 25 + 5), [weight, height]);
  const maintenance = useMemo(() => Math.round(bmr * ACTIVITY_LEVELS[activity].factor), [bmr, activity]);
  const intake = maintenance - 500; // -500 deficit for weight loss

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="menu" size={24} color={colors.text} />
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <View style={styles.avatarPlaceholder} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>HEALTH DIAGNOSTICS</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>CALORIE{"\n"}COMMAND</Text>
          
          {/* Input Sliders */}
          <View style={styles.sliderGroup}>
            <View style={styles.labelRow}>
               <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>WEIGHT ({units.toUpperCase()})</Text>
               <Text style={[styles.inputValue, { color: colors.text }]}>{weight.toFixed(1)}</Text>
            </View>
            <Slider
               style={styles.slider}
               minimumValue={40}
               maximumValue={150}
               value={weight}
               onValueChange={setWeight}
               minimumTrackTintColor={isDarkMode ? '#CCFF00' : '#000'}
               maximumTrackTintColor={colors.border}
               thumbTintColor={isDarkMode ? '#CCFF00' : '#000'}
            />

            <View style={[styles.labelRow, { marginTop: 40 }]}>
               <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>HEIGHT (CM)</Text>
               <Text style={[styles.inputValue, { color: colors.text }]}>{height}</Text>
            </View>
            <Slider
               style={styles.slider}
               minimumValue={140}
               maximumValue={220}
               value={height}
               onValueChange={v => setHeight(Math.round(v))}
               minimumTrackTintColor={isDarkMode ? '#CCFF00' : '#000'}
               maximumTrackTintColor={colors.border}
               thumbTintColor={isDarkMode ? '#CCFF00' : '#000'}
            />
          </View>

          {/* Activity Level Segmenter */}
          <View style={styles.activitySection}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>ACTIVITY LEVEL</Text>
              <Text style={[styles.activityLabel, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>
                {ACTIVITY_LEVELS[activity].label}
              </Text>
            </View>
            <View style={styles.segmentContainer}>
              {ACTIVITY_LEVELS.map((level, idx) => (
                <TouchableOpacity 
                   key={idx} 
                   onPress={() => setActivity(idx)}
                   style={[styles.segment, { 
                      backgroundColor: idx <= activity ? (isDarkMode ? '#CCFF00' : '#10B981') : colors.border,
                      opacity: idx === activity ? 1 : 0.4
                   }]} 
                />
              ))}
            </View>
          </View>

          {/* Target Strategy Card */}
          <View style={[styles.strategyCard, { borderColor: colors.border }]}>
             <Text style={[styles.strategyLabel, { color: colors.secondaryText }]}>TARGET STRATEGY</Text>
             <View style={styles.strategyRow}>
                <View>
                   <Text style={[styles.deficitValue, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>-500</Text>
                   <Text style={[styles.deficitLabel, { color: colors.secondaryText }]}>DAILY DEFICIT</Text>
                </View>
                <View style={{ alignItems: 'right', textAlign: 'right' }}>
                   <Text style={[styles.intensityTitle, { color: colors.text }]}>Aggressive</Text>
                   <Text style={[styles.intensitySub, { color: colors.secondaryText }]}>INTENSITY LEVEL</Text>
                </View>
             </View>
             <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: isDarkMode ? '#FFF' : '#000' }]}>
                <Text style={[styles.adjustBtnText, { color: isDarkMode ? '#000' : '#FFF' }]}>ADJUST TARGET</Text>
             </TouchableOpacity>
          </View>

          {/* BMR / Maintenance Displays */}
          <View style={[styles.infoBlock, { backgroundColor: colors.secondaryBackground }]}>
             <FontAwesome5 name="bolt" size={20} color={colors.secondaryText} />
             <Text style={[styles.infoSub, { color: colors.secondaryText, marginTop: 20 }]}>BMR</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{bmr.toLocaleString()}</Text>
             <Text style={[styles.infoDesc, { color: colors.secondaryText }]}>KCAL/DAY (BASAL)</Text>
          </View>

          <View style={[styles.infoBlock, { backgroundColor: colors.secondaryBackground, marginTop: 12 }]}>
             <MaterialCommunityIcons name="refresh" size={24} color={colors.secondaryText} />
             <Text style={[styles.infoSub, { color: colors.secondaryText, marginTop: 20 }]}>MAINTENANCE</Text>
             <Text style={[styles.infoValue, { color: colors.text }]}>{maintenance.toLocaleString()}</Text>
             <Text style={[styles.infoDesc, { color: colors.secondaryText }]}>KCAL/DAY (TOTAL)</Text>
          </View>

          {/* Recommended Intake / Macros Card */}
          <View style={[styles.macroCard, { backgroundColor: isDarkMode ? '#121212' : '#000' }]}>
             <Text style={[styles.macroLabel, { color: colors.secondaryText }]}>RECOMMENDED INTAKE</Text>
             <Text style={[styles.macroMainValue, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>{intake.toLocaleString()}</Text>
             <Text style={[styles.macroMainSub, { color: colors.secondaryText }]}>KCAL FOR WEIGHT LOSS</Text>

             <View style={styles.macrosList}>
                <View style={styles.macroRow}>
                   <View style={styles.macroMeta}>
                      <Text style={styles.macroName}>PRO</Text>
                      <Text style={styles.macroTarget}>160g</Text>
                   </View>
                   <View style={[styles.macroBarContainer, { backgroundColor: '#333' }]}>
                      <View style={[styles.macroBar, { width: '80%', backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />
                   </View>
                </View>
                <View style={styles.macroRow}>
                   <View style={styles.macroMeta}>
                      <Text style={styles.macroName}>CHO</Text>
                      <Text style={styles.macroTarget}>210g</Text>
                   </View>
                   <View style={[styles.macroBarContainer, { backgroundColor: '#333' }]}>
                      <View style={[styles.macroBar, { width: '40%', backgroundColor: '#666' }]} />
                   </View>
                </View>
                <View style={styles.macroRow}>
                   <View style={styles.macroMeta}>
                      <Text style={styles.macroName}>FAT</Text>
                      <Text style={styles.macroTarget}>65g</Text>
                   </View>
                   <View style={[styles.macroBarContainer, { backgroundColor: '#333' }]}>
                      <View style={[styles.macroBar, { width: '30%', backgroundColor: '#555' }]} />
                   </View>
                </View>
             </View>
          </View>

          {/* Weight Loss Journey */}
          <View style={[styles.journeyCard, { backgroundColor: colors.secondaryBackground }]}>
             <View style={styles.labelRow}>
                <Text style={[styles.journeyLabel, { color: colors.text }]}>WEIGHT LOSS JOURNEY</Text>
                <View style={[styles.weekBadge, { backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]}>
                  <Text style={styles.weekBadgeText}>WEEK 4 OF 12</Text>
                </View>
             </View>

             <View style={styles.journeyBarContainer}>
                <Text style={[styles.journeyWeight, { color: colors.text }]}>82.0 KG</Text>
                <View style={styles.journeyBarBase}>
                   <View style={[styles.journeyBarProgress, { backgroundColor: isDarkMode ? '#CCFF00' : '#10B981' }]} />
                   <View style={styles.journeyMarker}>
                      <View style={styles.markerLine} />
                      <Text style={styles.markerText}>{weight.toFixed(1)}</Text>
                   </View>
                </View>
                <Text style={[styles.journeyWeight, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>75.0 KG</Text>
             </View>

             <View style={styles.journeyStats}>
                <View style={styles.journeyStatItem}>
                   <Text style={[styles.journeyStatValue, { color: colors.text }]}>3.5</Text>
                   <Text style={[styles.journeyStatLabel, { color: colors.secondaryText }]}>LOSS (KG)</Text>
                </View>
                <View style={styles.journeyStatItem}>
                   <Text style={[styles.journeyStatValue, { color: colors.text }]}>4.2%</Text>
                   <Text style={[styles.journeyStatLabel, { color: colors.secondaryText }]}>BODY FAT %</Text>
                </View>
                <View style={styles.journeyStatItem}>
                   <Text style={[styles.journeyStatValue, { color: colors.text }]}>8</Text>
                   <Text style={[styles.journeyStatLabel, { color: colors.secondaryText }]}>WEEKS LEFT</Text>
                </View>
             </View>
          </View>

          {/* Decorative Footer */}
          <View style={styles.brandingFooter}>
             <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=600' }}
                style={styles.footerImg}
             />
             <View style={styles.footerContent}>
                <Text style={[styles.footerMain, { color: colors.text }]}>PRECISION{"\n"}OVER{"\n"}SPECULATION.</Text>
                <Text style={[styles.footerDesc, { color: colors.secondaryText }]}>
                   Our calculations are derived from the Mifflin-St Jeor equation, the gold standard in nutritional science. We don't believe in generic estimates; we believe in architectural precision for the human form.
                </Text>
                <TouchableOpacity style={styles.methodBtn}>
                   <Text style={[styles.methodBtnText, { color: isDarkMode ? '#CCFF00' : '#10B981' }]}>READ METHODOLOGY</Text>
                </TouchableOpacity>
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
  },
  mainTitle: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 10,
    lineHeight: 52,
    letterSpacing: -2,
    marginBottom: 50,
  },
  sliderGroup: {
    marginBottom: 40,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  activitySection: {
    marginBottom: 50,
  },
  activityLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strategyCard: {
    padding: 30,
    borderWidth: 1,
    marginBottom: 12,
  },
  strategyLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 20,
  },
  strategyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  deficitValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  deficitLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  intensityTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
  },
  intensitySub: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
  adjustBtn: {
    padding: 20,
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoBlock: {
    padding: 30,
    borderRadius: 0,
  },
  infoSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  infoValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 5,
  },
  infoDesc: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
  macroCard: {
    padding: 30,
    marginTop: 12,
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 20,
  },
  macroMainValue: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
  },
  macroMainSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  macrosList: {
    marginTop: 40,
  },
  macroRow: {
    marginBottom: 20,
  },
  macroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  macroTarget: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  macroBarContainer: {
    height: 4,
    width: '100%',
  },
  macroBar: {
    height: '100%',
  },
  journeyCard: {
    padding: 24,
    marginTop: 12,
  },
  journeyLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  weekBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  weekBadgeText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
  },
  journeyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginVertical: 40,
  },
  journeyWeight: {
    fontSize: 16,
    fontWeight: '900',
  },
  journeyBarBase: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },
  journeyBarProgress: {
    height: '100%',
    width: '50%', // Hardcoded for mockup
  },
  journeyMarker: {
    position: 'absolute',
    left: '50%',
    top: -5,
    alignItems: 'center',
  },
  markerLine: {
    width: 2,
    height: 14,
    backgroundColor: '#000',
  },
  markerText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  journeyStatItem: {
    alignItems: 'center',
  },
  journeyStatValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  journeyStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  brandingFooter: {
    marginTop: 80,
  },
  footerImg: {
    width: '100%',
    height: 300,
    opacity: 0.6,
  },
  footerContent: {
    marginTop: 40,
  },
  footerMain: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 46,
  },
  footerDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: 25,
  },
  methodBtn: {
    marginTop: 30,
    borderBottomWidth: 2,
    alignSelf: 'flex-start',
    paddingBottom: 4,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  }
});

export default Calories;
