import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { workoutsService } from '../services/workoutsService';
import { sessionsService } from '../services/sessionsService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import { useRepsAlert } from '../context/AlertContext';
import RepsHeader from '../components/MonolithHeader';

const WorkoutsLibrary = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { showAlert } = useRepsAlert();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [dropdownConfig, setDropdownConfig] = useState({
    visible: false,
    item: null,
    position: { top: 0, right: 0 }
  });
  const [stats, setStats] = useState({ cumulativeVolume: 0, weeklyLoad: 0, activeHours: 0 });

  const { width: windowWidth } = Dimensions.get('window');

  const openDropdown = (item, measureRef) => {
    measureRef.current.measure((x, y, width, height, pageX, pageY) => {
      setDropdownConfig({
        visible: true,
        item,
        position: {
          top: pageY + height + 5,
          right: windowWidth - pageX - width
        }
      });
    });
  };

  const closeDropdown = () => {
    setDropdownConfig(prev => ({ ...prev, visible: false }));
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    try {
      const data = await sessionsService.getTrainingStats();
      console.log('Training Stats Fetched:', data);
      setStats(data || { cumulativeVolume: 0, weeklyLoad: 0, activeHours: 0 });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchWorkouts = async () => {
    try {
      const data = await workoutsService.getUserWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === workouts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(workouts.map(w => w.id));
    }
  };

  const handleMenuPress = (item) => {
    // Replaced by inline floating dropdown
  };

  const handleDeleteSelected = () => {
    showAlert(
      "Delete Workouts",
      `Are you sure you want to delete ${selectedIds.length} routine(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await workoutsService.bulkDeleteWorkouts(selectedIds);
              setWorkouts(prev => prev.filter(w => !selectedIds.includes(w.id)));
              setIsSelectionMode(false);
              setSelectedIds([]);
            } catch (error) {
              console.error(error);
              showAlert("Error", "Failed to delete workouts");
            }
          }
        }
      ]
    );
  };

  const WorkoutCard = ({ item }) => {
    const muscles = item.exercises?.map(ex => ex.name.split(' ')[0]).slice(0, 3).join(' / ') || 'MIXED';
    const isSelected = selectedIds.includes(item.id);
    const menuRef = useRef(null);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.secondaryBackground, borderColor: colors.border },
          isSelected && { borderColor: '#CCFF00', borderWidth: 2 }
        ]}
        activeOpacity={0.8}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            navigation.navigate('WorkoutDetail', { workout: item });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds([item.id]);
          }
        }}
        delayLongPress={300}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.sequenceId, { color: colors.secondaryText }]}>TEMPLATE_ID: {item.id.split('-')[0].toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {isSelectionMode ? (
              <MaterialCommunityIcons
                name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                size={24}
                color={isSelected ? '#CCFF00' : colors.secondaryText} />
            ) : (
              <View ref={menuRef} collapsable={false}>
                <TouchableOpacity onPress={() => openDropdown(item, menuRef)}>
                  <MaterialCommunityIcons name="dots-horizontal" size={24} color={colors.secondaryText} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
          <Text style={[styles.muscleGroups, { color: colors.secondaryText }]}>{muscles.toUpperCase()}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.progressContainer}>
            <Text style={[styles.sequenceId, { color: colors.secondaryText }]}>
              {item.exercises?.length || 0} MOVEMENTS
            </Text>
          </View>
          <Text style={[styles.startBtn, { color: '#CCFF00' }]}>START SESSION</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      {/* Dropdown Menu Modal */}
      <Modal visible={dropdownConfig.visible} transparent animationType="fade" onRequestClose={closeDropdown}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDropdown}>
          <View style={[
            styles.dropdownMenu,
            {
              top: dropdownConfig.position.top,
              right: dropdownConfig.position.right,
              backgroundColor: colors.background,
              borderColor: colors.border
            }
          ]}>
            <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => {
              setIsSelectionMode(true);
              setSelectedIds([dropdownConfig.item.id]);
              closeDropdown();
            }}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>SELECT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => {
              closeDropdown();
              showAlert("SHARE", "Generating share link...");
            }}>
              <MaterialCommunityIcons name="share-variant" size={16} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownItemText, { color: colors.text }]}>SHARE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.dropdownItem, { borderBottomWidth: 0 }]} onPress={() => {
              closeDropdown();
              showAlert(
                "Delete Workout",
                `Are you sure you want to delete this routine?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete", style: "destructive", onPress: async () => {
                      try {
                        await workoutsService.bulkDeleteWorkouts([dropdownConfig.item.id]);
                        setWorkouts(prev => prev.filter(w => w.id !== dropdownConfig.item.id));
                      } catch (err) {
                        showAlert("Error", "Failed to delete workout");
                      }
                    }
                  }
                ]
              );
            }}>
              <MaterialCommunityIcons name="delete-outline" size={16} color="#FF3B30" style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownItemText, { color: '#FF3B30' }]}>DELETE</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <RepsHeader 
          rightActions={[{ icon: 'plus-circle', library: 'AntDesign', onPress: () => navigation.navigate('AddWorkout') }]} 
          selectionMode={isSelectionMode} 
          selectedCount={selectedIds.length} 
          onCancelSelection={() => { setIsSelectionMode(false); setSelectedIds([]); }} 
          onDeleteSelected={handleDeleteSelected} 
          onSelectAll={handleSelectAll}
        />

        <View style={styles.content}>
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>WORKOUT LIBRARY / Q3 CYCLE</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>STRENGTH{"\n"}ARCHIVE.</Text>

          <Text style={[styles.description, { color: colors.secondaryText }]}>
            A curated selection of high-intensity protocols designed for structural hypertrophy and neurological adaptation.
          </Text>

          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
            ) : workouts.length > 0 ? (
              workouts.map((workout) => (
                <WorkoutCard key={workout.id} item={workout} />
              ))
            ) : (
              <View style={{ alignItems: 'center', marginTop: 80, marginBottom: 40 }}>
                <Text style={{ color: colors.secondaryText, fontSize: 14 }}>No workout routines yet.</Text>
              </View>
            )}
          </View>

          {/* Cumulative Volume Footer */}
          <View style={styles.volumeContainer}>
            <Text style={[styles.volumeTitle, { color: colors.text }]}>
              {profile?.units === 'lbs'
                ? (stats.cumulativeVolume * 2.20462).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : stats.cumulativeVolume.toLocaleString()
              }{' '}
              {profile?.units?.toUpperCase() || 'KG'} VOLUME
            </Text>
            <View style={styles.volumeGrid}>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>WEEKLY LOAD</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>
                  {profile?.units === 'lbs'
                    ? (stats.weeklyLoad * 2.20462).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : stats.weeklyLoad.toLocaleString()
                  }
                </Text>
                <Text style={[styles.volumeSub, { color: colors.secondaryText }]}>
                  {profile?.units === 'lbs' ? 'POUNDS' : 'KILOGRAMS'}
                </Text>
              </View>
              <View style={styles.volumeItem}>
                <Text style={[styles.volumeLabel, { color: colors.secondaryText }]}>ACTIVE TIME</Text>
                <Text style={[styles.volumeValue, { color: colors.text }]}>
                  {stats.activeHours.toFixed(1)}
                </Text>
                <Text style={[styles.volumeSub, { color: colors.secondaryText }]}>HOURS / WEEK</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
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
  dropdownMenu: {
    position: 'absolute',
    width: 140,
    borderWidth: 1,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default WorkoutsLibrary;
