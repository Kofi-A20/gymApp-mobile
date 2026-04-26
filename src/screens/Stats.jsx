import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, ActionSheetIOS, Alert } from 'react-native';
import Body from 'react-native-body-highlighter';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { sessionsService } from '../services/sessionsService';
import { setsService } from '../services/setsService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import { useRepsAlert } from '../context/AlertContext';
import RepsHeader from '../components/RepsHeader';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { mapMuscleSlug, intensityColors, getIntensityForPct } from '../utils/muscleUtils';

const LABELS = ['Core', 'Shoulders', 'Arms', 'Legs', 'Back', 'Chest'];
const SIDES = LABELS.length;
const RINGS = 5; // number of concentric hexagon rings
const LABEL_CLEARANCE = 14; // dp clearance outside outermost ring

const polarToCartesian = (cx, cy, radius, index) => {
  const angleRad = (Math.PI * 2 * index) / SIDES;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
};

const hexagonPoints = (cx, cy, radius) =>
  Array.from({ length: SIDES })
    .map((_, i) => {
      const { x, y } = polarToCartesian(cx, cy, radius, i);
      return `${x},${y}`;
    })
    .join(' ');

const anchorForIndex = (index) => {
  const angle = (360 / SIDES) * index;
  const norm = ((angle % 360) + 360) % 360;
  if (norm > 80 && norm < 100) return 'middle';   // bottom
  if (norm > 260 && norm < 280) return 'middle';   // top
  if (norm >= 100 && norm <= 260) return 'end';     // left half
  return 'start';                                    // right half
};

