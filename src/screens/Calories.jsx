import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const ACTIVITY_OPTIONS = [
  { label: '1–2 days/week', value: 1.2 },
  { label: '3–4 days/week', value: 1.375 },
  { label: '5–6 days/week', value: 1.55 },
  { label: 'Daily', value: 1.725 },
];

const STRATEGIES = [
  { label: 'CUT',      offset: -500, color: '#CCFF00' },
  { label: 'MAINTAIN', offset: 0,    color: '#FFF' },
  { label: 'BULK',     offset: 300,  color: '#CCFF00' },
];

// Derive strategy from comparing current vs goal weight
const deriveStrategy = (weightKg, goalWeightKg) => {
  const diff = goalWeightKg - weightKg;
  if (diff < -0.5) return 0;      // CUT
  if (diff > 0.5)  return 2;      // BULK
  return 1;                        // MAINTAIN
};

const Calories = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const { profile, refreshProfile } = useProfile();

  const [weight, setWeight] = useState(75);

  useFocusEffect(
    useCallback(() => {
      if (refreshProfile) {
        refreshProfile();
      }
    }, [refreshProfile])
  );

  useEffect(() => {
    if (profile) {
      setWeight(units === 'lbs'
        ? (profile.weight_kg || 75) * 2.20462
        : (profile.weight_kg || 75));
    }
  }, [profile, units]);

  // ── All other values come from profile ──
  const gender = profile?.gender || 'male';
  const height = profile?.height_cm || 175;

  // Age from DOB or from age field (legacy fallback)
  const age = useMemo(() => {
    if (profile?.dob) {
      const today = new Date();
      const birth = new Date(profile.dob);
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      return a;
    }
    return profile?.age || 25;
  }, [profile]);

  const gwRaw = profile?.goal_weight || 70;
  const goalWeight = units === 'lbs' ? gwRaw * 2.20462 : gwRaw;

  const actIdxRaw = ACTIVITY_OPTIONS.findIndex(a => Number(a.value) === Number(profile?.activity_level));
  const activityIdx = actIdxRaw !== -1 ? actIdxRaw : 1;
  const activityLabel = ACTIVITY_OPTIONS[activityIdx].label;

  // ── Calculations ──
  const weightKg     = units === 'lbs' ? weight / 2.20462 : weight;
  const goalWeightKg = units === 'lbs' ? goalWeight / 2.20462 : goalWeight;

  const strategyIdx   = deriveStrategy(weightKg, goalWeightKg);
  const strategyLabel = STRATEGIES[strategyIdx].label;

  const bmr = useMemo(() => {
    const offset = gender === 'female' ? -161 : 5;
    return Math.round(10 * weightKg + 6.25 * height - 5 * age + offset);
  }, [weightKg, height, age, gender]);

  const tdee         = useMemo(() => Math.round(bmr * ACTIVITY_OPTIONS[activityIdx].value), [bmr, activityIdx]);
  const targetIntake = tdee + STRATEGIES[strategyIdx].offset;

  // Macro Ranges
  const proLow  = Math.round(weightKg * 1.6);
  const proHigh = Math.round(weightKg * 2.2);
  const fatLow  = Math.round(weightKg * 0.7);
  const fatHigh = Math.round(weightKg * 1.0);
  const carbLow  = Math.max(0, Math.round((targetIntake - proHigh * 4 - fatHigh * 9) / 4));
  const carbHigh = Math.max(0, Math.round((targetIntake - proLow  * 4 - fatLow  * 9) / 4));

  const getNote = () => {
    if (targetIntake < 1200)
      return 'AT THIS WEIGHT A 500 KCAL DEFICIT PUSHES INTAKE BELOW 1,200 KCAL — CONSIDER A SMALLER DEFICIT TO STAY ABOVE SAFE MINIMUMS.';
    if (strategyIdx === 0)
      return `EATING ${targetIntake.toLocaleString()} KCAL/DAY CREATES A ~500 KCAL DEFICIT. RECALCULATE EVERY 2–3 KG AS MAINTENANCE DROPS WITH WEIGHT.`;
    return `EATING ${targetIntake.toLocaleString()} KCAL/DAY SUPPORTS YOUR CURRENT STRATEGY. MAINTAIN CONSISTENCY FOR BEST RESULTS.`;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ width: 24 }} />
        <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <MaterialCommunityIcons name="account-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>HEALTH DIAGNOSTICS</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>CALORIE{'\n'}COMMAND</Text>

          {/* ── TOP METRICS ── */}
          <View style={styles.metricsGrid}>
            <View style={[styles.metricBox, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={styles.metricLabel}>BMR</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{bmr.toLocaleString()}</Text>
              <Text style={styles.metricSub}>CALORIES AT REST</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.secondaryBackground }]}>
              <Text style={styles.metricLabel}>TDEE</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{tdee.toLocaleString()}</Text>
              <Text style={styles.metricSub}>CALORIES BURNED DAILY</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: colors.secondaryBackground, borderColor: '#CCFF00', borderWidth: 1 }]}>
              <Text style={[styles.metricLabel, { color: '#CCFF00' }]}>CALORIE TARGET</Text>
              <Text style={[styles.metricValue, { color: '#CCFF00' }]}>{targetIntake.toLocaleString()}</Text>
              <Text style={[styles.metricSub, { color: '#CCFF00' }]}>CALORIES TO EAT DAILY</Text>
            </View>
          </View>

          {/* ── WEIGHT INPUT ── */}
          <View style={[styles.card, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={styles.cardHeader}>CURRENT WEIGHT ({units.toUpperCase()})</Text>
            <TextInput
              style={[styles.weightInput, { color: colors.text, borderColor: colors.border }]}
              keyboardType="numeric"
              value={weight.toString()}
              onChangeText={v => {
                const val = v.replace(/[^0-9.]/g, '');
                setWeight(parseFloat(val) || 0);
              }}
            />
            <Text style={[styles.weightHint, { color: colors.secondaryText }]}>UPDATE WEIGHT</Text>
          </View>

          {/* ── PROFILE SNAPSHOT ── */}
          <View style={[styles.card, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={styles.cardHeader}>PROFILE SNAPSHOT</Text>
            <View style={styles.snapshotGrid}>
              <View style={styles.snapshotItem}>
                <Text style={styles.inputLabel}>GENDER</Text>
                <Text style={[styles.snapshotValue, { color: colors.text }]}>{gender.toUpperCase()}</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.inputLabel}>ACTIVITY</Text>
                <Text style={[styles.snapshotValue, { color: colors.text }]}>{activityLabel}</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={styles.inputLabel}>STRATEGY</Text>
                <Text style={[styles.snapshotValue, { color: '#CCFF00' }]}>{strategyLabel}</Text>
              </View>
            </View>
          </View>

          {/* ── MACROS ── */}
          <View style={[styles.card, { backgroundColor: '#000', borderColor: '#CCFF00' }]}>
            <Text style={[styles.cardHeader, { color: '#CCFF00' }]}>MACRO RATIOS</Text>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>PROTEIN</Text>
                <Text style={styles.macroVal}>{proLow}G – {proHigh}G</Text>
              </View>
              <View style={styles.mBarBg}><View style={[styles.mBarFill, { width: '85%', backgroundColor: '#CCFF00' }]} /></View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>FATS</Text>
                <Text style={styles.macroVal}>{fatLow}G – {fatHigh}G</Text>
              </View>
              <View style={styles.mBarBg}><View style={[styles.mBarFill, { width: '40%', backgroundColor: '#FFF' }]} /></View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={styles.macroName}>CARBS</Text>
                <Text style={styles.macroVal}>{carbLow}G – {carbHigh}G</Text>
              </View>
              <View style={styles.mBarBg}><View style={[styles.mBarFill, { width: '60%', backgroundColor: colors.secondaryText }]} /></View>
            </View>
          </View>

          {/* ── NOTE ── */}
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
            <Text style={styles.noteText}>{getNote()}</Text>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, height: 60,
  },
  brandTitle: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 30 },
  subLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 5 },
  mainTitle: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 40, marginBottom: 40 },

  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricBox: { flex: 1, padding: 15, justifyContent: 'center' },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, opacity: 0.6, marginBottom: 5 },
  metricValue: { fontSize: 18, fontWeight: '900' },
  metricSub: { fontSize: 7, fontWeight: '800', marginTop: 3, opacity: 0.5 },

  card: { padding: 20, borderWidth: 1, marginBottom: 12 },
  cardHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16, opacity: 0.8 },

  weightInput: {
    borderBottomWidth: 2, fontSize: 36, fontWeight: '900',
    paddingVertical: 8, textAlign: 'center',
  },
  weightHint: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 10 },

  snapshotGrid: { flexDirection: 'row', gap: 10 },
  snapshotItem: { flex: 1 },
  inputLabel: { fontSize: 9, fontWeight: '900', opacity: 0.5, marginBottom: 6 },
  snapshotValue: { fontSize: 16, fontWeight: '900' },

  macroRow: { marginBottom: 20 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroName: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  macroVal: { fontSize: 12, fontWeight: '900', color: '#CCFF00' },
  mBarBg: { height: 4, backgroundColor: '#333' },
  mBarFill: { height: '100%' },

  noteBox: { flexDirection: 'row', gap: 10, marginVertical: 30, paddingHorizontal: 10 },
  noteText: { fontSize: 11, fontWeight: '700', lineHeight: 18, flex: 1, color: '#888' },
});

export default Calories;
