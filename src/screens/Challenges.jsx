import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { gamificationService } from '../services/gamificationService';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import { TYPOGRAPHY } from '../theme/typography';

const UNIT_OPTIONS = [
  { label: 'SESSIONS', value: 'sessions' },
  { label: 'TOTAL SETS', value: 'sets' },
  { label: 'VOLUME (KG)', value: 'kg' },
];

const Challenges = ({ navigation }) => {
  const { colors, isDarkMode, accentColor } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Create Challenge State
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('sessions');
  const [creating, setCreating] = useState(false);

  const fetchChallenges = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await gamificationService.getChallenges(user.id);
      setChallenges(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChallenges();
    }, [user])
  );

  const handleCreate = async () => {
    if (!title || !target) return;
    try {
      setCreating(true);
      const { error } = await supabase.from('user_challenges').insert({
        user_id: user.id,
        title,
        target_value: parseFloat(target),
        current_value: 0,
        unit,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
      });

      if (error) throw error;
      
      setModalVisible(false);
      setTitle('');
      setTarget('');
      fetchChallenges();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const ChallengeCard = ({ challenge }) => {
    const isCompleted = !!challenge.completed_at;
    const progress = Math.min(1, challenge.current_value / challenge.target_value);
    const progressPct = `${(progress * 100).toFixed(0)}%`;

    return (
      <AppTile style={[styles.card, isCompleted && { opacity: 0.6 }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{challenge.title.toUpperCase()}</Text>
            <Text style={[styles.cardSub, { color: colors.secondaryText }]}>
              {challenge.unit.toUpperCase()} GOAL
            </Text>
          </View>
          {isCompleted && (
            <MaterialCommunityIcons name="check-decagram" size={24} color={accentColor} />
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressVal, { color: colors.text }]}>
              {challenge.current_value.toLocaleString()} / {challenge.target_value.toLocaleString()}
            </Text>
            <Text style={[styles.progressPct, { color: accentColor }]}>{progressPct}</Text>
          </View>
        </View>
      </AppTile>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader title="CHALLENGES" onLeftPress={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.subLabel, { color: colors.secondaryText }]}>PERSONAL GROWTH</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>ACTIVE{'\n'}GOALS.</Text>
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: accentColor }]}
            onPress={() => setModalVisible(true)}
          >
            <AntDesign name="plus" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.text} style={{ marginTop: 50 }} />
        ) : challenges.length > 0 ? (
          challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)
        ) : (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.secondaryText, textAlign: 'center' }}>
              NO ACTIVE CHALLENGES. CREATE ONE TO START EARNING XP.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>NEW CHALLENGE</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <AntDesign name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>CHALLENGE TITLE</Text>
            <AppTile style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="E.G. SUMMER SHRED"
                placeholderTextColor={colors.secondaryText}
                value={title}
                onChangeText={setTitle}
              />
            </AppTile>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>TARGET VALUE</Text>
            <AppTile style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="E.G. 50"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
                value={target}
                onChangeText={setTarget}
              />
            </AppTile>

            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>UNIT</Text>
            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[
                    styles.unitChip,
                    { borderColor: colors.border },
                    unit === o.value && { backgroundColor: accentColor, borderColor: accentColor }
                  ]}
                  onPress={() => setUnit(o.value)}
                >
                  <Text style={[styles.unitChipText, { color: unit === o.value ? '#000' : colors.text }]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: accentColor }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#000" /> : <Text style={styles.createBtnText}>START CHALLENGE</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 },
  subLabel: { ...TYPOGRAPHY.eyebrow },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 },
  mainTitle: { ...TYPOGRAPHY.heroTitle },
  addBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  card: { padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  cardSub: { ...TYPOGRAPHY.micro },
  progressContainer: { marginTop: 10 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressVal: { fontSize: 12, fontWeight: '900' },
  progressPct: { fontSize: 12, fontWeight: '900' },
  emptyState: { marginTop: 100, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  inputLabel: { ...TYPOGRAPHY.fieldLabel, marginTop: 20, marginBottom: 8 },
  inputWrapper: { height: 60, justifyContent: 'center', paddingHorizontal: 15 },
  input: { fontSize: 18, fontWeight: '700' },
  unitRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 20 },
  unitChipText: { ...TYPOGRAPHY.micro },
  createBtn: { marginTop: 40, padding: 20, borderRadius: 15, alignItems: 'center' },
  createBtnText: { fontSize: 16, fontWeight: '900', letterSpacing: 1, color: '#000' },
});

export default Challenges;
