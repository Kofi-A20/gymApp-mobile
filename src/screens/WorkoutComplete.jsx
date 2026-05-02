import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { gamificationService } from '../services/gamificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BadgeCelebration from '../components/BadgeCelebration';
import PRCelebration from '../components/PRCelebration';
import LevelUpCelebration from '../components/LevelUpCelebration';
import AppTile from '../components/AppTile';

const WorkoutComplete = ({ navigation, route }) => {
  const { setsCount = 0, totalVolume = 0, durationSeconds = 0 } = route.params || {};
  const { colors, accentColor, units } = useTheme();
  const { user } = useAuth();
  const { level, refreshGamification } = useGamification();
  const insets = useSafeAreaInsets();

  // Celebration state
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [currentBadge, setCurrentBadge] = useState(null);
  const [earnedPRs, setEarnedPRs] = useState([]);
  const [currentPR, setCurrentPR] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(null);
  const [celebrationsReady, setCelebrationsReady] = useState(false);

  const celebrationsComplete = celebrationsReady && (
    !showLevelUp &&
    earnedBadges.length === 0 &&
    currentBadge === null &&
    earnedPRs.length === 0 &&
    currentPR === null
  );

  const [loading, setLoading] = useState(true);
  const lastLevelRef = useRef(level);
  const hasCheckedBadges = useRef(false);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}M ${s}S`;
  };

  const checkCelebrations = useCallback(async () => {
    if (!user) return;
 
    setLoading(true);

    // Ensure we have latest data after the workout commit
    const updatedProfile = await refreshGamification(); // sync global state and get profile


    // 1. Level Up Check
    if (updatedProfile && updatedProfile.level !== lastLevelRef.current) {
      setNewLevel(updatedProfile.level);
      setShowLevelUp(true);
    }

    // 2. Badge Check (with retry logic as requested)
    const checkBadges = async () => {
      const delays = [0, 750];
      const lastSeen = await AsyncStorage.getItem('last_badge_seen');
      for (const delay of delays) {
        await new Promise(resolve => setTimeout(resolve, delay));
        const unseen = await gamificationService.getUnseenBadges(user.id, lastSeen);
        if (unseen && unseen.length > 0) {
          setEarnedBadges(unseen);
          // Only set current if not already showing level up
          if (level === lastLevelRef.current) {
            setCurrentBadge(unseen[0]);
          }
          return unseen;
        }
      }
      return [];
    };

    const foundBadges = await checkBadges();


    // 3. PR Check
    const pendingPRsRaw = await AsyncStorage.getItem('@reps_pending_prs');

    if (pendingPRsRaw) {
      const pendingPRs = JSON.parse(pendingPRsRaw);
      await AsyncStorage.removeItem('@reps_pending_prs');
      if (pendingPRs.length > 0) {
        setEarnedPRs(pendingPRs);
        // Start PRs if nothing else is showing
        if (level === lastLevelRef.current && foundBadges.length === 0) {
          setCurrentPR(pendingPRs[0]);
        }
      }
    }

    setLoading(false);
    setCelebrationsReady(true);
  }, [user, level]);

  useEffect(() => {
    checkCelebrations();
  }, []);

  const handleLevelUpDismiss = () => {
    setShowLevelUp(false);
    // Move to badges
    if (earnedBadges.length > 0) {
      setCurrentBadge(earnedBadges[0]);
    } else if (earnedPRs.length > 0) {
      setCurrentPR(earnedPRs[0]);
    }
  };

  const handleBadgeDismiss = async () => {
    const remaining = earnedBadges.slice(1);
    setEarnedBadges(remaining);
    if (remaining.length > 0) {
      setCurrentBadge(remaining[0]);
    } else {
      setCurrentBadge(null);
      await gamificationService.markBadgesAsSeen();
      // After badges, start PRs
      if (earnedPRs.length > 0) {
        setCurrentPR(earnedPRs[0]);
      }
    }
  };

  const handlePRDismiss = () => {
    const remaining = earnedPRs.slice(1);
    setEarnedPRs(remaining);
    if (remaining.length > 0) {
      setCurrentPR(remaining[0]);
    } else {
      setCurrentPR(null);
    }
  };

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{
        name: 'Tabs',
        params: { screen: 'Log', params: { refresh: true, resetTimestamp: Date.now() } }
      }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>WORKOUT COMPLETE</Text>
          <MaterialCommunityIcons name="check-decagram" size={28} color={accentColor} style={{ marginLeft: 8 }} />
        </View>

        <View style={styles.statsRow}>
          <AppTile style={styles.statTile}>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>SETS</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{setsCount}</Text>
          </AppTile>
          <AppTile style={styles.statTile}>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>VOLUME</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(totalVolume)} {units}</Text>
          </AppTile>
        </View>

        <AppTile style={styles.durationTile}>
          <Text style={[styles.statLabel, { color: colors.secondaryText }]}>SESSION DURATION</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(durationSeconds)}</Text>
        </AppTile>

        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            YOUR SESSION HAS BEEN COMMITTED TO REPS. KEEP UP THE MOMENTUM.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.doneBtn,
            { backgroundColor: accentColor, opacity: celebrationsComplete ? 1 : 0.4 }
          ]}
          onPress={handleDone}
          disabled={!celebrationsComplete}
        >
          <Text style={styles.doneBtnText}>DONE</Text>
        </TouchableOpacity>
      </View>

      {/* Celebrations */}
      {showLevelUp && (
        <LevelUpCelebration
          newLevel={newLevel}
          onDismiss={handleLevelUpDismiss}
        />
      )}

      {currentBadge && (
        <BadgeCelebration
          badge={currentBadge}
          visible={!!currentBadge}
          onDismiss={handleBadgeDismiss}
        />
      )}

      {currentPR && (
        <PRCelebration
          visible={!!currentPR}
          exerciseName={currentPR.name}
          weight={currentPR.weight}
          unit={units}
          onFinish={handlePRDismiss}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 40, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statTile: { flex: 1, padding: 20 },
  durationTile: { padding: 20, marginBottom: 30 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '900' },
  messageContainer: { marginTop: 20, paddingHorizontal: 10 },
  message: { fontSize: 12, fontWeight: '800', letterSpacing: 1, lineHeight: 20 },
  footer: { alignItems: 'center', paddingBottom: 100 },
  doneBtn: { height: 54, borderRadius: 27, paddingHorizontal: 48, justifyContent: 'center', alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '900', letterSpacing: 2, color: '#000' },
});

export default WorkoutComplete;