const RadarChart = ({ data = {}, maxValue = 10, colors, size = 180 }) => {
  const svgSize = size + LABEL_CLEARANCE * 2 + 100; // extra room for labels
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const outerRadius = size / 2;

  const dataPoints = LABELS.map((label, i) => {
    const value = data[label] ?? 0;
    const fraction = maxValue > 0 ? Math.max(Math.min(value / maxValue, 1), 0.02) : 0.02;
    return polarToCartesian(cx, cy, outerRadius * fraction, i);
  });
  const dataPolygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={svgSize} height={svgSize}>
        {Array.from({ length: RINGS }).map((_, ringIdx) => {
          const ringRadius = outerRadius * ((ringIdx + 1) / RINGS);
          return (
            <Polygon
              key={`ring-${ringIdx}`}
              points={hexagonPoints(cx, cy, ringRadius)}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              strokeOpacity={0.9}
            />
          );
        })}
        {LABELS.map((_, i) => {
          const { x, y } = polarToCartesian(cx, cy, outerRadius, i);
          return (
            <Line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
              strokeOpacity={0.9}
            />
          );
        })}
        <Polygon
          points={dataPolygonPoints}
          fill={colors.accent}
          fillOpacity={0.4}
          stroke={colors.accent}
          strokeWidth={2}
          strokeOpacity={1}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {LABELS.map((label, i) => {
          const { x, y } = polarToCartesian(cx, cy, outerRadius + LABEL_CLEARANCE, i);
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fill={colors.text}
              fontSize={10}
              fontWeight="600"
              textAnchor={anchorForIndex(i)}
              alignmentBaseline="central"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const Stats = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { showAlert } = useRepsAlert();
  const [sessions, setSessions] = useState([]);
  const [progression, setProgression] = useState([]);
  const [viewMode, setViewMode] = useState('OVERVIEW'); // OVERVIEW | ARCHIVE | PROGRESSION
  const [overviewStats, setOverviewStats] = useState(null);
  const [activeHours, setActiveHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedDays, setSelectedDays] = useState(30);
  const scrollRef = useRef(null);

  const periodLabels = {
    30: 'Last 30 Days',
    60: 'Last 60 Days',
    90: 'Last 90 Days',
    180: 'Last 6 Months',
  };

  const handlePeriodSelect = () => {
    const options = ['Last 30 Days', 'Last 60 Days', 'Last 90 Days', 'Last 6 Months', 'Cancel'];
    const values = [30, 60, 90, 180];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 4 },
        (index) => {
          if (index < 4) setSelectedDays(values[index]);
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
      if (viewMode === 'OVERVIEW') {
        fetchOverview(selectedDays);
      } else if (viewMode === 'ARCHIVE') {
        fetchSessions();
      } else if (viewMode === 'PROGRESSION') {
        fetchProgression();
      }
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }, [viewMode, selectedDays])
  );

  const fetchOverview = async (days = 30) => {
    setLoading(true);
    try {
      const stats = await sessionsService.getOverviewStats(days);
      setOverviewStats(stats);

      const trainingStats = await sessionsService.getTrainingStats(days);
      setActiveHours(trainingStats.activeHours);
    } catch (error) {
      console.error('Failed to fetch overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!hasFetched) setLoading(true);
    try {
      const data = await sessionsService.getSessionHistory();
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const fetchProgression = async () => {
    setLoading(true);
    try {
      const data = await setsService.getUserProgression();
      setProgression(data || []);
    } catch (error) {
      console.error('Failed to fetch progression:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedSessions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedSessions.map(s => s.id));
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    showAlert(
      "DELETE SESSIONS",
      `Are you sure you want to permanently delete these ${selectedIds.length} records? This action cannot be undone.`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DESTROY",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await sessionsService.bulkDeleteSessions(selectedIds);
              setSessions(prev => prev.filter(s => !selectedIds.includes(s.id)));
              setIsSelectionMode(false);
              setSelectedIds([]);
            } catch (error) {
              showAlert("Error", "Failed to delete selected sessions.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const SessionCard = ({ session }) => {
    const isSelected = selectedIds.includes(session.id);
    const dateObj = new Date(session.started_at || session.created_at);
    let date = 'INVALID DATE';
    if (!isNaN(dateObj)) {
      date = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
      }).toUpperCase();
    }

    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          { backgroundColor: colors.secondaryBackground, borderColor: colors.border },
          isSelected && { borderColor: colors.accent, borderWidth: 2 }
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(session.id);
          } else {
            navigation.navigate('SessionHistoryDetail', { session });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([session.id]);
          }
        }}
        delayLongPress={300}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.workout_name?.toUpperCase() || 'FREE SESSION'}</Text>
            <View style={styles.sessionHeader}>
              <Text style={[styles.sessionDate, { color: colors.secondaryText }]}>{date}</Text>
              <MaterialCommunityIcons name="check-decagram" size={16} color={colors.accent} />
            </View>
          </View>
          {isSelectionMode && (
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              color={isSelected ? colors.accent : colors.secondaryText}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const uniqueFilters = ["ALL", ...new Set(sessions.map(s => s.workout_name?.toUpperCase() || 'FREE SESSION'))];
  const displayedSessions = selectedFilter === "ALL"
    ? sessions
    : sessions.filter(s => (s.workout_name?.toUpperCase() || 'FREE SESSION') === selectedFilter);

  const renderOverview = () => {
    if (!overviewStats) return null;

    const gender = profile?.gender === 'female' ? 'female' : 'male';

    // ── Set distribution data ──
    const specificBreakdown = overviewStats.specificBreakdown || {};
    const sortedMuscles = Object.entries(specificBreakdown)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    const totalSpecificSets = sortedMuscles.reduce((acc, [_, c]) => acc + c, 0);
    const maxSpecificCount = sortedMuscles.length > 0 ? sortedMuscles[0][1] : 1;

    // ── Heatmap: fixed percentage thresholds ──
    const bodyData = [];
    sortedMuscles.forEach(([muscle, count]) => {
      const pct = totalSpecificSets > 0 ? count / totalSpecificSets : 0;
      const intensity = getIntensityForPct(pct);

      const slug = mapMuscleSlug(muscle);
      if (slug) {
        bodyData.push({ slug, intensity });
      }
    });

    return (
      <View>
        <TouchableOpacity
          onPress={handlePeriodSelect}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: colors.secondaryBackground,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{periodLabels[selectedDays]}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.text} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 4 }]}>TRAINING BALANCE</Text>
        <View style={{ alignItems: 'center', marginBottom: 10 }}>
          <RadarChart
            data={overviewStats.muscleBreakdown}
            maxValue={Math.max(...Object.values(overviewStats.muscleBreakdown), 1)}
            colors={colors}
            size={200}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>MUSCLE HEATMAP</Text>
        <View style={[styles.heatmapContainer, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Body data={bodyData} side="front" gender={gender} scale={0.7} colors={[intensityColors[1], intensityColors[2], intensityColors[3], intensityColors[4], intensityColors[5], intensityColors[6]]} border="#1C2733" />
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Body data={bodyData} side="back" gender={gender} scale={0.7} colors={[intensityColors[1], intensityColors[2], intensityColors[3], intensityColors[4], intensityColors[5], intensityColors[6]]} border="#1C2733" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, marginTop: 20 }}>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>WORKOUTS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{overviewStats.totalWorkouts}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>TOTAL SETS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{overviewStats.totalSets}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 30 }}>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>TOTAL VOLUME</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{Math.round(overviewStats.totalVolume)} {units}</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
            <Text style={[styles.statTileLabel, { color: colors.secondaryText }]}>ACTIVE HOURS</Text>
            <Text style={[styles.statTileValue, { color: colors.text }]}>{activeHours.toFixed(1)}h</Text>
          </View>
        </View>

        {sortedMuscles.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>SET DISTRIBUTION</Text>
            <View style={[
              { backgroundColor: colors.secondaryBackground, borderColor: colors.border, borderWidth: 1, borderRadius: 4, padding: 16 }
            ]}>
              {sortedMuscles.map(([muscle, count], idx) => {
                const pctDecimal = totalSpecificSets > 0 ? count / totalSpecificSets : 0;
                const intensity = getIntensityForPct(pctDecimal);

                const pct = Math.round(pctDecimal * 100);
                const barWidth = `${(count / maxSpecificCount) * 100}%`;
                return (
                  <View key={muscle} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: idx < sortedMuscles.length - 1 ? 14 : 0 }}>
                    <Text style={{ fontSize: 12, color: colors.secondaryText, width: 90, fontWeight: '700' }}>{muscle}</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, marginHorizontal: 10 }}>
                      <View style={{ width: barWidth, height: 6, backgroundColor: intensityColors[intensity], borderRadius: 3, opacity: 0.8 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700', width: 70, textAlign: 'right' }}>{count} · {pct}%</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    );
  };

  const ProgressionCard = ({ item }) => {
    const lastDateObj = new Date(item.lastDate);
    const dateLabel = lastDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

    return (
      <View style={[styles.progRow, { borderColor: colors.border }]}>
        <View style={styles.progMain}>
          <Text style={[styles.progName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
          <Text style={[styles.progDate, { color: colors.secondaryText }]}>LAST: {dateLabel}</Text>
        </View>
        <View style={styles.progStats}>
          <View style={styles.progStatItem}>
            <Text style={[styles.progStatLabel, { color: colors.secondaryText }]}>BEST</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.progStatValue, { color: colors.accent }]}>{item.bestWeight}</Text>
              <Text style={[styles.progStatUnit, { color: colors.accent }]}>{units.toUpperCase()}</Text>
              <MaterialCommunityIcons name="trophy" size={14} color={colors.accent} style={{ marginLeft: 4 }} />
            </View>
          </View>
          <View style={styles.progStatItem}>
            <Text style={[styles.progStatLabel, { color: colors.secondaryText }]}>LAST</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.progStatValue, { color: colors.text }]}>{item.lastWeight}</Text>
              <Text style={[styles.progStatUnit, { color: colors.text }]}>{units.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        selectionMode={isSelectionMode}
        selectedCount={selectedIds.length}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedIds([]); }}
        onDeleteSelected={handleDeleteSelected}
        onSelectAll={handleSelectAll}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'OVERVIEW' && { borderBottomColor: colors.accent }]}
              onPress={() => setViewMode('OVERVIEW')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'OVERVIEW' ? colors.text : colors.secondaryText }]}>OVERVIEW</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'ARCHIVE' && { borderBottomColor: colors.accent }]}
              onPress={() => { setViewMode('ARCHIVE'); setHasFetched(false); }}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'ARCHIVE' ? colors.text : colors.secondaryText }]}>ARCHIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'PROGRESSION' && { borderBottomColor: colors.accent }]}
              onPress={() => setViewMode('PROGRESSION')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'PROGRESSION' ? colors.text : colors.secondaryText }]}>PROGRESSION</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subLabel, { color: colors.secondaryText, marginTop: 20 }]}>
            {viewMode === 'OVERVIEW' ? 'TRAINING SUMMARY' : viewMode === 'ARCHIVE' ? 'CHRONOLOGICAL ARCHIVE' : 'PERSONAL RECORDS'}
          </Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {viewMode === 'OVERVIEW' ? 'OVERVIEW\nSTATS.' : viewMode === 'ARCHIVE' ? 'SESSION\nHISTORY.' : 'WEIGHT\nPROGRESS.'}
          </Text>

          {loading && (viewMode === 'OVERVIEW' || viewMode === 'PROGRESSION' || (viewMode === 'ARCHIVE' && !hasFetched)) ? (

            <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
          ) : viewMode === 'OVERVIEW' ? (
            renderOverview()
          ) : viewMode === 'ARCHIVE' ? (
            <View>
              {sessions.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {uniqueFilters.map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterChip, { borderColor: colors.border }, selectedFilter === filter && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                        onPress={() => setSelectedFilter(filter)}
                      >
                        <Text style={[styles.filterChipText, selectedFilter === filter ? { color: '#000' } : { color: colors.text }]}>{filter}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {displayedSessions.length > 0 ? (
                <View style={{ maxHeight: 400, borderWidth: 1, borderColor: colors.border, borderRadius: 4, padding: 10, paddingRight: 5 }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {displayedSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.secondaryText }}>
                    {sessions.length > 0 ? "NO SESSIONS MATCH FILTER" : "NO HISTORY COMMITTED"}
                  </Text>
                  {sessions.length === 0 && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => navigation.navigate('Workouts')}
                    >
                      <Text style={{ color: '#000', fontWeight: '900' }}>START FIRST SESSION</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            progression.length > 0 ? (
              progression.map((item) => (
                <ProgressionCard key={item.id} item={item} />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.secondaryText }}>NO TRACKED PROGRESS YET</Text>
              </View>
            )
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
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
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  progMain: {
    flex: 1,
  },
  progName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  progDate: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  progStats: {
    flexDirection: 'row',
    gap: 20,
  },
  progStatItem: {
    alignItems: 'flex-end',
  },
  progStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 4,
  },
  progStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  progStatUnit: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 2,
    marginTop: 4,
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
  },
  sessionCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    height: 85,
    marginBottom: 16,
    justifyContent: 'center',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sessionDate: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statTile: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderRadius: 4,
  },
  statTileLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statTileValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },

  heatmapContainer: {
    flexDirection: 'row',
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'space-between',
    height: 300,
  },
});

export default Stats;
