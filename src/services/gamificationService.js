import { supabase } from '../lib/supabase';
import { sessionsService } from './sessionsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const XP_VALUES = {
  session_complete: 50,
  pr_hit: 100,
  volume_milestone: 200,
  challenge_complete: 150,
  mastery_tier: 75,
  perfect_week: 250,
};

export const LEVEL_THRESHOLDS = [
  { level: 'Untrained', minXp: 0 },
  { level: 'Novice', minXp: 500 },
  { level: 'Intermediate', minXp: 2000 },
  { level: 'Advanced', minXp: 5000 },
  { level: 'Elite', minXp: 12000 },
  { level: 'Legend', minXp: 25000 },
];

export const gamificationService = {
  /**
   * pure function, returns level string from thresholds
   */
  getLevelForXP(xp) {
    // Thresholds are ordered ascending, so find the last one that is <= xp
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].minXp) {
        return LEVEL_THRESHOLDS[i].level;
      }
    }
    return 'Untrained';
  },

  /**
   * pure function, returns progress percentage to next level (0-100)
   */
  getXpProgress(xp) {
    if (xp === undefined || xp === null || xp <= 0) return 0;
    
    let currentLevelMin = 0;
    let nextLevelMin = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].minXp;
    
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_THRESHOLDS[i].minXp) {
        currentLevelMin = LEVEL_THRESHOLDS[i].minXp;
        nextLevelMin = i + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[i + 1].minXp : LEVEL_THRESHOLDS[i].minXp;
      }
    }
    
    if (currentLevelMin === nextLevelMin) return 100; // Max level
    
    const progress = ((xp - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    return Math.max(0, Math.min(100, progress));
  },

  /**
   * Calculates consistency score
   */
  async getConsistencyScore(targetUserId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { score: 0, completed: 0, planned: 0 };

      const isCurrentUser = !targetUserId || targetUserId === user.id;
      const uid = isCurrentUser ? user.id : targetUserId;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('user_id', uid)
        .gte('started_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const uniqueDays = new Set();
      (sessionsData || []).forEach(s => {
        const dateStr = new Date(s.started_at).toISOString().split('T')[0];
        uniqueDays.add(dateStr);
      });
      const completedCount = uniqueDays.size;

      let expectedIn30Days = 16; // default 4 days a week

      if (isCurrentUser) {
        try {
          const splitsStr = await AsyncStorage.getItem('@reps_splits');
          const splits = splitsStr ? JSON.parse(splitsStr) : [];
          const activeSplit = splits.find(s => s.isActive);
          if (activeSplit && activeSplit.assignments && activeSplit.assignments.length > 0) {
            expectedIn30Days = (activeSplit.assignments.length / 7) * 30;
          }
        } catch (e) {
          console.error('Failed to get local split for consistency:', e);
        }
      }

      if (expectedIn30Days === 0) return { score: 100, completed: completedCount, planned: 0 };
      let consistency = (completedCount / expectedIn30Days) * 100;
      return { 
        score: Math.min(100, Math.round(consistency)),
        completed: completedCount,
        planned: Math.round(expectedIn30Days)
      };
    } catch (e) {
      console.error('getConsistencyScore error:', e);
      return { score: 0, completed: 0, planned: 0 };
    }
  },

  async markBadgesAsSeen() {
    try {
      await AsyncStorage.setItem('last_badge_seen', new Date().toISOString());
    } catch (e) {
      console.error('Error marking badges as seen:', e);
    }
  },

  async getUnseenBadges(userId, cachedLastSeen = null) {
    try {
      const lastSeen = cachedLastSeen || await AsyncStorage.getItem('last_badge_seen');
      console.log('[SERVICE] last_badge_seen:', lastSeen);
      const query = supabase
        .from('user_badges')
        .select(`
          earned_at,
          badge:badge_definitions (
            id,
            badge_key,
            name,
            description,
            icon:icon_name
          )
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: true });

      if (lastSeen) {
        query.gt('earned_at', lastSeen);
      } else {
        // If never checked, only show badges from the last 10 minutes to avoid flood (account for background writes)
        const tenMinsAgo = new Date(Date.now() - 600000).toISOString();
        query.gt('earned_at', tenMinsAgo);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out any null badge results and return definitions
      return data
        .filter(item => item.badge)
        .map(item => item.badge);
    } catch (err) {
      console.error('getUnseenBadges error:', err);
      return [];
    }
  },

  /**
   * awards XP by inserting into ledger and updating profile
   */
  async awardXP(source, sourceId = null, context = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const xpAmount = XP_VALUES[source] || 0;
      if (xpAmount === 0) return null;

      // 1. Insert into xp_ledger
      const { error: ledgerError } = await supabase
        .from('xp_ledger')
        .insert({
          user_id: user.id,
          xp_amount: xpAmount,
          source: source,
          source_id: sourceId
        });

      if (ledgerError) throw ledgerError;

      // 2. Fetch current XP to calculate new total and level
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_gamification')
        .select('total_xp')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const newTotalXp = (currentProfile.total_xp || 0) + xpAmount;
      const newLevel = this.getLevelForXP(newTotalXp);

      // 3. Update user_gamification
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_gamification')
        .update({
          total_xp: newTotalXp,
          level: newLevel
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 4. Check and award badges based on the new state
      let newBadges = [];
      try {
        newBadges = await this.checkAndAwardBadges(user.id, context);
      } catch (badgeErr) {
        console.error('Failed to check/award badges:', badgeErr);
      }

      return { profile: updatedProfile, newBadges };
    } catch (err) {
      console.error('awardXP error:', err);
      throw err;
    }
  },

  /**
   * Checks current stats and awards any badges that haven't been earned yet.
   */
  async checkAndAwardBadges(userId, context = null) {
    try {
      // 1. Get already earned badges to avoid duplicates
      const { data: earnedBadges, error: earnedError } = await supabase
        .from('user_badges')
        .select('badge_id, badge_definitions(badge_key)')
        .eq('user_id', userId);

      if (earnedError) throw earnedError;
      const earnedKeys = (earnedBadges || []).map(b => b.badge_definitions?.badge_key);

      // 2. Fetch all badge definitions to have IDs
      const { data: allBadges, error: defsError } = await supabase
        .from('badge_definitions')
        .select('*');

      if (defsError) throw defsError;

      // 3. Gather stats needed for badge conditions
      // a. Session count
      const { count: sessionCount, error: countError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      if (countError) throw countError;

      // b. PR status (True PRs only: exercise must have been logged at least twice)
      let hasAnyPr = false;
      if (!earnedKeys.includes('first_pr')) {
         const { data: masteryData } = await supabase
           .from('exercise_mastery')
           .select('id')
           .eq('user_id', userId)
           .eq('has_pr', true)
           .gte('total_logs', 2)
           .limit(1);
         hasAnyPr = masteryData && masteryData.length > 0;
      }

      // c. Cumulative volume
      const trainingStats = await sessionsService.getTrainingStats(36500); // effectively all time
      const volume = trainingStats.cumulativeVolume || 0;

      // 4. Evaluate conditions
      const newBadges = [];
      const checkBadge = (key, condition) => {
        if (!earnedKeys.includes(key) && condition) {
          const def = allBadges.find(b => b.badge_key === key);
          if (def) newBadges.push({ user_id: userId, badge_id: def.id });
        }
      };

      checkBadge('first_session', sessionCount >= 1);
      checkBadge('sessions_10', sessionCount >= 10);
      checkBadge('sessions_100', sessionCount >= 100);
      checkBadge('first_pr', hasAnyPr);
      checkBadge('volume_10k', volume >= 10000);
      checkBadge('volume_50k', volume >= 50000);
      checkBadge('volume_100k', volume >= 100000);
      
      // Context-based badges (Phase 3)
      if (context?.tier) {
        if (context.tier === 'bronze') checkBadge('mastery_bronze', true);
        if (context.tier === 'silver') checkBadge('mastery_silver', true);
        if (context.tier === 'gold') checkBadge('mastery_gold', true);
      }
      if (context?.perfectWeek) {
        checkBadge('perfect_week', true);
      }
      if (context?.challengeComplete) {
        checkBadge('challenge_complete', true);
      }

      // 5. Insert new badges
      if (newBadges.length > 0) {
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert(newBadges);
        
        if (insertError) throw insertError;

        // Return definitions for celebration, mapping icon_name to icon
        return allBadges
          .filter(b => newBadges.some(nb => nb.badge_id === b.id))
          .map(b => ({ ...b, icon: b.icon_name }));
      }
      return [];
    } catch (err) {
      console.error('checkAndAwardBadges error:', err);
      throw err;
    }
  },

  /**
   * Updates exercise mastery and awards XP/badges if tier increases.
   */
  async updateExerciseMastery(userId, exerciseId, isPr = false) {
    try {
      // First fetch the exercise name since the mastery table uses names
      const { data: exData } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', exerciseId)
        .single();
      
      const exerciseName = exData?.name || 'Unknown';

      // 1. Get current mastery
      const { data: current, error: fetchError } = await supabase
        .from('exercise_mastery')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_name', exerciseName)
        .single();

      let mastery = current;
      if (fetchError && fetchError.code === 'PGRST116') {
        // Not found, create new
        mastery = {
          user_id: userId,
          exercise_name: exerciseName,
          total_logs: 0,
          has_pr: false,
          tier: 'unranked'
        };
      } else if (fetchError) {
        throw fetchError;
      }

      const nextLogs = (mastery.total_logs || 0) + 1;
      const nextHasPr = mastery.has_pr || isPr;

      // 2. Calculate tier
      let nextTier = 'unranked';
      if (nextLogs >= 100 && nextHasPr) nextTier = 'diamond';
      else if (nextLogs >= 50 && nextHasPr) nextTier = 'gold';
      else if (nextLogs >= 25 && nextHasPr) nextTier = 'silver';
      else if (nextLogs >= 10) nextTier = 'bronze';

      // 3. Update table
      const { error: upsertError } = await supabase
        .from('exercise_mastery')
        .upsert({
          ...mastery,
          total_logs: nextLogs,
          has_pr: nextHasPr,
          tier: nextTier,
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // 4. Award XP if tier increased
      if (nextTier !== mastery.tier && nextTier !== 'unranked') {
        await this.awardXP('mastery_tier', exerciseId, { tier: nextTier });
      }
    } catch (err) {
      console.error('updateExerciseMastery error:', err);
    }
  },

  /**
   * Calculates consistency score and awards perfect week if applicable.
   */
  async checkConsistencyAndPerfectWeek(userId) {
    try {
      const stats = await this.getConsistencyScore();
      if (stats.score === 100 && stats.planned > 0) {
        // Check if already awarded this week to avoid spam
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (startOfWeek.getDay() === 0 ? -6 : 1)); // Monday
        startOfWeek.setHours(0,0,0,0);

        const { data: alreadyAwarded } = await supabase
          .from('xp_ledger')
          .select('id')
          .eq('user_id', userId)
          .eq('source', 'perfect_week')
          .gte('created_at', startOfWeek.toISOString())
          .limit(1);

        if (!alreadyAwarded || alreadyAwarded.length === 0) {
          const result = await this.awardXP('perfect_week', null, { perfectWeek: true });
          return result.newBadges || [];
        }
      }
      return [];
    } catch (err) {
      console.error('checkConsistencyAndPerfectWeek error:', err);
      return [];
    }
  },


  /**
   * Checks volume milestones and awards if thresholds crossed.
   */
  async checkVolumeMilestones(userId) {
    try {
      let earned = [];
      const stats = await sessionsService.getTrainingStats(36500);
      const volume = stats.cumulativeVolume || 0;

      const thresholds = [
        { key: 'volume_10k', value: 10000 },
        { key: 'volume_50k', value: 50000 },
        { key: 'volume_100k', value: 100000 },
      ];

      for (const t of thresholds) {
        if (volume >= t.value) {
          // Check if already awarded XP for this milestone
          // We check by source and a deterministic context field since source_id must be a UUID
          const { data: alreadyAwarded } = await supabase
            .from('xp_ledger')
            .select('id')
            .eq('user_id', userId)
            .eq('source', 'volume_milestone')
            .filter('context->>volumeThreshold', 'eq', t.value.toString())
            .limit(1);

          if (!alreadyAwarded || alreadyAwarded.length === 0) {
            const result = await this.awardXP('volume_milestone', null, { volumeThreshold: t.value });
            if (result && result.newBadges) earned = [...earned, ...result.newBadges];
          }
        }
      }
      return earned;
    } catch (err) {
      console.error('checkVolumeMilestones error:', err);
      return [];
    }
  },

  /**
   * Updates user challenges based on session data.
   */
  async updateChallenges(userId, sessionData) {
    try {
      let earned = [];
      const { data: activeChallenges } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .is('completed_at', null);

      if (!activeChallenges || activeChallenges.length === 0) return;

      for (const challenge of activeChallenges) {
        let increment = 0;
        if (challenge.unit === 'sessions') {
          increment = 1;
        } else if (challenge.unit === 'sets') {
          // Count sets in sessionData
          increment = Object.keys(sessionData.sets).length;
        } else if (challenge.unit === 'kg') {
          // Sum volume in sessionData
          increment = Object.values(sessionData.sets).reduce((acc, s) => acc + (parseFloat(s.weight) * parseInt(s.reps)), 0);
        }

        const nextValue = (challenge.current_value || 0) + increment;
        const isCompleted = nextValue >= challenge.target_value;

        const { error } = await supabase
          .from('user_challenges')
          .update({
            current_value: nextValue,
            completed_at: isCompleted ? new Date().toISOString() : null
          })
          .eq('id', challenge.id);

        if (error) throw error;

        if (isCompleted) {
          const result = await this.awardXP('challenge_complete', challenge.id, { challengeComplete: true });
          if (result.newBadges) earned = [...earned, ...result.newBadges];
        }
      }
      return earned;
    } catch (err) {
      console.error('updateChallenges error:', err);
      return [];
    }
  },

  /**
   * Fetches challenges for a user.
   */
  async getChallenges(userId) {
    try {
      const { data, error } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('getChallenges error:', err);
      return [];
    }
  },

  /**
   * returns earned badges for a user with definitions joined
   */
  async getUserBadges(userId) {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          id,
          earned_at,
          badge_definitions (*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('getUserBadges error:', err);
      throw err;
    }
  },

  /**
   * fetches the user_gamification row for the given user
   */
  async getGamificationProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return profile;
    } catch (err) {
      console.error('getGamificationProfile error:', err);
      throw err;
    }
  },

  /**
   * Updates the user_gamification row for the current user.
   */
  async updateGamificationProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_gamification')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('updateGamificationProfile error:', err);
      throw err;
    }
  },

  /**
   * IDENTITY-DRIVEN FLEX STATS
   */

  /**
   * Finds the exercise with the highest total_logs for a user.
   */
  async getFavoriteMove(userId) {
    try {
      const { data, error } = await supabase
        .from('exercise_mastery')
        .select('exercise_name, tier, total_logs')
        .eq('user_id', userId)
        .order('total_logs', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return { label: 'FAVORITE MOVE', value: 'NONE YET' };

      const tier = (data.tier || 'UNRANKED').toUpperCase();
      return { 
        label: 'FAVORITE MOVE', 
        value: `${data.exercise_name.toUpperCase()} · ${tier}` 
      };
    } catch (err) {
      console.error('getFavoriteMove error:', err);
      return { label: 'FAVORITE MOVE', value: 'ERROR' };
    }
  },

  /**
   * Finds the most frequent muscle group in the last 30 days.
   */
  async getMuscleFocus(userId) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('session_sets')
        .select(`
          exercises (muscle_group),
          sessions!inner (user_id, completed_at)
        `)
        .eq('sessions.user_id', userId)
        .gte('sessions.completed_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      if (!data || data.length === 0) return { label: 'MUSCLE FOCUS', value: 'NONE YET' };

      const counts = {};
      data.forEach(item => {
        const mg = item.exercises?.muscle_group;
        if (mg) counts[mg] = (counts[mg] || 0) + 1;
      });

      const topMuscle = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      return { 
        label: 'MUSCLE FOCUS', 
        value: topMuscle.toUpperCase() 
      };
    } catch (err) {
      console.error('getMuscleFocus error:', err);
      return { label: 'MUSCLE FOCUS', value: 'ERROR' };
    }
  },

  /**
   * Analyzes average started_at hour from sessions.
   */
  async getTrainingVibe(userId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('user_id', userId)
        .not('started_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return { label: 'TRAINING VIBE', value: 'NONE YET' };

      const totalHours = data.reduce((acc, s) => {
        const hour = new Date(s.started_at).getHours();
        return acc + hour;
      }, 0);

      const avgHour = totalHours / data.length;
      let vibe = '';
      if (avgHour < 12) vibe = 'MORNING GRINDER';
      else if (avgHour < 17) vibe = 'AFTERNOON WARRIOR';
      else vibe = 'NIGHT OWL';

      return { 
        label: 'TRAINING VIBE', 
        value: vibe 
      };
    } catch (err) {
      console.error('getTrainingVibe error:', err);
      return { label: 'TRAINING VIBE', value: 'ERROR' };
    }
  },

  /**
   * Finds earliest completed_at in sessions.
   */
  async getIronLongevity(userId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return { label: 'IRON LONGEVITY', value: 'STARTING TODAY' };

      const date = new Date(data.completed_at);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();

      return { 
        label: 'IRON LONGEVITY', 
        value: `LIFTING SINCE ${month.toUpperCase()} ${year}` 
      };
    } catch (err) {
      console.error('getIronLongevity error:', err);
      return { label: 'IRON LONGEVITY', value: 'ERROR' };
    }
  }
};
