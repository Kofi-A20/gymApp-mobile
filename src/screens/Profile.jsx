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
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import { MaterialCommunityIcons, AntDesign, Ionicons, Feather } from '@expo/vector-icons';
import { useRepsAlert } from '../context/AlertContext';
import { gamificationService, LEVEL_THRESHOLDS } from '../services/gamificationService';
import { socialService } from '../services/socialService';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import ProfileShowcase from '../components/ProfileShowcase';
import LevelUpCelebration from '../components/LevelUpCelebration';
import { weightLogsService } from '../services/weightLogsService';
import { setsService } from '../services/setsService';

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

const FLEX_STAT_OPTIONS = [
  { label: 'FAVORITE MOVE', value: 'favorite_move' },
  { label: 'MUSCLE FOCUS', value: 'muscle_focus' },
  { label: 'TRAINING VIBE', value: 'training_vibe' },
  { label: 'IRON LONGEVITY', value: 'iron_longevity' },
];

const VALID_FLEX_STATS = FLEX_STAT_OPTIONS.map(o => o.value);

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

const InputField = ({ label, value, onChangeText, keyboardType, editable = true, colors, accentColor, onPress, rightIcon }) => (
  <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
    <View style={styles.inputContainer}>
      <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label.toUpperCase()}</Text>
      <AppTile style={styles.textInputWrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.textInput, { flex: 1, color: editable ? colors.text : (onPress ? accentColor : colors.secondaryText) }]}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            editable={editable}
            pointerEvents={onPress ? 'none' : 'auto'}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={true}
          />
          {rightIcon && <MaterialCommunityIcons name={rightIcon} size={20} color={colors.secondaryText} />}
        </View>
      </AppTile>
    </View>
  </TouchableOpacity>
);

// ─── Component ───────────────────────────────────────────────────────────────

