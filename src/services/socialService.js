import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gamificationService } from './gamificationService';

export const socialService = {
  /**
   * Sends a friend request to a user by their unique username.
   */
  async sendFriendRequest(username) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // 1. Find user by username
      const { data: targetUser, error: findError } = await supabase
        .from('user_gamification')
        .select('user_id')
        .ilike('username', username)
        .single();

      if (findError || !targetUser) throw new Error('User not found');
      if (targetUser.user_id === currentUser.id) throw new Error('Cannot add yourself');

      // 2. Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_a.eq.${currentUser.id},user_b.eq.${targetUser.user_id}),and(user_a.eq.${targetUser.user_id},user_b.eq.${currentUser.id})`)
        .limit(1);

      if (existing && existing.length > 0) throw new Error('Request already pending or accepted');

      // 3. Insert friendship
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_a: currentUser.id,
          user_b: targetUser.user_id,
          status: 'pending'
        });

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      console.error('sendFriendRequest error:', err);
      throw err;
    }
  },

  /**
   * Accepts a pending friend request.
   */
  async acceptFriendRequest(friendshipId) {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('acceptFriendRequest error:', err);
      throw err;
    }
  },

  /**
   * Removes a friend or cancels a request.
   */
  async removeFriend(friendshipId) {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('removeFriend error:', err);
      throw err;
    }
  },

  /**
   * Fetches all accepted friends with their gamification data.
   */
  async getFriends(userId) {
    try {
      // Query both directions
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          user_a_profile:user_gamification!user_a (*),
          user_b_profile:user_gamification!user_b (*)
        `)
        .eq('status', 'accepted')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (error) throw error;

      // Extract the "other" user's profile
      return data.map(f => {
        const friendProfile = f.user_a_profile.user_id === userId ? f.user_b_profile : f.user_a_profile;
        return {
          friendshipId: f.id,
          ...friendProfile
        };
      });
    } catch (err) {
      console.error('getFriends error:', err);
      return [];
    }
  },

  /**
   * Fetches all pending requests sent to the current user.
   */
  async getPendingRequests(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          requester:user_gamification!user_a (*)
        `)
        .eq('user_b', userId)
        .eq('status', 'pending');

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('getPendingRequests error:', err);
      return [];
    }
  },

  /**
   * Fetches recent activity from friends.
   */
  async getFriendActivity(friendIds) {
    if (!friendIds || friendIds.length === 0) return [];
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();

      const friendEvents = await Promise.all(friendIds.map(async (friendId) => {
        const [prRes, badgeRes, levelRes] = await Promise.all([
          supabase
            .from('session_sets')
            .select('id, user_id, weight_kg, reps, logged_at, exercises!inner(name)')
            .eq('user_id', friendId)
            .eq('is_pr', true)
            .gte('logged_at', isoDate)
            .order('logged_at', { ascending: false })
            .limit(1),
          supabase
            .from('user_badges')
            .select('id, user_id, earned_at, badge_definitions!inner(name, icon)')
            .eq('user_id', friendId)
            .gte('earned_at', isoDate)
            .order('earned_at', { ascending: false })
            .limit(1),
          supabase
            .from('xp_ledger')
            .select('id, user_id, created_at')
            .eq('user_id', friendId)
            .eq('source', 'level_up')
            .gte('created_at', isoDate)
            .order('created_at', { ascending: false })
            .limit(1)
        ]);

        const events = [];

        if (prRes.data && prRes.data.length > 0) {
          const pr = prRes.data[0];
          events.push({
            id: pr.id || `pr_${friendId}`,
            type: 'pr',
            user_id: pr.user_id,
            exerciseName: pr.exercises?.name,
            weight: pr.weight_kg,
            reps: pr.reps,
            timestamp: new Date(pr.logged_at).getTime()
          });
        }

        if (badgeRes.data && badgeRes.data.length > 0) {
          const b = badgeRes.data[0];
          events.push({
            id: b.id || `badge_${friendId}`,
            type: 'badge',
            user_id: b.user_id,
            badgeName: b.badge_definitions?.name,
            badgeIcon: b.badge_definitions?.icon,
            timestamp: new Date(b.earned_at).getTime()
          });
        }

        if (levelRes.data && levelRes.data.length > 0) {
          const l = levelRes.data[0];
          events.push({
            id: l.id || `level_${friendId}`,
            type: 'level_up',
            user_id: l.user_id,
            timestamp: new Date(l.created_at).getTime()
          });
        }

        if (events.length === 0) return null;

        events.sort((a, b) => b.timestamp - a.timestamp);
        return events[0];
      }));

      const validEvents = friendEvents.filter(e => e !== null);

      if (validEvents.length === 0) return [];

      const userIds = [...new Set(validEvents.map(e => e.user_id))];

      const { data: usersData, error: userError } = await supabase
        .from('user_gamification')
        .select('user_id, first_name, avatar_color')
        .in('user_id', userIds);

      if (userError) throw userError;

      const userMap = {};
      (usersData || []).forEach(u => {
        userMap[u.user_id] = u;
      });

      const mergedData = validEvents.map(event => ({
        ...event,
        user: userMap[event.user_id] || null
      }));

      mergedData.sort((a, b) => b.timestamp - a.timestamp);

      return mergedData;
    } catch (err) {
      console.error('getFriendActivity error:', err);
      return [];
    }
  },

  async getLeaderboard(userId, period = 'last_week') {
    try {
      // 1. Get friend IDs + current user ID
      const { data: friends } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq('status', 'accepted');

      const friendIds = new Set([userId]);
      (friends || []).forEach(f => {
        friendIds.add(f.user_a);
        friendIds.add(f.user_b);
      });

      const ids = Array.from(friendIds);

      // 2. Fetch user gamification profiles
      const { data: profiles, error: pError } = await supabase
        .from('user_gamification')
        .select('*')
        .in('user_id', ids);

      if (pError) throw pError;

      // Fetch avatars from public.users separately to avoid PostgREST relationship errors
      const { data: userData } = await supabase
        .from('users')
        .select('id, avatar_url')
        .in('id', ids);

      const avatarMap = {};
      (userData || []).forEach(u => {
        avatarMap[u.id] = u.avatar_url;
      });

      // 3. Define date range based on period
      let startDate, endDate;
      const now = new Date();

      if (period === 'last_week') {
        // This Sunday (start of current week)
        const thisSunday = new Date(now);
        thisSunday.setDate(now.getDate() - now.getDay());
        thisSunday.setHours(0, 0, 0, 0);

        // Last Sunday (start of last week)
        startDate = new Date(thisSunday);
        startDate.setDate(thisSunday.getDate() - 7);
        endDate = thisSunday;
      } else {
        // last_month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      }

      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // 4. Fetch period-specific XP
      let weeklyXPMap = {};
      const { data: xpData } = await supabase
        .from('xp_ledger')
        .select('user_id, xp_amount')
        .in('user_id', ids)
        .gte('created_at', startIso)
        .lt('created_at', endIso);

      (xpData || []).forEach(entry => {
        weeklyXPMap[entry.user_id] = (weeklyXPMap[entry.user_id] || 0) + entry.xp_amount;
      });

      // 5. Fetch Flex Stats and Session Counts using the same range
      const [volData, prData, sessionData] = await Promise.all([
        supabase
          .from('session_sets')
          .select('sessions!inner(user_id), weight_kg, reps')
          .gte('logged_at', startIso)
          .lt('logged_at', endIso)
          .in('sessions.user_id', ids),
        supabase
          .from('xp_ledger')
          .select('user_id')
          .eq('source', 'pr_hit')
          .gte('created_at', startIso)
          .lt('created_at', endIso)
          .in('user_id', ids),
        supabase
          .from('sessions')
          .select('user_id')
          .in('user_id', ids)
          .not('completed_at', 'is', null)
          .gte('completed_at', startIso)
          .lt('completed_at', endIso)
      ]);
 
      const volMap = {};
      (volData.data || []).forEach(s => {
        const uid = s.sessions.user_id;
        volMap[uid] = (volMap[uid] || 0) + (s.weight_kg * s.reps);
      });
 
      const prMap = {};
      (prData.data || []).forEach(p => {
        prMap[p.user_id] = (prMap[p.user_id] || 0) + 1;
      });
 
      const sessionMap = {};
      (sessionData.data || []).forEach(s => {
        sessionMap[s.user_id] = (sessionMap[s.user_id] || 0) + 1;
      });

      // 6. Assemble results
      const leaderboard = await Promise.all(profiles.map(async (p) => {
        const xpValue = weeklyXPMap[p.user_id] || 0;
        const avatarUrl = avatarMap[p.user_id] || p.avatar_url; // Fallback
        let flexValue = 0;
        if (p.flex_stat === 'volume') {
          flexValue = Math.round(volMap[p.user_id] || 0);
        } else if (p.flex_stat === 'pr_count') {
          flexValue = prMap[p.user_id] || 0;
        } else if (p.flex_stat === 'consistency') {
          const consistencyData = await gamificationService.getConsistencyScore(p.user_id);
          flexValue = consistencyData.score;
        }

        const expected = period === 'last_week' ? 4 : 16;
        const sessionCount = sessionMap[p.user_id] || 0;
        const prCount = prMap[p.user_id] || 0;
        const volume = volMap[p.user_id] || 0;
 
        const consistencyScore = Math.min(50, (sessionCount / expected) * 50);
        const prScore = Math.min(30, (prCount / 5) * 30);
        const volumeScore = Math.min(20, (volume / 10000) * 20);
        const compositeScore = Math.round(consistencyScore + prScore + volumeScore);
 
        return {
          ...p,
          displayXP: compositeScore,
          periodXP: xpValue,
          flexValue
        };
      }));

      const sortedLeaderboard = leaderboard.sort((a, b) => b.displayXP - a.displayXP);

      // 7. Assign ranks and compute movement
      const rankedLeaderboard = sortedLeaderboard.map((item, index) => {
        const currentRank = index + 1;
        const lastRank = item.last_week_rank;
        let rankMovement = null;

        if (lastRank !== null && lastRank !== undefined) {
          if (currentRank < lastRank) {
            rankMovement = lastRank - currentRank; // positive = moved up
          } else if (currentRank > lastRank) {
            rankMovement = lastRank - currentRank; // negative = moved down
          } else {
            rankMovement = 0;
          }
        }

        return {
          ...item,
          currentRank,
          rankMovement
        };
      });

      // 8. Persist ranks once per week (Sunday)
      this.updateLastWeekRanks(rankedLeaderboard);

      return rankedLeaderboard;
    } catch (err) {
      console.error('getLeaderboard error:', err);
      return [];
    }
  },

  async updateLastWeekRanks(rankedLeaderboard) {
    try {
      const now = new Date();
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(0, 0, 0, 0);
      const lastSundayISO = lastSunday.toISOString();
 
      const stored = await AsyncStorage.getItem('@reps_last_rank_update');
      if (stored === lastSundayISO) return;
 
      const updates = rankedLeaderboard.map(item => ({
        user_id: item.user_id,
        last_week_rank: item.currentRank
      }));
 
      const { error } = await supabase
        .from('user_gamification')
        .upsert(updates, { onConflict: 'user_id' });
 
      if (!error) {
        await AsyncStorage.setItem('@reps_last_rank_update', lastSundayISO);
      }
    } catch (err) {
      console.error('updateLastWeekRanks error:', err);
    }
  }
};
