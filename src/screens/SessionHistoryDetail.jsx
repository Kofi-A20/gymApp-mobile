import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { AntDesign, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import { sessionsService } from '../services/sessionsService';
import { setsService } from '../services/setsService';
import { useRepsAlert } from '../context/AlertContext';

const SessionHistoryDetail = ({ route, navigation }) => {
  const { session } = route.params; // use only for id, title, date while sets load
  const { colors, isDarkMode, units, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();

  const [detailedSession, setDetailedSession] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('');

  // Fetch full session data (with sets and exercise names) on mount
  useEffect(() => {
    const fetch = async () => {
      console.log('fetching session detail:', session.id);
      try {
        const data = await sessionsService.getSessionDetail(session.id);
        setDetailedSession(data);
      } catch (err) {
        showAlert('Error', 'Failed to load session details.');
      } finally {
        setFetching(false);
      }
    };
    fetch();
  }, [session.id]);

  // Group sets by exercise — derived from fully fetched detailedSession
  const groupedSets = (detailedSession?.session_sets || []).reduce((acc, set) => {
    const exId = set.exercises?.id || 'unknown';
    if (!acc[exId]) {
      acc[exId] = {
        name: set.exercises?.name || 'UNKNOWN EXERCISE',
        sets: []
      };
    }
    acc[exId].sets.push(set);
    return acc;
  }, {});

  const handleEditClick = (set) => {
    setEditingSet(set.id);
    setEditWeight(String(set.weight_kg));
    setEditReps(String(set.reps));
  };

  const saveSetEdit = async (setId) => {
    if (!editWeight || !editReps) return;
    setLoading(true);
    try {
      await setsService.updateSet(setId, parseFloat(editWeight), parseInt(editReps));
      // Update detailedSession in local state so the UI refreshes
      setDetailedSession(prev => ({
        ...prev,
        session_sets: prev.session_sets.map(s =>
          s.id === setId
            ? { ...s, weight_kg: parseFloat(editWeight), reps: parseInt(editReps) }
            : s
        )
      }));
      setEditingSet(null);
    } catch (err) {
      showAlert('Error', 'Failed to update set details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = () => {
    showAlert(
      "Delete Session",
      "Are you sure you want to permanently delete this record? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await sessionsService.deleteSession(session.id);
              navigation.goBack();
            } catch (err) {
              showAlert("Error", "Failed to delete session.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const dateObj = new Date(session.started_at || session.completed_at || session.created_at);
  const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase() : 'UNKNOWN LOG DATE';

  if (fetching) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator color={accentColor} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader 
        onLeftPress={() => navigation.goBack()}
        title={dateStr}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>HISTORICAL RECORD</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{session.workout_name?.toUpperCase() || 'FREE SESSION'}</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.border }]}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>VOLUME ({units.toUpperCase()})</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>{detailedSession?.total_volume_kg || 0}</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.border }]}>
               <Text style={[styles.statLabel, { color: colors.secondaryText }]}>SETS</Text>
               <Text style={[styles.statValue, { color: colors.text }]}>{detailedSession?.session_sets?.length || 0}</Text>
            </View>
          </View>

          {Object.entries(groupedSets).map(([exId, group]) => (
            <View key={exId} style={[styles.exerciseBlock, { borderColor: colors.border }]}>
               <View style={styles.exerciseHeader}>
                 <Text style={[styles.exerciseTitle, { color: colors.text }]}>{group.name.toUpperCase()}</Text>
               </View>

               <View style={styles.setsContainer}>
                  <View style={styles.setsHeaderRow}>
                     <Text style={[styles.setHeaderLabel, { flex: 0.5, color: colors.secondaryText }]}>SET</Text>
                     <Text style={[styles.setHeaderLabel, { flex: 1, textAlign: 'center', color: colors.secondaryText }]}>WEIGHT</Text>
                     <Text style={[styles.setHeaderLabel, { flex: 1, textAlign: 'center', color: colors.secondaryText }]}>REPS</Text>
                     <Text style={[styles.setHeaderLabel, { flex: 0.5, color: colors.secondaryText, textAlign: 'right' }]}>MODIFY</Text>
                  </View>

                  {group.sets.sort((a,b) => a.set_number - b.set_number).map((set) => {
                     const isEditing = editingSet === set.id;

                     return (
                       <View key={set.id} style={[styles.setRow, { borderBottomColor: isDarkMode ? '#111' : '#EEE' }]}>
                          <Text style={[styles.setNum, { color: colors.text }]}>{set.set_number}</Text>
                          
                          {isEditing ? (
                             <>
                               <TextInput
                                  style={[styles.smallInput, { color: accentColor, borderColor: colors.border }]}
                                  keyboardType="numeric"
                                  value={editWeight}
                                  onChangeText={setEditWeight}
                                  autoFocus
                               />
                               <TextInput
                                  style={[styles.smallInput, { color: accentColor, borderColor: colors.border }]}
                                  keyboardType="numeric"
                                  value={editReps}
                                  onChangeText={setEditReps}
                               />
                               <TouchableOpacity 
                                  style={[styles.actionBtn, { backgroundColor: accentColor }]}
                                  onPress={() => saveSetEdit(set.id)}
                                  disabled={loading}
                               >
                                  {loading ? <ActivityIndicator size="small" color="#000" /> : <MaterialCommunityIcons name="content-save" size={16} color="#000" />}
                               </TouchableOpacity>
                             </>
                          ) : (
                             <>
                               <Text style={[styles.setData, { color: colors.text }]}>{set.weight_kg}</Text>
                               <Text style={[styles.setData, { color: colors.text }]}>{set.reps}</Text>
                               <TouchableOpacity 
                                  style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}
                                  onPress={() => handleEditClick(set)}
                                  disabled={loading}
                               >
                                  <MaterialCommunityIcons name="pencil" size={16} color={colors.secondaryText} />
                               </TouchableOpacity>
                             </>
                          )}
                       </View>
                     );
                  })}
               </View>
            </View>
          ))}

          {detailedSession?.notes && detailedSession.notes.trim() !== '' && (
            <View style={styles.notesBlock}>
               <Text style={[styles.subLabel, { color: colors.secondaryText, marginBottom: 8 }]}>SESSION NOTES</Text>
               <Text style={[styles.notesText, { color: colors.text }]}>{detailedSession.notes}</Text>
            </View>
          )}

          <TouchableOpacity 
             style={[styles.deleteBtn, { borderColor: '#FF3333' }]}
             onPress={handleDeleteSession}
             disabled={loading}
          >
             <Text style={[styles.deleteBtnText, { color: '#FF3333' }]}>DELETE SESSION</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 30,
    marginBottom: 40,
  },
  statBox: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 15,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
  },
  exerciseBlock: {
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  exerciseHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)'
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  setsContainer: {
    padding: 15,
  },
  setsHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  setHeaderLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  setNum: {
    flex: 0.5,
    fontSize: 14,
    fontWeight: '900',
  },
  setData: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
  },
  smallInput: {
    flex: 1,
    marginHorizontal: 5,
    borderBottomWidth: 2,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    borderRadius: 4,
  },
  notesBlock: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  deleteBtn: {
    marginTop: 60,
    borderWidth: 2,
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default SessionHistoryDetail;
