import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { sessionsService } from '../services/sessionsService';
import { setsService } from '../services/setsService';
import { weightLogsService } from '../services/weightLogsService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import { useMonolithAlert } from '../context/AlertContext';

const WeightsLog = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const { profile } = useProfile();
  const { showAlert } = useMonolithAlert();
  const [sessions, setSessions] = useState([]);
  const [progression, setProgression] = useState([]);
  const [viewMode, setViewMode] = useState('ARCHIVE'); // ARCHIVE | PROGRESSION | BODY_WEIGHT
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  // ── Weight Log State ──
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightInput, setWeightInput] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'ARCHIVE') {
        fetchSessions();
      } else if (viewMode === 'PROGRESSION') {
        fetchProgression();
      } else if (viewMode === 'BODY_WEIGHT') {
        fetchWeightLogs();
      }
    }, [viewMode])
  );

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
      setWeightInput('');
      await fetchWeightLogs();
    } catch (e) {
      showAlert('ERROR', 'Failed to log weight entry.');
    } finally {
      setLogLoading(false);
    }
  };

  const handleDeleteWeightLog = (id) => {
    showAlert(
      'DELETE ENTRY',
      'Remove this weight log entry?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              await weightLogsService.deleteWeightLog(id);
              setWeightLogs(prev => prev.filter(l => l.id !== id));
            } catch {
              showAlert('ERROR', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
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
          isSelected && { borderColor: '#CCFF00', borderWidth: 2 }
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
              <MaterialCommunityIcons name="check-decagram" size={16} color="#CCFF00" />
            </View>
          </View>
          {isSelectionMode && (
            <MaterialCommunityIcons
              name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
              size={24}
              color={isSelected ? '#CCFF00' : colors.secondaryText}
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
              <Text style={[styles.progStatValue, { color: '#CCFF00' }]}>{item.bestWeight}</Text>
              <Text style={[styles.progStatUnit, { color: '#CCFF00' }]}>{units.toUpperCase()}</Text>
              <MaterialCommunityIcons name="trophy" size={14} color="#CCFF00" style={{ marginLeft: 4 }} />
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 }}>CANCEL</Text>
            </TouchableOpacity>
            <Text style={[styles.brandTitle, { color: colors.text }]}>{selectedIds.length} SELECTED</Text>
            <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedIds.length === 0}>
              <MaterialCommunityIcons name="delete" size={24} color={selectedIds.length > 0 ? "#FF3B30" : colors.secondaryText} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="menu" size={24} color={colors.text} />
            <Text style={[styles.brandTitle, { color: colors.text }]}>MONOLITH</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <MaterialCommunityIcons name="account" size={24} color={colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'ARCHIVE' && { borderBottomColor: '#CCFF00' }]}
              onPress={() => { setViewMode('ARCHIVE'); setHasFetched(false); }}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'ARCHIVE' ? colors.text : colors.secondaryText }]}>ARCHIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'PROGRESSION' && { borderBottomColor: '#CCFF00' }]}
              onPress={() => setViewMode('PROGRESSION')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'PROGRESSION' ? colors.text : colors.secondaryText }]}>PROGRESSION</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'BODY_WEIGHT' && { borderBottomColor: '#CCFF00' }]}
              onPress={() => setViewMode('BODY_WEIGHT')}
            >
              <Text style={[styles.toggleBtnText, { color: viewMode === 'BODY_WEIGHT' ? colors.text : colors.secondaryText }]}>BODY WEIGHT</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.subLabel, { color: colors.secondaryText, marginTop: 20 }]}>
            {viewMode === 'ARCHIVE' ? 'CHRONOLOGICAL ARCHIVE' : viewMode === 'BODY_WEIGHT' ? 'WEEKLY TRACKING' : 'PERSONAL RECORDS'}
          </Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            {viewMode === 'ARCHIVE' ? 'SESSION\nHISTORY.' : viewMode === 'BODY_WEIGHT' ? 'BODY\nWEIGHT.' : 'WEIGHT\nPROGRESS.'}
          </Text>

          {viewMode === 'BODY_WEIGHT' ? (
            <View>
              {/* Log new weight */}
              <View style={[styles.weightLogCard, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
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
                    style={[styles.wlLogBtn, { backgroundColor: weightInput ? '#CCFF00' : colors.secondaryBackground, borderColor: colors.border }]}
                    onPress={handleLogWeight}
                    disabled={logLoading || !weightInput}
                  >
                    {logLoading
                      ? <ActivityIndicator size="small" color="#000" />
                      : <Text style={[styles.wlLogBtnText, { color: weightInput ? '#000' : colors.secondaryText }]}>LOG</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timeline */}
              {logLoading && weightLogs.length === 0 ? (
                <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
              ) : weightLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ color: colors.secondaryText }}>NO WEIGHT ENTRIES YET</Text>
                </View>
              ) : (
                <View style={{ marginTop: 20 }}>
                  {[...weightLogs].reverse().map((log, idx) => {
                    const displayWeight = units === 'lbs'
                      ? (log.weight_kg * 2.20462).toFixed(1)
                      : log.weight_kg.toFixed(1);
                    const dateStr = new Date(log.logged_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    }).toUpperCase();
                    const isFirst = idx === 0;
                    const prevLog = [...weightLogs].reverse()[idx - 1];
                    const delta = prevLog
                      ? (log.weight_kg - prevLog.weight_kg).toFixed(1)
                      : null;
                    return (
                      <View key={log.id} style={styles.wlEntry}>
                        <View style={styles.wlTimeline}>
                          <View style={[styles.wlDot, { backgroundColor: isFirst ? '#CCFF00' : colors.border }]} />
                          {idx < weightLogs.length - 1 && <View style={[styles.wlLine, { backgroundColor: colors.border }]} />}
                        </View>
                        <View style={styles.wlEntryContent}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                              <Text style={[styles.wlWeight, { color: isFirst ? '#CCFF00' : colors.text }]}>
                                {displayWeight} <Text style={{ fontSize: 14 }}>{units.toUpperCase()}</Text>
                              </Text>
                              <Text style={[styles.wlDate, { color: colors.secondaryText }]}>{dateStr}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              {delta !== null && (
                                <Text style={[styles.wlDelta, { color: parseFloat(delta) > 0 ? '#FF6B6B' : '#CCFF00' }]}>
                                  {parseFloat(delta) > 0 ? '+' : ''}{delta} KG
                                </Text>
                              )}
                              <TouchableOpacity onPress={() => handleDeleteWeightLog(log.id)}>
                                <Ionicons name="trash-outline" size={16} color={colors.secondaryText} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : loading && (viewMode === 'PROGRESSION' || (viewMode === 'ARCHIVE' && !hasFetched)) ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
          ) : viewMode === 'ARCHIVE' ? (
            <View>
              {sessions.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {uniqueFilters.map(filter => (
                      <TouchableOpacity
                        key={filter}
                        style={[styles.filterChip, { borderColor: colors.border }, selectedFilter === filter && { backgroundColor: '#CCFF00', borderColor: '#CCFF00' }]}
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
  // ── Weight Log ──────────────────────────────────────
  weightLogCard: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
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
  // ─────────────────────────────────────────────────────
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
});

export default WeightsLog;
