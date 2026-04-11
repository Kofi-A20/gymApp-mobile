import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useMonolithAlert } from '../context/AlertContext';
import MonolithHeader from '../components/MonolithHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const ACTIVITY_OPTIONS = [
  { label: '1–2 days/week', value: 1.2 },
  { label: '3–4 days/week', value: 1.375 },
  { label: '5–6 days/week', value: 1.55 },
  { label: 'Daily', value: 1.725 },
];

// ─── Helper ──────────────────────────────────────────────────────────────────

const calcAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const InputField = ({ label, value, onChangeText, keyboardType, editable = true, colors }) => (
  <View style={styles.inputContainer}>
    <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label.toUpperCase()}</Text>
    <TextInput
      style={[styles.textInput, { color: editable ? colors.text : colors.secondaryText, borderColor: colors.border }]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={editable}
      returnKeyType="done"
      onSubmitEditing={() => Keyboard.dismiss()}
      blurOnSubmit={true}
    />
  </View>
);

// ─── Component ───────────────────────────────────────────────────────────────

const Profile = ({ navigation }) => {
  const { colors, isDarkMode, units } = useTheme();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { showAlert } = useMonolithAlert();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(null);           // Date object or null
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState(1.375);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Scroll references for tap-to-edit
  const scrollViewRef = useRef(null);
  const [layoutOffsets, setLayoutOffsets] = useState({});

  const handleLayout = (key) => (event) => {
    const { y } = event.nativeEvent.layout;
    setLayoutOffsets(prev => ({ ...prev, [key]: y }));
  };

  const scrollToField = (key) => {
    const yOffset = layoutOffsets[key];
    if (yOffset !== undefined) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, yOffset - 40), animated: true });
    }
  };

  // UI state for pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  // Populate from profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setDob(profile.dob ? new Date(profile.dob) : null);
      setHeight(profile.height_cm ? String(profile.height_cm) : '');
      const w = units === 'lbs' && profile.weight_kg
        ? profile.weight_kg * 2.20462
        : (profile.weight_kg || '');
      setWeight(w ? String(Math.round(w)) : '');
      const gw = units === 'lbs' && profile.goal_weight
        ? profile.goal_weight * 2.20462
        : (profile.goal_weight || '');
      setGoalWeight(gw ? String(Math.round(gw)) : '');
      setGender(profile.gender || 'male');
      setActivity(profile.activity_level || 1.375);
      setIsDirty(false);
    }
  }, [profile, units]);

  // Unsaved-changes guard
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (!isDirty) return;
        e.preventDefault();
        showAlert(
          'UNSAVED CHANGES',
          'You have unsaved changes. What would you like to do?',
          [
            {
              text: 'DISCARD',
              style: 'destructive',
              onPress: () => {
                setIsDirty(false);
                navigation.dispatch(e.data.action);
              },
            },
            {
              text: 'SAVE',
              onPress: () => {
                handleSave().then(() => navigation.dispatch(e.data.action));
              },
            },
          ]
        );
      });
      return unsubscribe;
    }, [isDirty, navigation])
  );

  // Mark dirty when user edits any field
  const markDirty = (setter) => (val) => {
    setter(val);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalWeight = units === 'lbs' ? parseFloat(weight) / 2.20462 : parseFloat(weight);
      const finalGoalWeight = units === 'lbs' ? parseFloat(goalWeight) / 2.20462 : parseFloat(goalWeight);
      const dobStr = dob ? dob.toISOString().split('T')[0] : null;

      // Save goal start weight if the goal changes
      if (profile?.goal_weight !== finalGoalWeight && finalWeight) {
        await AsyncStorage.setItem('goalStartWeight', String(finalWeight));
      }

      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        dob: dobStr,
        height_cm: parseFloat(height) || null,
        weight_kg: finalWeight || null,
        goal_weight: finalGoalWeight || null,
        gender,
        activity_level: activity,
      });
      setIsDirty(false);
      showAlert('SAVED', 'Profile updated successfully.');
    } catch (error) {
      console.error('Save profile error:', error);
      showAlert('ERROR', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Sub-Components ──────────────────────────────────────────────────────

  const BiometricTile = ({ label, value, unit, isDark: tileDark, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.bioTile,
        {
          backgroundColor: tileDark ? (isDarkMode ? '#121212' : '#000') : colors.secondaryBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.bioLabel, { color: tileDark ? '#666' : colors.secondaryText }]}>{label.toUpperCase()}</Text>
      <View style={styles.bioValueRow}>
        <Text style={[styles.bioValue, { color: tileDark ? '#FFF' : colors.text, fontSize: value && value.length > 8 ? 20 : 32 }]}>{value}</Text>
        {unit && <Text style={[styles.bioUnit, { color: tileDark ? '#666' : colors.secondaryText }]}>{unit.toUpperCase()}</Text>}
      </View>
    </TouchableOpacity>
  );


  // Generic inline-option selector (rendered inline, not modal)
  const SelectorField = ({ label, options, value, onChange }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label.toUpperCase()}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[
                styles.selectorChip,
                { borderColor: isSelected ? '#CCFF00' : colors.border },
                isSelected && { backgroundColor: '#CCFF00' },
              ]}
              onPress={() => { onChange(opt.value); setIsDirty(true); }}
            >
              <Text style={[
                styles.selectorChipText,
                { color: isSelected ? '#000' : colors.text },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const age = calcAge(dob);
  const actLabel = ACTIVITY_OPTIONS.find(o => Number(o.value) === Number(profile?.activity_level))?.label || 'NOT SET';

  if (profileLoading && !profile) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <MonolithHeader 
        title="MONOLITH" 
        leftIcon="settings-outline" 
        onLeftPress={() => navigation.navigate('Settings')} 
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.content}>

          {/* Identity Header */}
          <View style={styles.profileHero}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300' }}
                style={styles.mainAvatar}
              />
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="edit-2" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.identityText}>
              <Text style={[styles.identityLabel, { color: colors.secondaryText }]}>USER IDENTIFICATION</Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}
              </Text>
              <Text style={[styles.memberSince, { color: colors.secondaryText }]}>
                Member since {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Biometrics Summary Grid */}
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>BIOMETRICS</Text>
            <Text style={[styles.sectionSubTitle, { color: colors.secondaryText }]}>VITAL STATISTICS</Text>
          </View>

          <View style={styles.bioGrid}>
            <BiometricTile label="Height" value={profile?.height_cm || '--'} unit="cm" onPress={() => scrollToField('height')} />
            <BiometricTile
              label="Weight"
              value={profile?.weight_kg ? Math.round(profile.weight_kg * (units === 'lbs' ? 2.20462 : 1)) : '--'}
              unit={units}
              onPress={() => scrollToField('weight')}
            />
            <BiometricTile label="Age" value={age !== null ? age : '--'} unit="yrs" onPress={() => scrollToField('dob')} />
            <BiometricTile label="Activity" value={actLabel} isDark onPress={() => scrollToField('activity')} />
          </View>

          {/* Account Details */}
          <View style={[styles.sectionTitleRow, { marginTop: 60 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ACCOUNT DETAILS</Text>
            <Text style={[styles.sectionSubTitle, { color: colors.secondaryText }]}>SECURITY & CORE</Text>
          </View>

          <InputField label="First Name" value={firstName} onChangeText={markDirty(setFirstName)} colors={colors} />
          <InputField label="Last Name" value={lastName} onChangeText={markDirty(setLastName)} colors={colors} />
          <InputField label="Email Address" value={profile?.email || ''} editable={false} colors={colors} />
          <InputField label="Mobile Phone" value={phone} onChangeText={markDirty(setPhone)} keyboardType="phone-pad" colors={colors} />

          {/* Physical Metrics */}
          <View style={[styles.sectionTitleRow, { marginTop: 60 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>PHYSICAL METRICS</Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputContainer} onLayout={handleLayout('dob')}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>DATE OF BIRTH</Text>
            <TouchableOpacity
              style={[styles.textInput, { borderColor: colors.border, justifyContent: 'center' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: dob ? colors.text : colors.secondaryText, fontSize: 18, fontWeight: '700' }}>
                {dob
                  ? dob.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'SELECT DATE OF BIRTH'}
              </Text>
            </TouchableOpacity>
            {age !== null && (
              <Text style={[styles.ageDisplay, { color: colors.secondaryText }]}>
                Age: {age} years old
              </Text>
            )}
          </View>

          {/* iOS uses inline picker in modal; Android shows native dialog */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={dob || new Date(1995, 0, 1)}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) { setDob(date); setIsDirty(true); }
              }}
            />
          )}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide" visible={showDatePicker}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>DATE OF BIRTH</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={{ color: '#CCFF00', fontWeight: '900', fontSize: 14 }}>DONE</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={dob || new Date(1995, 0, 1)}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    onChange={(_, date) => {
                      if (date) { setDob(date); setIsDirty(true); }
                    }}
                    style={{ width: '100%' }}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Height */}
          <View onLayout={handleLayout('height')}>
            <InputField label="Height (cm)" value={height} onChangeText={markDirty(setHeight)} keyboardType="numeric" colors={colors} />
          </View>

          {/* Weight */}
          <View onLayout={handleLayout('weight')}>
            <InputField label={`Weight (${units})`} value={weight} onChangeText={markDirty(setWeight)} keyboardType="numeric" colors={colors} />
          </View>

          {/* Goal Weight */}
          <View onLayout={handleLayout('goal_weight')}>
            <InputField label={`Goal Weight (${units})`} value={goalWeight} onChangeText={markDirty(setGoalWeight)} keyboardType="numeric" colors={colors} />
          </View>

          {/* Gender Selector */}
          <SelectorField
            label="Gender"
            options={GENDER_OPTIONS}
            value={gender}
            onChange={(val) => { setGender(val); setIsDirty(true); }}
          />

          {/* Activity Level */}
          <View onLayout={handleLayout('activity')}>
            <SelectorField
              label="Activity Level"
              options={ACTIVITY_OPTIONS}
              value={activity}
              onChange={(val) => { setActivity(val); setIsDirty(true); }}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: isDirty ? '#CCFF00' : colors.secondaryBackground }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#000" />
              : <Text style={[styles.saveBtnText, { color: isDirty ? '#000' : colors.secondaryText }]}>SAVE CHANGES</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 30 },

  profileHero: { marginBottom: 60 },
  avatarWrapper: { width: 140, height: 140, marginBottom: 30 },
  mainAvatar: { width: '100%', height: '100%', borderRadius: 4 },
  editBtn: {
    position: 'absolute', bottom: -15, right: -15,
    width: 45, height: 45, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  identityText: { marginTop: 10 },
  identityLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  userName: { fontSize: 42, fontWeight: '900', letterSpacing: -1, marginVertical: 4 },
  memberSince: { fontSize: 14, fontWeight: '500' },

  sectionTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 30,
  },
  sectionTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  sectionSubTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  bioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bioTile: {
    width: '48.2%', aspectRatio: 0.85, padding: 20,
    justifyContent: 'center', borderWidth: 1, borderRadius: 2,
  },
  bioLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 25 },
  bioValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bioValue: { fontSize: 32, fontWeight: '900' },
  bioUnit: { fontSize: 10, fontWeight: '800' },

  inputContainer: { marginBottom: 25 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  textInput: {
    height: 60, borderWidth: 1, borderRadius: 2,
    paddingHorizontal: 15, fontSize: 18, fontWeight: '700',
  },
  ageDisplay: { fontSize: 11, fontWeight: '700', marginTop: 6, opacity: 0.7 },

  inputRow: { flexDirection: 'row' },

  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  selectorChip: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderWidth: 1, borderRadius: 2,
  },
  selectorChipText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },

  saveBtn: { marginTop: 60, padding: 24, alignItems: 'center', borderRadius: 4 },
  saveBtnText: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },

  // Modal (iOS date picker)
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalBox: { borderTopWidth: 1, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});

export default Profile;