const Profile = ({ navigation }) => {
  const { user } = useAuth();
  const { xp, level, title, badges, gamification, progressPercentage, refreshGamification, updateGamification } = useGamification();
  const { colors, isDarkMode, units, toggleTheme, accentColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { showAlert } = useRepsAlert();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState(1.375);
  const [flexStat, setFlexStat] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Tabs state
  const [viewMode, setViewMode] = useState('PROFILE'); // PROFILE, RANK, SOCIAL, LEADERBOARD

  // Social state
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbPeriod, setLbPeriod] = useState('last_week');
  const [lbLoading, setLbLoading] = useState(false);

  // Weight Log Integration
  const [weightLogs, setWeightLogs] = useState([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [topPrs, setTopPrs] = useState([]);
  const [computedFlexStat, setComputedFlexStat] = useState(null);
  const [isFlexModalVisible, setIsFlexModalVisible] = useState(false);
  const hasLogs = weightLogs.length > 0;
  const latestLogWeight = hasLogs ? weightLogs[weightLogs.length - 1].weight_kg : null;

  // Level tracking
  const lastLevelRef = useRef(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    if (level) {
      if (lastLevelRef.current && level !== lastLevelRef.current) {
        // Only trigger if we have a previous level and it changed
        // We assume it's an increase in this context
        setShowLevelUp(true);
      }
      lastLevelRef.current = level;
    }
  }, [level]);

  // Populate from profile & gamification & latest logs
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setDob(profile.dob ? new Date(profile.dob) : null);
      setHeight(profile.height_cm ? String(profile.height_cm) : '');

      const weightInKg = latestLogWeight !== null ? latestLogWeight : profile.weight_kg;
      const w = units === 'lbs' && weightInKg
        ? weightInKg * 2.20462
        : (weightInKg || '');
      setWeight(w ? String(Math.round(w)) : '');

      const gw = units === 'lbs' && profile.goal_weight
        ? profile.goal_weight * 2.20462
        : (profile.goal_weight || '');
      setGoalWeight(gw ? String(Math.round(gw)) : '');
      setGender(profile.gender || 'male');
      setActivity(profile.activity_level || 1.375);
    }

    if (gamification) {
      setUsername(gamification.username || '');
      setSelectedTitle(gamification.selected_title || '');
      const currentStat = gamification.flex_stat;
      setFlexStat(VALID_FLEX_STATS.includes(currentStat) ? currentStat : null);
    }

    if (profile || gamification) {
      setIsDirty(false);
    }
  }, [profile, gamification, units, latestLogWeight]);

  useEffect(() => {
    AsyncStorage.getItem('leaderboard_period').then(p => {
      if (p === 'this_week') {
        setLbPeriod('last_week');
        AsyncStorage.setItem('leaderboard_period', 'last_week');
      } else if (p === 'all_time') {
        setLbPeriod('last_month');
        AsyncStorage.setItem('leaderboard_period', 'last_month');
      } else if (p) {
        setLbPeriod(p);
      }
    });
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
      setSocialLoading(true);
      const [friendsData, requestsData] = await Promise.all([
        socialService.getFriends(user.id),
        socialService.getPendingRequests(user.id)
      ]);
      setFriends(friendsData);
      setRequests(requestsData);

      const friendIds = friendsData.map(f => f.user_id);
      if (friendIds.length > 0) {
        const activityData = await socialService.getFriendActivity(friendIds);
        setActivityFeed(activityData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSocialLoading(false);
    }
  };

  const fetchLeaderboard = async (period) => {
    if (!user) return;
    setLbLoading(true);
    try {
      const data = await socialService.getLeaderboard(user.id, period);
      setLeaderboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLbLoading(false);
    }
  };

  const handleLbPeriodToggle = (p) => {
    setLbPeriod(p);
    AsyncStorage.setItem('leaderboard_period', p);
    fetchLeaderboard(p);
  };

  useFocusEffect(
    useCallback(() => {
      fetchWeightLogs();
      refreshGamification();
      fetchData();
      fetchRankData();
      if (viewMode === 'LEADERBOARD') fetchLeaderboard(lbPeriod);
    }, [viewMode, lbPeriod])
  );

  const fetchRankData = async () => {
    if (!user) return;
    try {
      const [score, prData, gProfile] = await Promise.all([
        gamificationService.getConsistencyScore(user.id),
        setsService.getUserProgression(user.id),
        gamificationService.getGamificationProfile(user.id)
      ]);
      setConsistencyScore(score?.score || 0);
      setTopPrs((prData || []).sort((a, b) => b.bestWeight - a.bestWeight).slice(0, 3));

      // Update the picker state to match DB
      if (gProfile?.flex_stat) setFlexStat(gProfile.flex_stat);

      // Compute flex stat based on FRESH type from DB
      const currentFlexStatType = gProfile?.flex_stat;
      if (currentFlexStatType) {
        let result = null;
        if (currentFlexStatType === 'favorite_move') result = await gamificationService.getFavoriteMove(user.id);
        else if (currentFlexStatType === 'muscle_focus') result = await gamificationService.getMuscleFocus(user.id);
        else if (currentFlexStatType === 'training_vibe') result = await gamificationService.getTrainingVibe(user.id);
        else if (currentFlexStatType === 'iron_longevity') result = await gamificationService.getIronLongevity(user.id);

        if (result) {
          setComputedFlexStat({ ...result, type: currentFlexStatType });
        } else {
          setComputedFlexStat(null);
        }
      } else {
        setComputedFlexStat(null);
      }
    } catch (e) {
      console.error('Failed to fetch rank data:', e);
    }
  };

  const handleFlexStatDone = async () => {
    if (!user) return;
    try {
      // 1. Save selection immediately to Supabase
      await gamificationService.updateGamificationProfile({ flex_stat: flexStat });

      // 2. Re-compute value for the tile
      let result = null;
      if (flexStat === 'favorite_move') result = await gamificationService.getFavoriteMove(user.id);
      else if (flexStat === 'muscle_focus') result = await gamificationService.getMuscleFocus(user.id);
      else if (flexStat === 'training_vibe') result = await gamificationService.getTrainingVibe(user.id);
      else if (flexStat === 'iron_longevity') result = await gamificationService.getIronLongevity(user.id);

      setComputedFlexStat(result ? { ...result, type: flexStat } : null);
      setIsFlexModalVisible(false);
      refreshGamification(); // Refresh context
    } catch (err) {
      console.error('Failed to save flex stat:', err);
      showAlert('ERROR', 'Failed to save flex stat.');
    }
  };

  const fetchWeightLogs = async () => {
    try {
      const logs = await weightLogsService.getWeightLogs();
      setWeightLogs(logs || []);
    } catch (e) {
      console.error('Failed to fetch weight logs in profile:', e);
    }
  };

  const markDirty = (setter) => (val) => {
    setter(val);
    setIsDirty(true);
  };

  const handleUsernameChange = (text) => {
    // lowercase only, allows letters, numbers, underscores, and dots
    const formatted = text.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(formatted);
    setIsDirty(true);
  };

  const handlePickAvatar = async () => {
    showAlert('Choose Source', 'Would you like to take a new photo or choose from your gallery?', [
      { text: 'Camera', onPress: () => captureImage() },
      { text: 'Gallery', onPress: () => pickImage() },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const captureImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('PERMISSION DENIED', 'WE NEED CAMERA ACCESS TO TAKE A PHOTO.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });
      handleImageResult(result);
    } catch (e) {
      showAlert('ERROR', 'COULD NOT CAPTURE IMAGE.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });
      handleImageResult(result);
    } catch (e) {
      showAlert('ERROR', 'COULD NOT SELECT IMAGE.');
    }
  };

  const handleImageResult = async (result) => {
    if (!result.canceled && result.assets && result.assets[0]?.base64) {
      try {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateProfile({ avatar_url: base64Img });
        showAlert('SUCCESS', 'PROFILE PICTURE UPDATED.');
      } catch (error) {
        showAlert('ERROR', `FAILED TO SAVE AVATAR: ${error.message}`);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalWeight = units === 'lbs' ? parseFloat(weight) / 2.20462 : parseFloat(weight);
      const finalGoalWeight = units === 'lbs' ? parseFloat(goalWeight) / 2.20462 : parseFloat(goalWeight);
      const dobStr = dob ? dob.toISOString().split('T')[0] : null;

      if (profile?.goal_weight !== finalGoalWeight && finalWeight) {
        await AsyncStorage.setItem('goalStartWeight', String(finalWeight));
      }

      // Split updates between public.users and public.user_gamification
      await Promise.all([
        updateProfile({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          dob: dobStr,
          height_cm: parseFloat(height) || null,
          weight_kg: finalWeight || null,
          goal_weight: finalGoalWeight || null,
          gender,
          activity_level: activity,
        }),
        updateGamification({
          username,
          selected_title: selectedTitle,
          flex_stat: flexStat,
          // Sync names to gamification table for social features
          first_name: firstName,
          last_name: lastName,
        })
      ]);
      setIsDirty(false);
      showAlert('SAVED', 'Profile updated successfully.');
      fetchRankData(); // Refresh computed flex stat
    } catch (error) {
      showAlert('ERROR', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const BiometricTile = ({ label, value, unit, isDark: tileDark, onPress }) => (
    <AppTile
      onPress={onPress}
      style={[
        styles.bioTile,
        tileDark && { backgroundColor: isDarkMode ? '#121212' : '#000' },
      ]}
    >
      <Text style={[styles.bioLabel, { color: tileDark ? '#666' : colors.secondaryText }]}>{label.toUpperCase()}</Text>
      <View style={styles.bioValueRow}>
        <Text style={[styles.bioValue, { color: tileDark ? '#FFF' : colors.text, fontSize: value && String(value).length > 8 ? 20 : 32 }]}>{value}</Text>
        {unit && <Text style={[styles.bioUnit, { color: tileDark ? '#666' : colors.secondaryText }]}>{unit.toUpperCase()}</Text>}
      </View>
    </AppTile>
  );

  const SelectorField = ({ label, options, value, onChange }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>{label.toUpperCase()}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <AppTile
              key={String(opt.value)}
              onPress={() => { onChange(opt.value); setIsDirty(true); }}
              style={[
                styles.selectorChip,
                isSelected && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
            >
              <Text style={[
                styles.selectorChipText,
                { color: isSelected ? (isDarkMode ? '#000' : '#FFF') : colors.text },
              ]}>
                {opt.label}
              </Text>
            </AppTile>
          );
        })}
      </View>
    </View>
  );

  const age = calcAge(dob);
  const actLabel = ACTIVITY_OPTIONS.find(o => Number(o.value) === Number(activity))?.label || 'NOT SET';

  const renderProfileTab = () => (
    <View>
      <View style={styles.profileHero}>
        <TouchableOpacity activeOpacity={0.8} onPress={handlePickAvatar} style={styles.avatarWrapper}>
          <View style={[styles.mainAvatar, { backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center' }]}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.mainAvatar} /> : <MaterialCommunityIcons name="account" size={40} color="#000" />}
          </View>
          <View style={[styles.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}><Feather name="camera" size={14} color={colors.text} /></View>
        </TouchableOpacity>
        <View style={styles.identityText}>
          <Text style={[styles.identityLabel, { color: colors.secondaryText }]}>USER IDENTIFICATION</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{firstName.toUpperCase()} {lastName.toUpperCase()}</Text>
          <Text style={[styles.titleLabel, { color: accentColor }]}>{selectedTitle?.toUpperCase() || 'NEW MEMBER'}</Text>
        </View>
      </View>
      <View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>BIOMETRICS</Text></View>
      <View style={styles.bioGrid}>
        <View style={styles.bioGridRow}><BiometricTile label="Height" value={height || '--'} unit="cm" /><BiometricTile label="Weight" value={weight || '--'} unit={units} /></View>
        <View style={styles.bioGridRow}><BiometricTile label="Age" value={age !== null ? age : '--'} unit="yrs" /><BiometricTile label="Activity" value={actLabel} isDark /></View>
      </View>
      <View style={[styles.sectionTitleRow, { marginTop: 60 }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>ACCOUNT DETAILS</Text></View>
      <InputField label="First Name" value={firstName} onChangeText={markDirty(setFirstName)} colors={colors} accentColor={accentColor} />
      <InputField label="Last Name" value={lastName} onChangeText={markDirty(setLastName)} colors={colors} accentColor={accentColor} />
      <InputField label="Username" value={username} onChangeText={handleUsernameChange} autoCapitalize="none" colors={colors} accentColor={accentColor} />
      <TouchableOpacity onPress={() => setTitleModalVisible(true)}><InputField label="Selected Title" value={selectedTitle?.toUpperCase() || 'NONE'} editable={false} colors={colors} accentColor={accentColor} rightIcon="chevron-down" /></TouchableOpacity>
      <InputField label="Email Address" value={profile?.email || ''} editable={false} colors={colors} accentColor={accentColor} />
      <InputField label="Mobile Phone" value={phone} onChangeText={markDirty(setPhone)} keyboardType="phone-pad" colors={colors} accentColor={accentColor} />
      <View style={[styles.sectionTitleRow, { marginTop: 60 }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>PHYSICAL METRICS</Text></View>
      <View style={styles.inputContainer}><Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>DATE OF BIRTH</Text><AppTile onPress={() => setShowDatePicker(true)} style={styles.textInputWrapper}><Text style={{ color: dob ? colors.text : colors.secondaryText, fontSize: 18, fontWeight: '700' }}>{dob ? dob.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'SELECT DATE OF BIRTH'}</Text></AppTile></View>
      <InputField label="Height (cm)" value={height} onChangeText={markDirty(setHeight)} keyboardType="numeric" colors={colors} accentColor={accentColor} />
      <InputField label={`Weight (${units})`} value={weight} onChangeText={markDirty(setWeight)} keyboardType="numeric" colors={colors} accentColor={accentColor} />
      <InputField label={`Goal Weight (${units})`} value={goalWeight} onChangeText={markDirty(setGoalWeight)} keyboardType="numeric" colors={colors} accentColor={accentColor} />
      <SelectorField label="Gender" options={GENDER_OPTIONS} value={gender} onChange={(val) => { setGender(val); setIsDirty(true); }} />
      <SelectorField label="Activity Level" options={ACTIVITY_OPTIONS} value={activity} onChange={(val) => { setActivity(val); setIsDirty(true); }} />
      <AppTile style={[styles.saveBtn, { backgroundColor: isDirty ? accentColor : colors.secondaryBackground }]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="#000" /> : <Text style={[styles.saveBtnText, { color: isDirty ? '#000' : colors.secondaryText }]}>SAVE CHANGES</Text>}</AppTile>
      <View style={{ height: 100 }} />
    </View>
  );

  const renderRankTab = () => {
    // Derive progress toward next level
    const currentXp = xp || 0;
    let currentLevelMin = 0;
    let nextLevelMin = 500; // Default first threshold

    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (currentXp >= LEVEL_THRESHOLDS[i].minXp) {
        currentLevelMin = LEVEL_THRESHOLDS[i].minXp;
        nextLevelMin = i + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[i + 1].minXp : LEVEL_THRESHOLDS[i].minXp;
      }
    }

    const xpDiff = nextLevelMin - currentLevelMin;
    const progressTowardNext = xpDiff > 0 ? ((currentXp - currentLevelMin) / xpDiff) * 100 : 100;
    const finalProgress = Math.max(0, Math.min(100, progressTowardNext));

    return (
      <View>
        <View style={styles.sectionTitleRow}><Text style={[styles.sectionTitle, { color: colors.text }]}>STATS & RANK</Text></View>

        <ProfileShowcase
          isOwnProfile={true}
          flexStat={(computedFlexStat && computedFlexStat.type === gamification?.flex_stat && VALID_FLEX_STATS.includes(gamification.flex_stat))
            ? computedFlexStat
            : (gamification?.flex_stat && VALID_FLEX_STATS.includes(gamification.flex_stat)
              ? { label: gamification.flex_stat.replace('_', ' ').toUpperCase(), value: 'COMPUTING...' }
              : null)}
          onFlexStatPress={() => setIsFlexModalVisible(true)}
          profile={{
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            avatar_color: profile?.avatar_color,
            selected_title: selectedTitle,
            level: level,
            total_xp: xp,
            consistencyScore,
            badges,
            topPrs,
            progressPercentage: finalProgress
          }}
        />

        <Modal visible={isFlexModalVisible} transparent animationType="fade" onRequestClose={() => setIsFlexModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
            <AppTile style={{ padding: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 8, textAlign: 'center' }}>YOUR FLEX STAT</Text>
              <Text style={{ fontSize: 12, color: colors.secondaryText, marginBottom: 24, textAlign: 'center', letterSpacing: 1 }}>CHOOSE HOW YOU EXPRESS YOURSELF</Text>

              <SelectorField
                label="SELECT STAT"
                options={FLEX_STAT_OPTIONS}
                value={flexStat}
                onChange={(val) => {
                  setFlexStat(val);
                  setIsDirty(true);
                }}
              />

              <TouchableOpacity
                onPress={handleFlexStatDone}
                disabled={!flexStat}
                style={{ marginTop: 30, backgroundColor: accentColor, padding: 15, borderRadius: 8, alignItems: 'center', opacity: !flexStat ? 0.5 : 1 }}
              >
                <Text style={{ color: colors.background, fontWeight: '900', letterSpacing: 1 }}>DONE</Text>
              </TouchableOpacity>
            </AppTile>
          </View>
        </Modal>

        <View style={{ height: 100 }} />
      </View>
    );
  };

  const renderSocialTab = () => (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginBottom: 15 }]}>FRIEND ACTIVITY</Text>
      <AppTile style={{ padding: 10 }}>
        {activityFeed.length > 0 ? (activityFeed.slice(0, 3).map((item, i) => {
          const firstName = item.user?.first_name?.toUpperCase() || 'FRIEND';
          let feedText = null;
          switch (item.type) {
            case 'pr':
              feedText = <Text style={[styles.feedText, { color: colors.text }]} numberOfLines={1}><Text style={{ fontWeight: '900' }}>{firstName}</Text> HIT A NEW PR — {item.exerciseName?.toUpperCase()} {item.weight}KG</Text>;
              break;
            case 'badge':
              feedText = <Text style={[styles.feedText, { color: colors.text }]} numberOfLines={1}><Text style={{ fontWeight: '900' }}>{firstName}</Text> EARNED THE {item.badgeName?.toUpperCase()} BADGE</Text>;
              break;
            case 'level_up':
              feedText = <Text style={[styles.feedText, { color: colors.text }]} numberOfLines={1}><Text style={{ fontWeight: '900' }}>{firstName}</Text> JUST LEVELED UP</Text>;
              break;
          }
          return (
            <View key={item.id || i} style={styles.feedItem}>
              <View style={[styles.feedDot, { backgroundColor: item.user?.avatar_color || accentColor }]} />
              {feedText}
            </View>
          );
        })) : (<Text style={{ color: colors.secondaryText, fontSize: 11, padding: 10 }}>NO RECENT ACTIVITY.</Text>)}
        <TouchableOpacity onPress={() => navigation.navigate('Social')}><Text style={[styles.viewAll, { color: accentColor }]}>VIEW FULL FEED</Text></TouchableOpacity>
      </AppTile>
      <View style={[styles.sectionTitleRow, { marginTop: 30 }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>FRIENDS</Text><TouchableOpacity onPress={() => navigation.navigate('AddFriend')}><AntDesign name="plus" size={20} color={accentColor} /></TouchableOpacity></View>
      {requests.length > 0 && (<TouchableOpacity onPress={() => navigation.navigate('Social')} style={styles.pendingBanner}><Text style={styles.pendingText}>{requests.length} PENDING REQUESTS</Text><Ionicons name="chevron-forward" size={14} color="#000" /></TouchableOpacity>)}
      {friends.slice(0, 5).map(f => (<AppTile key={f.user_id} style={styles.miniFriend} onPress={() => navigation.navigate('FriendProfile', { userId: f.user_id })}><View style={[styles.miniAvatar, { backgroundColor: f.avatar_color || accentColor }]} /><Text style={[styles.miniName, { color: colors.text }]}>{f.first_name?.toUpperCase()}</Text><Text style={[styles.miniLevel, { color: colors.secondaryText }]}>{f.level?.toUpperCase()}</Text></AppTile>))}
      <TouchableOpacity onPress={() => navigation.navigate('Social')} style={styles.socialLink}><Text style={[styles.socialLinkText, { color: colors.secondaryText }]}>VIEW ALL FRIENDS</Text></TouchableOpacity>
      <View style={{ height: 100 }} />
    </View>
  );

  const renderLeaderboardTab = () => (
    <View style={{ paddingBottom: 100 }}>
      <View style={styles.lbHeader}>
        <View>
          <Text style={[styles.lbSub, { color: colors.secondaryText }]}>GLOBAL RANKINGS</Text>
          <Text style={[styles.lbTitle, { color: colors.text }]}>LEADERBOARD.</Text>
        </View>
        <View style={[styles.lbToggle, { backgroundColor: colors.secondaryBackground, marginTop: 15, alignSelf: 'flex-start' }]}>
          <TouchableOpacity style={[styles.lbToggleBtn, lbPeriod === 'last_week' && { backgroundColor: accentColor }]} onPress={() => handleLbPeriodToggle('last_week')}><Text style={[styles.lbToggleText, { color: lbPeriod === 'last_week' ? '#000' : colors.secondaryText }]}>LAST WEEK</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.lbToggleBtn, lbPeriod === 'last_month' && { backgroundColor: accentColor }]} onPress={() => handleLbPeriodToggle('last_month')}><Text style={[styles.lbToggleText, { color: lbPeriod === 'last_month' ? '#000' : colors.secondaryText }]}>LAST MONTH</Text></TouchableOpacity>
        </View>
      </View>
      {lbLoading && leaderboard.length === 0 ? (<ActivityIndicator color={accentColor} style={{ marginTop: 40 }} />) : (
        leaderboard.map((item, index) => {
          const isMe = item.user_id === user?.id;
          return (
            <AppTile
              key={item.user_id}
              style={[styles.lbRow, isMe && { borderColor: accentColor, borderWidth: 1 }]}
              onPress={isMe ? null : () => navigation.navigate('FriendProfile', { userId: item.user_id })}
            >
              <View style={styles.lbRank}>
                <Text style={[styles.lbRankText, { color: colors.secondaryText }]}>#{index + 1}</Text>
                {item.rankMovement > 0 && (
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#4CAF50', marginTop: 2 }}>▲{item.rankMovement}</Text>
                )}
                {item.rankMovement < 0 && (
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF5252', marginTop: 2 }}>▼{Math.abs(item.rankMovement)}</Text>
                )}
                {item.rankMovement === 0 && (
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.secondaryText, marginTop: 2 }}>—</Text>
                )}
              </View>
              <View style={[styles.lbAvatar, { backgroundColor: item.avatar_color || accentColor, overflow: 'hidden' }]}>
                {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} style={{ width: '100%', height: '100%' }} />}
              </View>
              <View style={styles.lbInfo}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[styles.lbName, { color: colors.text }]} numberOfLines={1}>{item.first_name?.toUpperCase()}</Text><View style={[styles.lbLevelBadge, { backgroundColor: colors.border }]}><Text style={[styles.lbLevelText, { color: colors.text }]}>{item.level?.toUpperCase()}</Text></View></View><Text style={[styles.lbXP, { color: accentColor }]}>{item.displayXP}/100 SCORE</Text></View>
              <View style={styles.lbFlex}><Text style={[styles.lbFlexVal, { color: colors.text }]}>{item.flex_stat === 'volume' ? `${(item.flexValue / 1000).toFixed(1)}k` : item.flexValue}</Text><Text style={[styles.lbFlexLabel, { color: colors.secondaryText }]}>{item.flex_stat?.replace('_', ' ')?.toUpperCase() || 'VOLUME'}</Text></View>
            </AppTile>
          );
        })
      )}
    </View>
  );

  if (profileLoading && !profile) {
    return (<View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={colors.text} /></View>);
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader
        title="REPS"
        rightActions={[{ icon: 'settings-outline', library: 'Ionicons', onPress: () => navigation.navigate('Settings') }]}
      />
      {showLevelUp && (
        <LevelUpCelebration
          newLevel={level}
          onDismiss={() => setShowLevelUp(false)}
        />
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.viewToggle}
          contentContainerStyle={{ paddingRight: 24 }}
        >
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'PROFILE' && { borderBottomColor: accentColor }]} onPress={() => setViewMode('PROFILE')}><Text style={[styles.toggleBtnText, { color: viewMode === 'PROFILE' ? colors.text : colors.secondaryText }]}>PROFILE</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'RANK' && { borderBottomColor: accentColor }]} onPress={() => setViewMode('RANK')}><Text style={[styles.toggleBtnText, { color: viewMode === 'RANK' ? colors.text : colors.secondaryText }]}>RANK</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'SOCIAL' && { borderBottomColor: accentColor }]} onPress={() => setViewMode('SOCIAL')}><Text style={[styles.toggleBtnText, { color: viewMode === 'SOCIAL' ? colors.text : colors.secondaryText }]}>SOCIAL</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'LEADERBOARD' && { borderBottomColor: accentColor }]} onPress={() => setViewMode('LEADERBOARD')}><Text style={[styles.toggleBtnText, { color: viewMode === 'LEADERBOARD' ? colors.text : colors.secondaryText }]}>LEADERBOARD</Text></TouchableOpacity>
        </ScrollView>
        <View style={{ marginTop: 30 }}>
          {viewMode === 'PROFILE' ? renderProfileTab() : viewMode === 'RANK' ? renderRankTab() : viewMode === 'SOCIAL' ? renderSocialTab() : renderLeaderboardTab()}
        </View>
      </ScrollView>
      <Modal visible={titleModalVisible} animationType="slide" transparent><View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}><View style={[styles.modalContent, { backgroundColor: colors.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>EARNED TITLES</Text><TouchableOpacity onPress={() => setTitleModalVisible(false)}><MaterialCommunityIcons name="close" size={24} color={colors.text} /></TouchableOpacity></View><ScrollView>{badges.filter(b => b.badge_definitions.grants_title).map(b => (<TouchableOpacity key={b.id} style={[styles.titleOption, { borderBottomColor: colors.border }, selectedTitle === b.badge_definitions.grants_title && { backgroundColor: colors.secondaryBackground }]} onPress={() => { setSelectedTitle(b.badge_definitions.grants_title); setTitleModalVisible(false); setIsDirty(true); }}><Text style={[styles.titleOptionText, { color: colors.text }]}>{b.badge_definitions.grants_title.toUpperCase()}</Text><Text style={[styles.titleOptionSub, { color: colors.secondaryText }]}>EARNED FROM: {b.badge_definitions.name.toUpperCase()}</Text></TouchableOpacity>))}</ScrollView></View></View></Modal>
      {showDatePicker && (<DateTimePicker value={dob || new Date(1995, 0, 1)} mode="date" maximumDate={new Date()} onChange={(_, date) => { setShowDatePicker(false); if (date) { setDob(date); setIsDirty(true); } }} />)}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 30 },
  viewToggle: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)', maxHeight: 50 },
  toggleBtn: { paddingVertical: 12, marginRight: 25, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  toggleBtnText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  profileHero: { marginBottom: 60 },
  avatarWrapper: { width: 100, height: 100, marginBottom: 30 },
  mainAvatar: { width: '100%', height: '100%', borderRadius: 50 },
  editBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  identityText: { marginTop: 10 },
  identityLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  userName: { fontSize: 24, fontWeight: '900', letterSpacing: 0, marginVertical: 4 },
  titleLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 30 },
  sectionTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  bioGrid: { gap: 12 },
  bioGridRow: { flexDirection: 'row', gap: 12 },
  bioTile: { flex: 1, aspectRatio: 1, padding: 20, justifyContent: 'center' },
  bioLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 25 },
  bioValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  bioValue: { fontSize: 32, fontWeight: '900' },
  bioUnit: { fontSize: 10, fontWeight: '800' },
  inputContainer: { marginBottom: 25 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  fieldHint: { fontSize: 10, fontWeight: '600', marginTop: 8, opacity: 0.8 },
  textInputWrapper: { height: 60, justifyContent: 'center', paddingHorizontal: 15 },
  textInput: { fontSize: 18, fontWeight: '700' },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selectorChip: { paddingHorizontal: 10, paddingVertical: 6 },
  selectorChipText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  saveBtn: { marginTop: 60, padding: 24, alignItems: 'center' },
  saveBtnText: { fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { borderTopWidth: 1, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
  modalTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 60 },
  rankCard: { padding: 20, marginTop: 10 },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  levelText: { fontSize: 10, fontWeight: '900', color: '#000' },
  xpText: { fontSize: 14, fontWeight: '900' },
  xpBarContainer: { marginBottom: 20 },
  xpBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  badgeShowcase: { flexDirection: 'row', gap: 8 },
  miniBadge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  moreBadges: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  moreBadgesText: { fontSize: 10, fontWeight: '800' },
  challengesTile: { padding: 20, borderWidth: 1 },
  challengesContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengesText: { gap: 4 },
  challengesLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  challengesTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  feedItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  feedText: { fontSize: 11, fontWeight: '600', flex: 1 },
  viewAll: { fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 10, letterSpacing: 1 },
  miniFriend: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  miniAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 12 },
  miniName: { fontSize: 13, fontWeight: '900', flex: 1 },
  miniLevel: { fontSize: 9, fontWeight: '800' },
  socialLink: { alignItems: 'center', marginTop: 15 },
  socialLinkText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pendingBanner: { backgroundColor: '#B8FF01', padding: 10, borderRadius: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  pendingText: { fontSize: 10, fontWeight: '900', color: '#000' },
  titleOption: { padding: 20, borderBottomWidth: 1 },
  titleOptionText: { fontSize: 16, fontWeight: '900' },
  titleOptionSub: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  lbHeader: { marginBottom: 30, marginTop: 10 },
  lbSub: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  lbTitle: { fontSize: 42, fontWeight: '900', letterSpacing: -2, lineHeight: 46 },
  lbToggle: { flexDirection: 'row', padding: 4, borderRadius: 20 },
  lbToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  lbToggleText: { fontSize: 9, fontWeight: '900' },
  lbRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  lbRank: { width: 30, alignItems: 'center' },
  lbRankText: { fontSize: 12, fontWeight: '900' },
  lbAvatar: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 10 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: 14, fontWeight: '900', maxWidth: 120 },
  lbLevelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lbLevelText: { fontSize: 8, fontWeight: '900' },
  lbXP: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  lbFlex: { alignItems: 'flex-end' },
  lbFlexVal: { fontSize: 16, fontWeight: '900' },
  lbFlexLabel: { fontSize: 8, fontWeight: '800', opacity: 0.7 },
});

export default Profile;