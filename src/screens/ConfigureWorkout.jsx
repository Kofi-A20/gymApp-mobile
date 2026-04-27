import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { workoutsService } from '../services/workoutsService';
import { useRepsAlert } from '../context/AlertContext';
import RepsHeader from '../components/RepsHeader';
import { ColorPickerModal } from '../components/ColorPickerModal';
import AppTile from '../components/AppTile';

// ─── Component ───────────────────────────────────────────────────────────────

const ConfigureWorkout = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();
  // Exercises arrive from CreateWorkout with id, name, muscle_group, etc.
  // We manage sets_target / reps_target locally.
  const [exercises, setExercises] = useState(
    (route.params?.selectedExercises || []).map((ex) => ({
      ...ex,
      sets_target: ex.sets_target || '',
      reps_target: ex.reps_target || '',
    }))
  );
  const workoutName = route.params?.workoutName || 'NEW WORKOUT';
  const editWorkoutId = route.params?.editWorkoutId || null;

  const [selectedColor, setSelectedColor] = useState(route.params?.editWorkoutColor || '#FF3B30');
  const [showColorModal, setShowColorModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Reorder ───────────────────────────────────────────────────────────────

  const moveExercise = useCallback((index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === exercises.length - 1) return;
    setExercises((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + direction];
      next[index + direction] = temp;
      return next;
    });
  }, [exercises.length]);

  // ─── Validation & Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    Keyboard.dismiss();
    const missing = exercises.find((ex) => !ex.sets_target || !ex.reps_target);
    if (missing) {
      showAlert('MISSING DATA', `Please provide sets and reps for ${missing.name.toUpperCase()}.`);
      return;
    }

    setSaving(true);
    try {
      const exercisesList = exercises.map((ex) => ({
        exercise_id: ex.exercise_id || ex.id,
        name: ex.name,
        sets_target: parseInt(ex.sets_target, 10),
        reps_target: parseInt(ex.reps_target, 10),
      }));

      if (editWorkoutId) {
        await workoutsService.updateWorkout(editWorkoutId, workoutName, '', exercisesList, selectedColor);
        showAlert('SUCCESS', 'Workout routine updated.');
        navigation.pop(2);
      } else {
        await workoutsService.createWorkout(workoutName, '', exercisesList, selectedColor);
        showAlert('SUCCESS', 'Workout routine created.');
        // Pop both CreateWorkout screens back to the library
        navigation.popToTop();
      }
    } catch (error) {
      console.error('ConfigureWorkout save error:', error);
      showAlert('ERROR', `Failed to ${editWorkoutId ? 'update' : 'create'} workout. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="REPS"
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          {/* Page header */}
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            CONFIGURE{'\n'}THE SETS
          </Text>
          <Text style={[styles.workoutNameLarge, { color: colors.text }]}>
            {workoutName}
          </Text>

          {/* Exercise cards */}
          <View style={styles.exerciseList}>
            {exercises.map((item, index) => (
              <AppTile
                key={item.exercise_id || item.id ? `ex-${item.exercise_id || item.id}-${index}` : `idx-${index}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDarkMode ? '#111' : '#F7F7F7',
                    marginBottom: 16,
                  },
                ]}
              >
                {/* Card header: name + reorder controls */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardNameBlock}>
                    <Text style={[styles.cardIndex, { color: colors.secondaryText }]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>
                        {item.name?.toUpperCase()}
                      </Text>
                      <Text style={[styles.cardMuscle, { color: colors.secondaryText }]}>
                        {item.muscle_group?.toUpperCase() || 'GENERAL'}
                      </Text>
                    </View>
                  </View>

                  {/* Up / Down arrows */}
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity
                      onPress={() => moveExercise(index, -1)}
                      disabled={index === 0}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="arrow-up-circle-outline"
                        size={26}
                        color={index === 0 ? colors.border : colors.text}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveExercise(index, 1)}
                      disabled={index === exercises.length - 1}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="arrow-down-circle-outline"
                        size={26}
                        color={index === exercises.length - 1 ? colors.border : colors.text}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sets × Reps inputs */}
                <View style={[styles.inputRow, { backgroundColor: colors.secondaryBackground }]}>
                  <View style={styles.inputBlock}>
                    <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>SETS</Text>
                    <TextInput
                      style={[styles.targetInput, { color: colors.text, borderBottomColor: colors.border }]}
                      placeholder="—"
                      placeholderTextColor={colors.border}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      value={String(item.sets_target || '')}
                      onChangeText={(val) => {
                        const clean = val.replace(/[^0-9]/g, '');
                        setExercises((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], sets_target: clean };
                          return copy;
                        });
                      }}
                    />
                  </View>

                  <Text style={[styles.times, { color: colors.secondaryText }]}>×</Text>

                  <View style={styles.inputBlock}>
                    <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>REPS</Text>
                    <TextInput
                      style={[styles.targetInput, { color: colors.text, borderBottomColor: colors.border }]}
                      placeholder="—"
                      placeholderTextColor={colors.border}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      value={String(item.reps_target || '')}
                      onChangeText={(val) => {
                        const clean = val.replace(/[^0-9]/g, '');
                        setExercises((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], reps_target: clean };
                          return copy;
                        });
                      }}
                    />
                  </View>

                  {/* Remove exercise */}
                  <TouchableOpacity
                    onPress={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 20 }}
                  >
                    <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </AppTile>
            ))}
          </View>

          {exercises.length === 0 && (
            <Text style={[styles.emptyNote, { color: colors.secondaryText }]}>
              No exercises selected. Go back and add some.
            </Text>
          )}

          <Text style={[styles.routineColorLabel, { color: colors.secondaryText, marginTop: 40, marginBottom: 16 }]}>
            ROUTINE COLOR
          </Text>
          <AppTile
            style={styles.colorPreviewBtn}
            onPress={() => setShowColorModal(true)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>ROUTINE COLOR</Text>
                <Text style={[styles.toggleSub, { color: colors.secondaryText }]}>CALENDAR INDICATOR</Text>
              </View>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: selectedColor,
                borderWidth: 2, borderColor: colors.border
              }} />
            </View>
          </AppTile>

          {/* Save CTA */}
          <AppTile
            style={[
              styles.saveBtn,
              { backgroundColor: exercises.length > 0 ? colors.accent : colors.border, borderColor: exercises.length > 0 ? colors.accent : colors.border },
            ]}
            onPress={handleSave}
            disabled={saving || exercises.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={isDarkMode ? '#000' : '#FFF'} />
            ) : (
              <Text style={[styles.saveBtnText, { color: isDarkMode ? '#000' : '#FFF' }]}>{editWorkoutId ? "SAVE CHANGES" : "CREATE WORKOUT ROUTINE"}</Text>
            )}
          </AppTile>

          <View style={{ height: 100 }} />

          <ColorPickerModal
            visible={showColorModal}
            onClose={() => setShowColorModal(false)}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 36 },

  mainTitle: {
    fontSize: 52,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -2,
    lineHeight: 48,
  },
  workoutNameLarge: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 40,
  },

  exerciseList: { gap: 16 },

  card: {
    borderWidth: 1,
    overflow: 'hidden',
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardNameBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIndex: {
    fontSize: 20,
    fontWeight: '800',
    width: 28,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  cardMuscle: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 3,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 10,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  inputBlock: {
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  targetInput: {
    width: 64,
    borderBottomWidth: 2,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    paddingVertical: 4,
    letterSpacing: -0.5,
  },
  times: {
    fontSize: 20,
    fontWeight: '300',
    marginTop: 14, // align with input baseline
  },

  emptyNote: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 40,
  },
  routineColorLabel: {
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 1.5,
  },

  saveBtn: {
    marginTop: 16,
    paddingVertical: 22,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  colorPreviewBtn: {
    padding: 20,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  toggleSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default ConfigureWorkout;
