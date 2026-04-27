import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { useRepsAlert } from '../context/AlertContext';
import { weightLogsService } from '../services/weightLogsService';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const WeightTrendChart = ({ logs, units, accentColor, colors, width = 300, height = 200 }) => {
  if (!logs || logs.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.secondaryText, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>NOT ENOUGH DATA FOR TREND</Text>
      </View>
    );
  }

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const data = logs.map(l => ({
    val: units === 'lbs' ? l.weight_kg * 2.20462 : l.weight_kg,
    time: new Date(l.logged_at).getTime()
  }));

  const minTime = data[0].time;
  const maxTime = data[data.length - 1].time;
  const timeRange = maxTime - minTime || 1;

  const minVal = Math.min(...data.map(d => d.val));
  const maxVal = Math.max(...data.map(d => d.val));
  const valRange = maxVal - minVal || 1;
  
  const yMin = minVal - valRange * 0.2;
  const yMax = maxVal + valRange * 0.2;
  const yRange = yMax - yMin;

  const points = data.map((d) => {
    const x = padding.left + ((d.time - minTime) / timeRange) * graphWidth;
    const y = padding.top + graphHeight - ((d.val - yMin) / yRange) * graphHeight;
    return { x, y, val: d.val, time: d.time };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((pct, i) => {
          const y = padding.top + graphHeight * pct;
          const labelVal = (yMax - yRange * pct).toFixed(1);
          return (
            <React.Fragment key={`grid-${i}`}>
              <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />
              <SvgText x={padding.left - 8} y={y} fill={colors.secondaryText} fontSize="10" fontWeight="600" textAnchor="end" alignmentBaseline="central">
                {labelVal}
              </SvgText>
            </React.Fragment>
          );
        })}

        <SvgText x={padding.left} y={height - 10} fill={colors.secondaryText} fontSize="10" fontWeight="600" textAnchor="start">
          {new Date(minTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
        </SvgText>
        <SvgText x={width - padding.right} y={height - 10} fill={colors.secondaryText} fontSize="10" fontWeight="600" textAnchor="end">
          {new Date(maxTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
        </SvgText>

        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={accentColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill={colors.background} stroke={accentColor} strokeWidth="2" />
        ))}
      </Svg>
    </View>
  );
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

  const [viewMode, setViewMode] = useState('DASHBOARD');
  const [wlSelectionMode, setWlSelectionMode] = useState(false);
  const [wlSelectedIds, setWlSelectedIds] = useState([]);

  const [selectedDays, setSelectedDays] = useState(30);

  const periodLabels = {
    7: 'Last Week',
    14: 'Last 2 Weeks',
    30: 'Last Month',
    60: 'Last 2 Months',
    90: 'Last 3 Months',
    180: 'Last 6 Months',
    365: 'Last 12 Months',
    9999: 'All Time'
  };

  const handlePeriodSelect = () => {
    const options = ['Last Week', 'Last 2 Weeks', 'Last Month', 'Last 2 Months', 'Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'All Time', 'Cancel'];
    const values = [7, 14, 30, 60, 90, 180, 365, 9999];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 8 },
        (index) => {
          if (index < 8) setSelectedDays(values[index]);
        }
      );
    } else {
      Alert.alert('Select Period', '', [
        ...values.map((v, i) => ({ text: options[i], onPress: () => setSelectedDays(v) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (refreshProfile) {
        refreshProfile();
      }
      fetchWeightLogs();
      fetchGoalStartWeight();

      if (route.params?.scrollToLog && weightSectionY > 0) {
        setViewMode('DASHBOARD');
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: weightSectionY, animated: true });
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

  const cutoffDate = new Date();
  if (selectedDays !== 9999) {
    cutoffDate.setDate(cutoffDate.getDate() - selectedDays);
  }

  const displayedLogs = selectedDays === 9999
    ? weightLogs
    : weightLogs.filter(l => new Date(l.logged_at) >= cutoffDate);

  const displayedLogsWithDeltas = selectedDays === 9999
    ? logsWithDeltas
    : logsWithDeltas.filter(l => new Date(l.logged_at) >= cutoffDate);

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
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'DASHBOARD' && { borderBottomColor: accentColor }]}
              onPress={() => setViewMode('DASHBOARD')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'DASHBOARD' ? colors.text : colors.secondaryText }]}>DASHBOARD</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'ANALYTICS' && { borderBottomColor: accentColor }]}
              onPress={() => setViewMode('ANALYTICS')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'ANALYTICS' ? colors.text : colors.secondaryText }]}>ANALYTICS</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subLabel, { color: colors.secondaryText, marginTop: 20 }]}>
            {viewMode === 'DASHBOARD' ? 'HEALTH DIAGNOSTICS' : 'WEIGHT TRACKING'}
          </Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {viewMode === 'DASHBOARD' ? 'CALORIE\nCOMMAND' : 'TRENDS\n& DATA'}
          </Text>

          {viewMode === 'DASHBOARD' ? (
            <View>
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
                  <Text style={[styles.metricValue, { color: accentColor }]}>{targetIntake.toLocaleString()}</Text>
                  <Text style={[styles.metricSub, { color: colors.secondaryText }]}>CALORIES TO EAT DAILY</Text>
                </AppTile>
              </View>

              <AppTile style={styles.card}>
                <Text style={[styles.cardHeader, { color: accentColor }]}>MACRO RATIOS</Text>

                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: colors.text }]}>PROTEIN</Text>
                    <Text style={[styles.macroVal, { color: accentColor }]}>{proLow}G – {proHigh}G</Text>
                  </View>
                  <View style={[styles.mBarBg, { backgroundColor: colors.border }]}><View style={[styles.mBarFill, { width: '85%', backgroundColor: accentColor }]} /></View>
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: colors.text }]}>FATS</Text>
                    <Text style={[styles.macroVal, { color: accentColor }]}>{fatLow}G – {fatHigh}G</Text>
                  </View>
                  <View style={[styles.mBarBg, { backgroundColor: colors.border }]}><View style={[styles.mBarFill, { width: '40%', backgroundColor: accentColor }]} /></View>
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroName, { color: colors.text }]}>CARBS</Text>
                    <Text style={[styles.macroVal, { color: accentColor }]}>{carbLow}G – {carbHigh}G</Text>
                  </View>
                  <View style={[styles.mBarBg, { backgroundColor: colors.border }]}><View style={[styles.mBarFill, { width: '60%', backgroundColor: accentColor }]} /></View>
                </View>
              </AppTile>

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
                    <Text style={[styles.snapshotValue, { color: strategyIdx === 1 ? colors.text : accentColor }]}>{strategyLabel}</Text>
                  </View>
                </View>
              </AppTile>

              <View
                style={{ marginBottom: 20 }}
                onLayout={(e) => setWeightSectionY(e.nativeEvent.layout.y)}
              >
                <Text style={[styles.cardHeader, { marginBottom: 10, color: colors.secondaryText }]}>
                  CURRENT WEIGHT: {units === 'lbs' ? (weightKg * 2.20462).toFixed(1) : parseFloat(weightKg).toFixed(1)} {units.toUpperCase()}
                </Text>

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
                      style={[styles.wlLogBtn, { backgroundColor: weightInput ? accentColor : colors.secondaryBackground, borderColor: colors.border }]}
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
              </View>

              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} />
                <Text style={styles.noteText}>{getNote()}</Text>
              </View>
            </View>
          ) : (
            <View>
              {showProgress && (
                <AppTile style={styles.card}>
                  <Text style={[styles.cardHeader, { color: colors.secondaryText }]}>GOAL PROGRESS</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={[styles.mBarBg, { flex: 1, backgroundColor: colors.border }]}>
                      <View style={[styles.mBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
                    </View>
                  </View>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.secondaryText, textAlign: 'right', marginTop: 4 }}>
                    {toGoalDisplay} {units.toUpperCase()} TO GOAL
                  </Text>
                </AppTile>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>WEIGHT TREND</Text>
                <TouchableOpacity
                  onPress={handlePeriodSelect}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.secondaryBackground,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 10, fontWeight: '700' }}>{periodLabels[selectedDays]}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={14} color={colors.text} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
              
              <AppTile style={{ paddingVertical: 20, marginBottom: 20 }}>
                {logLoading && displayedLogs.length === 0 ? (
                  <ActivityIndicator color={colors.text} style={{ marginVertical: 40 }} />
                ) : (
                  <WeightTrendChart logs={displayedLogs} units={units} accentColor={accentColor} colors={colors} width={SCREEN_WIDTH - 48} height={220} />
                )}
              </AppTile>

              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}>LOG HISTORY</Text>
              {logLoading && displayedLogsWithDeltas.length === 0 ? (
                <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
              ) : displayedLogsWithDeltas.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.secondaryText }}>NO ENTRIES IN THIS PERIOD</Text>
                </View>
              ) : (
                <AppTile style={{ maxHeight: 400, padding: 12 }}>
                  <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                    {[...displayedLogsWithDeltas].reverse().map((log, idx) => {
                      const displayWeight = units === 'lbs'
                        ? (log.weight_kg * 2.20462).toFixed(1)
                        : log.weight_kg.toFixed(1);
                      const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      }).toUpperCase();
                      const isFirst = idx === 0;

                      let deltaDisplay = null;
                      let deltaColor = colors.secondaryText;

                      if (log.deltaKg !== null) {
                        const deltaVal = units === 'lbs' ? log.deltaKg * 2.20462 : log.deltaKg;

                        if (Math.abs(deltaVal) >= 0.1) {
                          const prefix = deltaVal > 0 ? '+' : '';
                          deltaDisplay = `${prefix}${deltaVal.toFixed(1)} ${units.toUpperCase()}`;

                          if (strategyIdx === 0) { // CUT
                            deltaColor = deltaVal < 0 ? accentColor : '#FF3B30';
                          } else if (strategyIdx === 2) { // BULK
                            deltaColor = deltaVal > 0 ? accentColor : '#FF3B30';
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
                            <View style={[styles.wlDot, { backgroundColor: isFirst ? accentColor : colors.border }]} />
                            {idx < weightLogs.length - 1 && <View style={[styles.wlLine, { backgroundColor: colors.border }]} />}
                          </View>
                          <View style={styles.wlEntryContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View>
                                <Text style={[styles.wlWeight, { color: isFirst ? accentColor : colors.text }]}>
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
                                    color={wlSelectedIds.includes(log.id) ? accentColor : colors.secondaryText}
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
          )}

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
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2, opacity: 0.8 },

  viewToggle: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 10,
  },
  toggleBtn: {
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },

  metricsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricBox: { flex: 1, padding: 15, justifyContent: 'center' },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1, opacity: 0.6, marginBottom: 5 },
  metricValue: { fontSize: 18, fontWeight: '900' },
  metricSub: { fontSize: 7, fontWeight: '800', marginTop: 3, opacity: 0.5 },

  card: { padding: 20, marginBottom: 12 },
  cardHeader: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 16, opacity: 0.8 },

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
    borderColor: 'rgba(150,150,150,0.2)',
    borderRadius: 4,
  },
});

export default Calories;
