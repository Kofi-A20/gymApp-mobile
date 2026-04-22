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

const COLOR_PALETTE = [
  '#FF3B30', '#FF375F', '#FF2D55', '#FF6B35',
  '#FF9500', '#FFD60A', '#FFCC00', '#34C759',
  '#00D4AA', '#00C7BE', '#30B0C7', '#32ADE6',
  '#007AFF', '#5856D6', '#BF5AF2', '#AF52DE',
  '#A2845E', '#8E8E93',
];

const SquircleHex = ({ color, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
    {selected && (
      <View style={{ position: 'absolute', width: 66, height: 66, borderWidth: 2, borderColor: color, borderRadius: 20, transform: [{ rotate: '45deg' }] }} />
    )}
    <View style={{ width: 54, height: 54, backgroundColor: color, borderRadius: 16, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' }} />
  </TouchableOpacity>
);

// ─── Component ───────────────────────────────────────────────────────────────

const ConfigureWorkout = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useRepsAlert();
  // Exercises arrive from AddWorkout with id, name, muscle_group, etc.
  // We manage sets_target / reps_target locally.
  const [exercises, setExercises] = useState(
    (route.params?.selectedExercises || []).map((ex) => ({
      ...ex,
      sets_target: ex.sets_target || '',
      reps_target: ex.reps_target || '',
    }))
  );
  const workoutName = route.params?.workoutName || 'NEW WORKOUT';
  const [selectedColor, setSelectedColor] = useState('#FF3B30');
  const [showColorModal, setShowColorModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Reorder (same up/down logic as WorkoutDetail edit mode) ─────────────

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

      await workoutsService.createWorkout(workoutName, '', exercisesList, selectedColor);
      showAlert('SUCCESS', 'Workout routine created.');
      // Pop both CreateWorkout screens back to the library
      navigation.popToTop();
    } catch (error) {
      console.error('ConfigureWorkout save error:', error);
      showAlert('ERROR', 'Failed to create workout. Please try again.');
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
        rightActions={[{
          text: saving ? 'SAVING...' : 'SAVE',
          color: colors.accent,
          onPress: saving ? undefined : handleSave,
        }]}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>
          {/* Page header */}
          <Text style={[styles.subLabel, { color: colors.secondaryText }]}>STEP 2 OF 2</Text>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            CONFIGURE{'\n'}THE SETS
          </Text>
          <Text style={[styles.workoutNameBadge, { color: colors.secondaryText, borderColor: colors.border }]}>
            {workoutName}
          </Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Set targets for each movement and arrange the order of your routine.
          </Text>

          {/* Exercise cards */}
          <View style={styles.exerciseList}>
            {exercises.map((item, index) => (
              <View
                key={item.exercise_id || item.id ? `ex-${item.exercise_id || item.id}-${index}` : `idx-${index}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDarkMode ? '#111' : '#F7F7F7',
                    borderColor: colors.border,
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
              </View>
            ))}
          </View>

          {exercises.length === 0 && (
            <Text style={[styles.emptyNote, { color: colors.secondaryText }]}>
              No exercises selected. Go back and add some.
            </Text>
          )}

          <Text style={[styles.subLabel, { color: colors.secondaryText, marginTop: 40, marginBottom: 16 }]}>
            ROUTINE COLOR
          </Text>
          <TouchableOpacity
            style={[styles.colorPreviewBtn, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}
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
          </TouchableOpacity>

          {/* Save CTA */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: exercises.length > 0 ? colors.accent : colors.border },
            ]}
            onPress={handleSave}
            disabled={saving || exercises.length === 0}
          >
            {saving ? (
              <ActivityIndicator color={isDarkMode ? '#000' : '#FFF'} />
            ) : (
              <Text style={[styles.saveBtnText, { color: isDarkMode ? '#000' : '#FFF' }]}>CREATE WORKOUT ROUTINE</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 350 }} />

          <Modal transparent animationType="fade" visible={showColorModal} onRequestClose={() => setShowColorModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>ROUTINE COLOR</Text>
                  <TouchableOpacity onPress={() => setShowColorModal(false)}>
                    <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 14 }}>DONE</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 }}
                >
                  <View style={{ width: 280, alignItems: 'center' }}>
                    {/* Row 1: 3 */}
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: -12 }}>
                      {COLOR_PALETTE.slice(0, 3).map(c => (
                        <SquircleHex key={c} color={c} selected={selectedColor === c} onPress={() => setSelectedColor(c)} />
                      ))}
                    </View>
                    {/* Row 2: 4 */}
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: -12 }}>
                      {COLOR_PALETTE.slice(3, 7).map(c => (
                        <SquircleHex key={c} color={c} selected={selectedColor === c} onPress={() => setSelectedColor(c)} />
                      ))}
                    </View>
                    {/* Row 3: 4 */}
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: -12 }}>
                      {COLOR_PALETTE.slice(7, 11).map(c => (
                        <SquircleHex key={c} color={c} selected={selectedColor === c} onPress={() => setSelectedColor(c)} />
                      ))}
                    </View>
                    {/* Row 4: 4 */}
                    <View style={{ flexDirection: 'row', gap: 14, marginBottom: -12 }}>
                      {COLOR_PALETTE.slice(11, 15).map(c => (
                        <SquircleHex key={c} color={c} selected={selectedColor === c} onPress={() => setSelectedColor(c)} />
                      ))}
                    </View>
                    {/* Row 5: 3 */}
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      {COLOR_PALETTE.slice(15, 18).map(c => (
                        <SquircleHex key={c} color={c} selected={selectedColor === c} onPress={() => setSelectedColor(c)} />
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
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

  subLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  mainTitle: {
    fontSize: 52,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: -2,
    lineHeight: 48,
  },
  workoutNameBadge: {
    marginTop: 18,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 18,
    marginBottom: 40,
  },

  exerciseList: { gap: 16 },

  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
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

  saveBtn: {
    marginTop: 50,
    paddingVertical: 22,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  colorPreviewBtn: {
    padding: 20,
    borderWidth: 1,
    borderRadius: 4,
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
