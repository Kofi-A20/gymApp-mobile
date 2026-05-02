import { supabase } from '../lib/supabase';

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
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select(`
          id,
          workout_name,
          completed_at,
          user_id
        `)
        .in('user_id', friendIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      if (!sessionData || sessionData.length === 0) return [];
      
      const userIds = [...new Set(sessionData.map(s => s.user_id))];
      
      const { data: usersData, error: userError } = await supabase
        .from('user_gamification')
        .select('user_id, first_name, username, avatar_color')
        .in('user_id', userIds);
        
      if (userError) throw userError;
      
      const userMap = {};
      (usersData || []).forEach(u => {
        userMap[u.user_id] = u;
      });
      
      const mergedData = sessionData.map(session => ({
        ...session,
        user: userMap[session.user_id] || null
      }));

      return mergedData;
    } catch (err) {
      console.error('getFriendActivity error:', err);
      return [];
    }
  },

  async getLeaderboard(userId, period = 'all_time') {
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

      // 3. Fetch period-specific XP if needed
      let weeklyXPMap = {};
      const monday = new Date();
      monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
      monday.setHours(0, 0, 0, 0);

      if (period === 'this_week' || period === 'all_time') {
        const query = supabase
          .from('xp_ledger')
          .select('user_id, xp_amount')
          .in('user_id', ids);
        
        if (period === 'this_week') {
          query.gte('created_at', monday.toISOString());
        }

        const { data: xpData } = await query;
        
        (xpData || []).forEach(entry => {
          weeklyXPMap[entry.user_id] = (weeklyXPMap[entry.user_id] || 0) + entry.xp_amount;
        });
      }

      // 4. Fetch Flex Stats
      const [volData, prData] = await Promise.all([
        supabase.from('session_sets').select('sessions!inner(user_id), weight_kg, reps').gte('logged_at', monday.toISOString()).in('sessions.user_id', ids),
        supabase.from('xp_ledger').select('user_id').eq('source', 'pr_hit').gte('created_at', monday.toISOString()).in('user_id', ids)
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

      // 5. Assemble results
      const leaderboard = await Promise.all(profiles.map(async (p) => {
        const xpValue = (period === 'this_week' || period === 'all_time') ? (weeklyXPMap[p.user_id] || 0) : p.total_xp;
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

        return {
          ...p,
          displayXP: xpValue,
          flexValue
        };
      }));

      return leaderboard.sort((a, b) => b.displayXP - a.displayXP);
    } catch (err) {
      console.error('getLeaderboard error:', err);
      return [];
    }
  }
};
