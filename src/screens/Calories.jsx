import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { useRepsAlert } from '../context/AlertContext';
import { weightLogsService } from '../services/weightLogsService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';

const ACTIVITY_OPTIONS = [
  { label: '1–2 days/week', value: 1.2 },
  { label: '3–4 days/week', value: 1.375 },
  { label: '5–6 days/week', value: 1.55 },
  { label: 'Daily', value: 1.725 },
];

const STRATEGIES = [
  { label: 'CUT', offset: -500 },
  { label: 'MAINTAIN', offset: 0 },
  { label: 'BULK', offset: 300 },
];

const deriveStrategy = (weightKg, goalWeightKg) => {
  const diff = goalWeightKg - weightKg;
  if (diff < -0.5) return 0;      // CUT
  if (diff > 0.5) return 2;      // BULK
  return 1;                        // MAINTAIN
};

const Calories = ({ navigation, route }) => {
  const { colors, isDarkMode, units, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile, updateProfile } = useProfile();
  const { showAlert } = useRepsAlert();

  const [weightLogs, setWeightLogs] = useState([]);
  const [weightInput, setWeightInput] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [goalStartWeight, setGoalStartWeight] = useState(null);

  const scrollViewRef = useRef(null);
  const [weightSectionY, setWeightSectionY] = useState(0);

  // Selection mode states
  const [wlSelectionMode, setWlSelectionMode] = useState(false);
  const [wlSelectedIds, setWlSelectedIds] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (refreshProfile) {
        refreshProfile();
      }
      fetchWeightLogs();
      fetchGoalStartWeight();

      // Handle scrolling if requested
      if (route.params?.scrollToLog && weightSectionY > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: weightSectionY, animated: true });
          // Clear params to avoid re-scrolling
          navigation.setParams({ scrollToLog: undefined });
        }, 100);
      } else {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      }
    }, [refreshProfile, route.params?.scrollToLog, weightSectionY])
  );

  const fetchGoalStartWeight = async () => {
    try {
      const sw = await AsyncStorage.getItem('goalStartWeight');
      if (sw !== null) setGoalStartWeight(parseFloat(sw));
    } catch (e) { }
  };

  const fetchWeightLogs = async () => {
    setLogLoading(true);
    try {
      const data = await weightLogsService.getWeightLogs();
      setWeightLogs(data || []);
    } catch (e) {
      console.error('Failed to fetch weight logs:', e);
    } finally {
      setLogLoading(false);
    }
  };

  const handleLogWeight = async () => {
    const raw = parseFloat(weightInput);
    if (!raw || raw <= 0) return;
    const kg = units === 'lbs' ? raw / 2.20462 : raw;
    setLogLoading(true);
    try {
      await weightLogsService.logWeight(kg);
      if (updateProfile) {
        await updateProfile({ weight_kg: kg });
      }
      setWeightInput('');
      await fetchWeightLogs();
    } catch (e) {
      showAlert('ERROR', 'Failed to log weight entry.');
    } finally {
      setLogLoading(false);
    }
  };

  const toggleWlSelection = (id) => {
    setWlSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAllLogs = () => {
    if (wlSelectedIds.length === weightLogs.length) {
      setWlSelectedIds([]);
    } else {
      setWlSelectedIds(weightLogs.map(l => l.id));
    }
  };

  const handleDeleteSelectedLogs = () => {
    showAlert(
      'DELETE ENTRIES',
      `Remove ${wlSelectedIds.length} entry/entries?`,
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              setLogLoading(true);
              await Promise.all(wlSelectedIds.map(id => weightLogsService.deleteWeightLog(id)));
              setWeightLogs(prev => prev.filter(l => !wlSelectedIds.includes(l.id)));
              setWlSelectionMode(false);
              setWlSelectedIds([]);
            } catch (e) {
              showAlert('ERROR', 'Failed to delete entries.');
            } finally {
              setLogLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── All other values come from profile ──
  const gender = profile?.gender || 'male';
  const height = profile?.height_cm || 175;

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

  const weightKg = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : (profile?.weight_kg || 75);
  const goalWeightKg = units === 'lbs' ? goalWeight / 2.20462 : goalWeight;

  const strategyIdx = deriveStrategy(weightKg, goalWeightKg);
  const strategyLabel = STRATEGIES[strategyIdx].label;

  // ── Goal Progress Logic ──
  const firstLoggedKg = weightLogs.length > 0 ? weightLogs[0].weight_kg : null;
  const anchorWeight = goalStartWeight !== null ? goalStartWeight : (firstLoggedKg !== null ? firstLoggedKg : profile?.weight_kg);
  const currentGoalKg = profile?.goal_weight;

  let progressPercent = 0;
  let showProgress = false;
  if (anchorWeight !== undefined && weightKg !== undefined && currentGoalKg !== undefined && currentGoalKg !== null) {
    showProgress = true;
    if (anchorWeight === currentGoalKg) {
      progressPercent = 100;
    } else {
      progressPercent = ((weightKg - anchorWeight) / (currentGoalKg - anchorWeight)) * 100;
      if (progressPercent < 0) progressPercent = 0;
      if (progressPercent > 100) progressPercent = 100;
    }
  }

  const diffGoalKg = Math.abs(weightKg - (currentGoalKg || 0));
  const toGoalDisplay = units === 'lbs' ? (diffGoalKg * 2.20462).toFixed(1) : diffGoalKg.toFixed(1);

  // ── Macros & Calories ──
  const bmr = useMemo(() => {
    const offset = gender === 'female' ? -161 : 5;
    return Math.round(10 * weightKg + 6.25 * height - 5 * age + offset);
  }, [weightKg, height, age, gender]);

  const tdee = useMemo(() => Math.round(bmr * ACTIVITY_OPTIONS[activityIdx].value), [bmr, activityIdx]);
  const targetIntake = tdee + STRATEGIES[strategyIdx].offset;

  const proLow = Math.round(weightKg * 1.6);
  const proHigh = Math.round(weightKg * 2.2);
  const fatLow = Math.round(weightKg * 0.7);
  const fatHigh = Math.round(weightKg * 1.0);
  const carbLow = Math.max(0, Math.round((targetIntake - proHigh * 4 - fatHigh * 9) / 4));
  const carbHigh = Math.max(0, Math.round((targetIntake - proLow * 4 - fatLow * 9) / 4));

  const getNote = () => {
    if (targetIntake < 1200)
      return 'AT THIS WEIGHT A 500 KCAL DEFICIT PUSHES INTAKE BELOW 1,200 KCAL — CONSIDER A SMALLER DEFICIT TO STAY ABOVE SAFE MINIMUMS.';
    if (strategyIdx === 0)
      return `EATING ${targetIntake.toLocaleString()} KCAL/DAY CREATES A ~500 KCAL DEFICIT. RECALCULATE EVERY 2–3 KG AS MAINTENANCE DROPS WITH WEIGHT.`;
    return `EATING ${targetIntake.toLocaleString()} KCAL/DAY SUPPORTS YOUR CURRENT STRATEGY. MAINTAIN CONSISTENCY FOR BEST RESULTS.`;
  };

  // Pre-calculate deltas on ascending logs
  const logsWithDeltas = weightLogs.map((log, idx) => {
    let prevKg = profile?.weight_kg;
    if (idx > 0) {
      prevKg = weightLogs[idx - 1].weight_kg;
    }
    return {
      ...log,
      deltaKg: prevKg !== undefined ? log.weight_kg - prevKg : null,
    };
  });

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        selectionMode={wlSelectionMode}
        selectedCount={wlSelectedIds.length}
        onCancelSelection={() => { setWlSelectionMode(false); setWlSelectedIds([]); }}
        onDeleteSelected={handleDeleteSelectedLogs}
        onSelectAll={handleSelectAllLogs}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          {/* 1. Sub label + Main title */}
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>HEALTH DIAGNOSTICS</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>CALORIE{'\n'}COMMAND</Text>

          {/* 2. Top Metrics */}
          <View style={styles.metricsGrid}>
            <AppTile style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>BMR</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{bmr.toLocaleString()}</Text>
              <Text style={[styles.metricSub, { color: colors.secondaryText }]}>CALORIES AT REST</Text>
            </AppTile>
            <AppTile style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>TDEE</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{tdee.toLocaleString()}</Text>
              <Text style={[styles.metricSub, { color: colors.secondaryText }]}>CALORIES BURNED DAILY</Text>
            </AppTile>
            <AppTile style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: colors.secondaryText }]}>CALORIE TARGET</Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>{targetIntake.toLocaleString()}</Text>
              <Text style={[styles.metricSub, { color: colors.secondaryText }]}>CALORIES TO EAT DAILY</Text>
            </AppTile>
          </View>

          {/* 3. MACROS */}
          <AppTile style={styles.card}>
            <Text style={[styles.cardHeader, { color: colors.accent }]}>MACRO RATIOS</Text>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={[styles.macroName, { color: colors.text }]}>PROTEIN</Text>
                <Text style={[styles.macroVal, { color: accentColor }]}>{proLow}G – {proHigh}G</Text>
              </View>
              <View style={[styles.mBarBg, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}><View style={[styles.mBarFill, { width: '85%', backgroundColor: accentColor }]} /></View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={[styles.macroName, { color: colors.text }]}>FATS</Text>
                <Text style={[styles.macroVal, { color: accentColor }]}>{fatLow}G – {fatHigh}G</Text>
              </View>
              <View style={[styles.mBarBg, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}><View style={[styles.mBarFill, { width: '40%', backgroundColor: accentColor }]} /></View>
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <Text style={[styles.macroName, { color: colors.text }]}>CARBS</Text>
                <Text style={[styles.macroVal, { color: accentColor }]}>{carbLow}G – {carbHigh}G</Text>
              </View>
              <View style={[styles.mBarBg, { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }]}><View style={[styles.mBarFill, { width: '60%', backgroundColor: accentColor }]} /></View>
            </View>
          </AppTile>

          {/* 4. PROFILE SNAPSHOT */}
          <AppTile style={styles.card}>
            <Text style={[styles.cardHeader, { color: colors.secondaryText }]}>PROFILE SNAPSHOT</Text>
            <View style={styles.snapshotGrid}>
              <View style={styles.snapshotItem}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>GENDER</Text>
                <Text style={[styles.snapshotValue, { color: colors.text }]}>{gender.toUpperCase()}</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>ACTIVITY</Text>
                <Text style={[styles.snapshotValue, { color: colors.text }]}>{activityLabel}</Text>
              </View>
              <View style={styles.snapshotItem}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>STRATEGY</Text>
                <Text style={[styles.snapshotValue, { color: strategyIdx === 1 ? colors.text : colors.accent }]}>{strategyLabel}</Text>
              </View>
            </View>
          </AppTile>

          {/* 5. GOAL PROGRESS */}
          {showProgress && (
            <AppTile style={styles.card}>
              <Text style={styles.cardHeader}>GOAL PROGRESS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <View style={[styles.mBarBg, { flex: 1, backgroundColor: '#333' }]}>
                  <View style={[styles.mBarFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]} />
                </View>
              </View>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.secondaryText, textAlign: 'right', marginTop: 4 }}>
                {toGoalDisplay} {units.toUpperCase()} TO GOAL
              </Text>
            </AppTile>
          )}

          {/* 6. WEIGHT SECTION */}
          <View
            style={{ marginBottom: 20 }}
            onLayout={(e) => setWeightSectionY(e.nativeEvent.layout.y)}
          >
            <Text style={[styles.cardHeader, { marginBottom: 10 }]}>
              CURRENT WEIGHT: {units === 'lbs' ? (weightKg * 2.20462).toFixed(1) : parseFloat(weightKg).toFixed(1)} {units.toUpperCase()}
            </Text>

            {/* Log new weight */}
            <AppTile style={styles.weightLogCard}>
              <Text style={[styles.wlLabel, { color: colors.secondaryText }]}>LOG THIS WEEK</Text>
              <View style={styles.wlInputRow}>
                <TextInput
                  style={[styles.wlInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder={`Weight (${units})`}
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={weightInput}
                  onChangeText={setWeightInput}
                />
                <TouchableOpacity
                  style={[styles.wlLogBtn, { backgroundColor: weightInput ? colors.accent : colors.secondaryBackground, borderColor: colors.border }]}
                  onPress={handleLogWeight}
                  disabled={logLoading || !weightInput}
                >
                  {logLoading
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={[styles.wlLogBtnText, { color: weightInput ? '#000' : colors.secondaryText }]}>LOG</Text>
                  }
                </TouchableOpacity>
              </View>
            </AppTile>



            {/* Timeline */}
            {logLoading && weightLogs.length === 0 ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
            ) : weightLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.secondaryText }}>NO WEIGHT ENTRIES YET</Text>
              </View>
            ) : (
              <AppTile style={{ marginTop: 10, maxHeight: 400, padding: 12 }}>
                <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                  {[...logsWithDeltas].reverse().map((log, idx) => {
                    const displayWeight = units === 'lbs'
                      ? (log.weight_kg * 2.20462).toFixed(1)
                      : log.weight_kg.toFixed(1);
                    const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    }).toUpperCase();
                    const isFirst = idx === 0;

                    // Delta formatting
                    let deltaDisplay = null;
                    let deltaColor = colors.secondaryText;

                    if (log.deltaKg !== null) {
                      const deltaVal = units === 'lbs' ? log.deltaKg * 2.20462 : log.deltaKg;

                      if (Math.abs(deltaVal) >= 0.1) {
                        const prefix = deltaVal > 0 ? '+' : '';
                        deltaDisplay = `${prefix}${deltaVal.toFixed(1)} ${units.toUpperCase()}`;

                        if (strategyIdx === 0) { // CUT
                          deltaColor = deltaVal < 0 ? colors.accent : '#FF3B30';
                        } else if (strategyIdx === 2) { // BULK
                          deltaColor = deltaVal > 0 ? colors.accent : '#FF3B30';
                        }
                      } else {
                        deltaDisplay = `0.0 ${units.toUpperCase()}`;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={log.id}
                        style={styles.wlEntry}
                        onPress={() => {
                          if (wlSelectionMode) toggleWlSelection(log.id);
                        }}
                        onLongPress={() => {
                          if (!wlSelectionMode) {
                            setWlSelectionMode(true);
                            setWlSelectedIds([log.id]);
                          }
                        }}
                        delayLongPress={300}
                        activeOpacity={wlSelectionMode ? 0.7 : 0.9}
                      >
                        <View style={styles.wlTimeline}>
                          <View style={[styles.wlDot, { backgroundColor: isFirst ? colors.accent : colors.border }]} />
                          {idx < weightLogs.length - 1 && <View style={[styles.wlLine, { backgroundColor: colors.border }]} />}
                        </View>
                        <View style={styles.wlEntryContent}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                              <Text style={[styles.wlWeight, { color: isFirst ? colors.accent : colors.text }]}>
                                {displayWeight} <Text style={{ fontSize: 14 }}>{units.toUpperCase()}</Text>
                              </Text>
                              <Text style={[styles.wlDate, { color: colors.secondaryText }]}>{dateStr}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              {deltaDisplay !== null && (
                                <Text style={[styles.wlDelta, { color: deltaColor }]}>
                                  {deltaDisplay}
                                </Text>
                              )}
                              {wlSelectionMode && (
                                <MaterialCommunityIcons
                                  name={wlSelectedIds.includes(log.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                                  size={24}
                                  color={wlSelectedIds.includes(log.id) ? colors.accent : colors.secondaryText}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </AppTile>
            )}
          </View>

          {/* 7. NOTE box */}
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
            <Text style={styles.noteText}>{getNote()}</Text>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </View>
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

  card: { padding: 20, marginBottom: 12 },
  cardHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16, opacity: 0.8 },

  weightHint: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 10 },

  snapshotGrid: { flexDirection: 'row', gap: 10 },
  snapshotItem: { flex: 1 },
  inputLabel: { fontSize: 9, fontWeight: '900', opacity: 0.5, marginBottom: 6 },
  snapshotValue: { fontSize: 16, fontWeight: '900' },

  macroRow: { marginBottom: 20 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroName: { fontSize: 12, fontWeight: '900' },
  macroVal: { fontSize: 12, fontWeight: '900' },
  mBarBg: { height: 4 },
  mBarFill: { height: '100%' },

  noteBox: { flexDirection: 'row', gap: 10, marginVertical: 30, paddingHorizontal: 10 },
  noteText: { fontSize: 11, fontWeight: '700', lineHeight: 18, flex: 1, color: '#888' },

  // ── Weight Log ──────────────────────────────────────
  weightLogCard: {
    padding: 20,
    marginBottom: 20,
  },
  wlLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  wlInputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  wlInput: {
    flex: 1,
    height: 52,
    borderBottomWidth: 2,
    fontSize: 28,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  wlLogBtn: {
    height: 52,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wlLogBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  wlEntry: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  wlTimeline: {
    width: 24,
    alignItems: 'center',
  },
  wlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    zIndex: 1,
  },
  wlLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
    minHeight: 40,
  },
  wlEntryContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 28,
  },
  wlWeight: {
    fontSize: 28,
    fontWeight: '900',
  },
  wlDate: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  wlDelta: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333',
    borderRadius: 4,
  },
});

export default Calories;
