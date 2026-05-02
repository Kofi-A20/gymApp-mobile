import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { socialService } from '../services/socialService';
import { supabase } from '../lib/supabase';
import { MaterialCommunityIcons, Ionicons, AntDesign } from '@expo/vector-icons';
import RepsHeader from '../components/RepsHeader';
import AppTile from '../components/AppTile';

const Social = ({ navigation }) => {
  const { colors, accentColor, isDarkMode } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [friendsData, requestsData] = await Promise.all([
        socialService.getFriends(user.id),
        socialService.getPendingRequests(user.id)
      ]);
      setFriends(friendsData);
      setRequests(requestsData);

      const friendIds = friendsData.map(f => f.user_id);
      if (friendIds.length > 0) {
        const activityData = await socialService.getFriendActivity(friendIds);
        setActivity(activityData);
      } else {
        setActivity([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to new friend requests
    const channel = supabase
      .channel('friendships_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_b=eq.${user.id}`
        },
        (payload) => {
          console.log('Friendship change detected:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAccept = async (id) => {
    try {
      await socialService.acceptFriendRequest(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (id) => {
    try {
      await socialService.removeFriend(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const renderActivityItem = ({ item }) => {
    const date = new Date(item.completed_at);
    const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    const timeLabel = diff === 0 ? 'JUST NOW' : `${diff}H AGO`;

    return (
      <View style={styles.activityItem}>
        <View style={[styles.avatarDot, { backgroundColor: item.user?.avatar_color || accentColor }]} />
        <View style={styles.activityText}>
          <Text style={[styles.activityMain, { color: colors.text }]}>
            <Text style={{ fontWeight: '900' }}>{item.user?.first_name?.toUpperCase() || 'FRIEND'}</Text> LOGGED {item.workout_name?.toUpperCase()}
          </Text>
          <Text style={[styles.activityTime, { color: colors.secondaryText }]}>{timeLabel}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <RepsHeader 
        title="SOCIAL" 
        onLeftPress={() => navigation.goBack()}
        rightActions={[{ icon: 'person-add-outline', library: 'Ionicons', onPress: () => navigation.navigate('AddFriend') }]}
      />

      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        <View style={styles.content}>
          {/* Activity Feed */}
          <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>LATEST ACTIVITY</Text>
          <AppTile style={styles.activityCard}>
            {activity.length > 0 ? (
              activity.map((item, i) => (
                <View key={item.id}>
                  {renderActivityItem({ item })}
                  {i < activity.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))
            ) : (
              <Text style={{ color: colors.secondaryText, textAlign: 'center', padding: 20, fontSize: 12 }}>
                NO RECENT ACTIVITY FROM FRIENDS.
              </Text>
            )}
          </AppTile>

          {/* Pending Requests */}
          {requests.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginTop: 40 }]}>PENDING REQUESTS</Text>
              {requests.map(req => (
                <AppTile key={req.id} style={styles.requestItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.requestName, { color: colors.text }]}>
                      {req.requester?.first_name?.toUpperCase()} {req.requester?.last_name?.toUpperCase()}
                    </Text>
                    <Text style={[styles.requestUser, { color: colors.secondaryText }]}>@{req.requester?.username}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity onPress={() => handleDecline(req.id)} style={[styles.actionBtn, { backgroundColor: colors.secondaryBackground }]}>
                      <AntDesign name="close" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAccept(req.id)} style={[styles.actionBtn, { backgroundColor: accentColor }]}>
                      <AntDesign name="check" size={18} color="#000" />
                    </TouchableOpacity>
                  </View>
                </AppTile>
              ))}
            </>
          )}

          {/* Friends List */}
          <Text style={[styles.sectionLabel, { color: colors.secondaryText, marginTop: 40 }]}>FRIENDS ({friends.length})</Text>
          {loading ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />
          ) : friends.length > 0 ? (
            friends.map(friend => (
              <AppTile 
                key={friend.user_id} 
                style={styles.friendItem}
                onPress={() => navigation.navigate('FriendProfile', { userId: friend.user_id })}
                onLongPress={() => {
                  Alert.alert(
                    "REMOVE FRIEND",
                    `ARE YOU SURE YOU WANT TO REMOVE ${friend.first_name?.toUpperCase()}?`,
                    [
                      { text: "CANCEL", style: "cancel" },
                      { 
                        text: "REMOVE", 
                        style: "destructive", 
                        onPress: async () => {
                          try {
                            await socialService.removeFriend(friend.friendshipId);
                            fetchData();
                          } catch (e) {
                            Alert.alert("ERROR", "FAILED TO REMOVE FRIEND.");
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <View style={[styles.friendAvatar, { backgroundColor: friend.avatar_color || accentColor }]} />
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.friendName, { color: colors.text }]}>{friend.first_name?.toUpperCase()}</Text>
                  <Text style={[styles.friendLevel, { color: accentColor }]}>{friend.level?.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
              </AppTile>
            ))
          ) : (
            <View style={styles.emptyFriends}>
              <MaterialCommunityIcons name="account-group-outline" size={48} color={colors.secondaryText} />
              <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 10 }}>
                YOU HAVEN'T ADDED ANY FRIENDS YET.
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 30 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  activityCard: { padding: 5 },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatarDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  activityText: { flex: 1 },
  activityMain: { fontSize: 13, fontWeight: '600' },
  activityTime: { fontSize: 10, fontWeight: '800', marginTop: 4 },
  divider: { height: 1, marginHorizontal: 15 },
  requestItem: { flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 10 },
  requestName: { fontSize: 14, fontWeight: '900' },
  requestUser: { fontSize: 11, fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  friendItem: { flexDirection: 'row', alignItems: 'center', padding: 15, marginBottom: 10 },
  friendAvatar: { width: 40, height: 40, borderRadius: 20 },
  friendName: { fontSize: 16, fontWeight: '900' },
  friendLevel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  emptyFriends: { alignItems: 'center', marginTop: 40 },
});

export default Social;
