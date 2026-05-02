import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { gamificationService } from '../services/gamificationService';
import { setsService } from '../services/setsService';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';
import ProfileShowcase from '../components/ProfileShowcase';
import { socialService } from '../services/socialService';
import { useAuth } from '../context/AuthContext';
import { Alert, TouchableOpacity } from 'react-native';

const FriendProfile = ({ route, navigation }) => {
  const { userId } = route.params;
  const { colors, accentColor } = useTheme();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [topPrs, setTopPrs] = useState([]);
  const [consistency, setConsistency] = useState(0);
  const [friendshipId, setFriendshipId] = useState(null);
  const [computedFlexStat, setComputedFlexStat] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, badgesData, prData, consistencyScore, friends] = await Promise.all([
          gamificationService.getGamificationProfile(userId),
          gamificationService.getUserBadges(userId),
          setsService.getUserProgression(userId),
          gamificationService.getConsistencyScore(userId),
          socialService.getFriends(user.id)
        ]);
        setProfile(profileData);
        setBadges(badgesData);
        setTopPrs((prData || []).sort((a, b) => b.bestWeight - a.bestWeight).slice(0, 3));
        setConsistency(consistencyScore);
        
        
        const f = friends.find(f => f.user_id === userId);
        if (f) setFriendshipId(f.friendshipId);

        // Compute flex stat
        const currentFlexStatType = profileData?.flex_stat;
        if (currentFlexStatType) {
          let flexResult = null;
          if (currentFlexStatType === 'favorite_move') flexResult = await gamificationService.getFavoriteMove(userId);
          else if (currentFlexStatType === 'muscle_focus') flexResult = await gamificationService.getMuscleFocus(userId);
          else if (currentFlexStatType === 'training_vibe') flexResult = await gamificationService.getTrainingVibe(userId);
          else if (currentFlexStatType === 'iron_longevity') flexResult = await gamificationService.getIronLongevity(userId);
          setComputedFlexStat(flexResult);
        } else {
          setComputedFlexStat(null);
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, user.id]);

  const handleRemoveFriend = () => {
    if (!friendshipId) return;

    Alert.alert(
      "REMOVE FRIEND",
      `ARE YOU SURE YOU WANT TO REMOVE ${profile?.first_name?.toUpperCase()} FROM YOUR FRIENDS?`,
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "REMOVE", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await socialService.removeFriend(friendshipId);
              navigation.goBack();
            } catch (e) {
              Alert.alert("ERROR", "FAILED TO REMOVE FRIEND.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader title="USER PROFILE" onLeftPress={() => navigation.goBack()} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <ProfileShowcase 
          isOwnProfile={false}
          flexStat={computedFlexStat}
          profile={{
            ...profile,
            badges,
            topPrs,
            consistencyScore: consistency?.score || 0
          }} 
        />

        {/* Remove Friend Action */}
        {friendshipId && (
          <TouchableOpacity 
            style={[styles.removeBtn, { borderColor: colors.border }]}
            onPress={handleRemoveFriend}
          >
            <Ionicons name="person-remove-outline" size={20} color="#FF3B30" />
            <Text style={styles.removeBtnText}>REMOVE FRIEND</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 100 },
  hero: { alignItems: 'center', marginBottom: 40 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  name: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  title: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginTop: 15 },
  levelText: { fontSize: 10, fontWeight: '900', color: '#000' },
  statsGrid: { flexDirection: 'row', gap: 15 },
  statBox: { flex: 1, padding: 20, alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '900' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  prItem: { flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 10 },
  prName: { fontSize: 14, fontWeight: '900' },
  prWeight: { fontSize: 16, fontWeight: '900' },
  badgeScroll: { flexDirection: 'row' },
  badgeItem: { alignItems: 'center', marginRight: 20, width: 80 },
  badgeIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  badgeName: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
  removeBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 60, 
    padding: 20, 
    borderWidth: 1, 
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 10
  },
  removeBtnText: { 
    color: '#FF3B30', 
    fontSize: 12, 
    fontWeight: '900', 
    letterSpacing: 1 
  }
});

export default FriendProfile;
