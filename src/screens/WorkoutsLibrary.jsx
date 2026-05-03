import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Pressable, Dimensions, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { workoutsService } from '../services/workoutsService';

import { sharingService } from '../services/sharingService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import { useRepsAlert } from '../context/AlertContext';
import QRCode from 'react-native-qrcode-svg';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';

const WorkoutsLibrary = ({ navigation, route }) => {
  const { colors, isDarkMode, units, accentColor } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { showAlert } = useRepsAlert();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const { width: windowWidth } = Dimensions.get('window');
  const scrollViewRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();

      // Clear the refresh param and scroll to top if requested
      if (route.params?.refresh) {
        navigation.setParams({ refresh: undefined });
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
      }
    }, [route.params?.refresh])
  );

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
    const isSelected = selectedIds.includes(item.id);
    const menuRef = useRef(null);

    // Dynamic Metadata
    const totalSets = item.exercises?.reduce((sum, ex) => sum + (ex.sets_target || 3), 0) || 0;
    const estimatedMins = Math.round((totalSets * 135) / 60);

    return (
      <AppTile
        style={[
          styles.card,
          isSelected && { borderColor: accentColor, borderWidth: 2 }
        ]}
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
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.workoutName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {isSelectionMode && (
              <MaterialCommunityIcons
                name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                size={24}
                color={isSelected ? accentColor : colors.secondaryText} />
            )}
          </View>
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardMetadata, { color: colors.secondaryText }]}>
            {item.exercises?.length || 0} EXERCISES
          </Text>
          <Text style={[styles.cardMetadata, { color: colors.secondaryText }]}>
            ~{estimatedMins} MIN
          </Text>
        </View>
      </AppTile>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>

      <RepsHeader
        rightActions={[{ icon: 'plus-circle', library: 'AntDesign', onPress: () => navigation.navigate('CreateWorkout') }]}
        selectionMode={isSelectionMode}
        selectedCount={selectedIds.length}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedIds([]); }}
        onDeleteSelected={handleDeleteSelected}
        onSelectAll={handleSelectAll}
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          <Text style={[styles.mainTitle, { color: colors.text, marginBottom: 20 }]}>WORKOUT{"\n"}LIBRARY.</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <AppTile style={{ flex: 1 }}>
              <TouchableOpacity
                style={{ padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                onPress={() => navigation.navigate('ImportWorkout', { workouts })}
              >
                <MaterialCommunityIcons name="swap-vertical" size={20} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.text, fontWeight: '800', letterSpacing: 1 }}>SHARE / IMPORT</Text>
              </TouchableOpacity>
            </AppTile>
          </View>

          <View style={[styles.listContainer, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 20 }]}>
            {loading ? (
              <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
            ) : workouts.length > 0 ? (
              <View>
                {workouts.map((workout) => (
                  <WorkoutCard key={workout.id} item={workout} />
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 80, marginBottom: 40 }}>
                <Text style={{ color: colors.secondaryText, fontSize: 14 }}>No workout routines yet.</Text>
              </View>
            )}
          </View>

          <View style={{ height: 120 }} />
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  workoutName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
  },
  cardMetadata: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
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
    borderBottomColor: 'rgba(150,150,150,0.2)',
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  shareModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shareModalContent: {
    width: '100%',
    padding: 30,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeShareBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 2,
  },
  shareModalTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  shareModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 30,
  },
  tokenContainer: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  logBtnText: {
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default WorkoutsLibrary;
