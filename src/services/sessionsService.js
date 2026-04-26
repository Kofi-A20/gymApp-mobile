import { supabase } from '../lib/supabase';

export const sessionsService = {
  /**
   * Start a new workout session.
   */
  async startSession(workoutId = null, workoutName = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          workout_name: workoutName,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('startSession error:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('startSession exception:', err);
      throw err;
    }
  },

  /**
   * Complete a session and compute final volume stats.
   */
  async completeSession(sessionId, finalStats = {}) {
    try {
      const { total_volume_kg, notes } = finalStats;

      const { data, error } = await supabase
        .from('sessions')
        .update({
          completed_at: new Date().toISOString(),
          total_volume_kg: total_volume_kg || 0,
          notes: notes || '',
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('completeSession error:', error);
        throw error;
      }

      // After completing session, create a calendar check-in if valid
      if (data.workout_id) {
        try {
          const { data: workout } = await supabase.from('workouts').select('name').eq('id', data.workout_id).single();
          await supabase.from('calendar_checkins').insert({
            user_id: data.user_id,
            session_id: data.id,
            date: new Date().toISOString().split('T')[0],
            workout_name: workout?.name || 'Workout'
          });
        } catch (err) {
          console.error('Failed to create calendar check-in:', err);
        }
      }

      return data;
    } catch (err) {
      console.error('completeSession exception:', err);
      throw err;
    }
  },

  /**
   * Fetch all sessions for a specific month.
   * Month is 1-indexed (1 = Jan, 12 = Dec).
   */
  async getSessionsForMonth(year, month) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          workouts (name)
        `)
        .eq('user_id', user.id)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        workout_name: s.workout_name || s.workouts?.name || 'FREE SESSION'
      }));
    } catch (err) {
      console.error('getSessionsForMonth exception:', err);
      throw err;
    }
  },

  /**
   * Fetch session history for the current user.
   * Now includes nested exercises for consistent display in WorkoutDetail.
   */
  async getSessionHistory(limit = 20) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          workouts (name),
          session_sets (
            *,
            exercises (*)
          )
        `)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('getSessionHistory error:', error);
        throw error;
      }

      // Map to include workout_name and flattened exercises list
      return (data || []).map(s => {
        // Flatten session_sets into a unique exercises list for display
        const exerciseMap = new Map();
        (s.session_sets || []).forEach(set => {
          if (set.exercises && !exerciseMap.has(set.exercises.id)) {
            exerciseMap.set(set.exercises.id, set.exercises);
          }
        });

        return {
          ...s,
          workout_name: s.workout_name || s.workouts?.name || 'FREE SESSION',
          exercises: Array.from(exerciseMap.values())
        };
      });
    } catch (err) {
      console.error('getSessionHistory exception:', err);
      throw err;
    }
  },

  /**
   * Get full details of a session, including all logged sets.
   */
  async getSessionDetail(sessionId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          workouts (name),
          session_sets (
            *,
            exercises (*)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('getSessionDetail error:', error);
        throw error;
      }

      console.log('getSessionDetail result:', JSON.stringify(data, null, 2));

      // Sort sets by log time or set number
      if (data.session_sets) {
        data.session_sets.sort((a, b) => a.set_number - b.set_number);
      }

      return data;
    } catch (err) {
      console.error('getSessionDetail exception:', err);
      throw err;
    }
  },

  /**
   * Delete a session and completely wipe related tracking
   */
  async deleteSession(sessionId) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.error('deleteSession error:', error);
        throw error;
      }
    } catch (err) {
      console.error('deleteSession exception:', err);
      throw err;
    }
  },

  /**
   * Bulk delete sessions.
   */
  async bulkDeleteSessions(sessionIds) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .in('id', sessionIds);

      if (error) {
        console.error('bulkDeleteSessions error:', error);
        throw error;
      }
    } catch (err) {
      console.error('bulkDeleteSessions exception:', err);
      throw err;
    }
  },

  /**
   * Calculate cumulative and weekly training statistics.
   * Weekly stats now start from the current week's Monday.
   */
  async getTrainingStats(days = 30) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      const sinceDateISO = sinceDate.toISOString();

      // 1. Get all-time volume
      const { data: allSessions, error: allErr } = await supabase
        .from('sessions')
        .select('total_volume_kg')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      if (allErr) throw allErr;

      const cumulativeVolume = (allSessions || []).reduce((acc, s) => acc + (Number(s.total_volume_kg) || 0), 0);

      // 2. Get current calendar week (Starting from Sunday)
      const now = new Date();
      const day = now.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = now.getDate() - day;
      const sunday = new Date(now.setDate(diff));
      sunday.setHours(0, 0, 0, 0);
      const sundayISO = sunday.toISOString();

      const { data: weeklySessions, error: weekErr } = await supabase
        .from('sessions')
        .select('total_volume_kg, started_at, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', sinceDateISO)
        .not('completed_at', 'is', null);

      if (weekErr) throw weekErr;

      let weeklyLoad = 0;
      let totalActiveMs = 0;

      (weeklySessions || []).forEach(s => {
        weeklyLoad += (Number(s.total_volume_kg) || 0);
        if (s.started_at && s.completed_at) {
          const duration = new Date(s.completed_at) - new Date(s.started_at);
          if (duration > 0) totalActiveMs += duration;
        }
      });

      const activeHours = totalActiveMs / (1000 * 60 * 60);

      return {
        cumulativeVolume,
        weeklyLoad,
        activeHours
      };
    } catch (err) {
      console.error('getTrainingStats exception:', err);
      throw err;
    }
  },

  /**
   * Get overview stats for the Stats screen OVERVIEW tab.
   */
  async getOverviewStats(days = 30) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);
      const sinceDateISO = sinceDate.toISOString();

      const { data: sessionsData, error: sessionsErr } = await supabase
        .from('sessions')
        .select('id, total_volume_kg')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', sinceDateISO);

      if (sessionsErr) throw sessionsErr;

      const totalWorkouts = sessionsData ? sessionsData.length : 0;
      const totalVolume = (sessionsData || []).reduce((acc, s) => acc + (Number(s.total_volume_kg) || 0), 0);

      const { data: setsData, error: setsErr } = await supabase
        .from('session_sets')
        .select(`
          id,
          exercises (muscle_group, primary_muscles, secondary_muscles),
          sessions!inner (user_id, completed_at)
        `)
        .eq('sessions.user_id', user.id)
        .not('sessions.completed_at', 'is', null)
        .gte('sessions.completed_at', sinceDateISO);

      if (setsErr) throw setsErr;

      const totalSets = setsData ? setsData.length : 0;

      const muscleBreakdown = {
        Arms: 0,
        Back: 0,
        Chest: 0,
        Core: 0,
        Legs: 0,
        Shoulders: 0
      };

      const VALID_SPECIFIC_MUSCLES = [
        'Biceps', 'Triceps', 'Forearms', 'Lats', 'Trapezius',
        'Rear Deltoids', 'Lower Back', 'Chest', 'Abs', 'Obliques',
        'Quads', 'Glutes', 'Hamstrings', 'Calves', 'Front Deltoids', 'Adductors'
      ];

      const specificBreakdown = {};

      (setsData || []).forEach(set => {
        if (set.exercises && set.exercises.muscle_group) {
          const mg = set.exercises.muscle_group;
          const key = Object.keys(muscleBreakdown).find(k => k.toLowerCase() === mg.toLowerCase());
          if (key) {
            muscleBreakdown[key]++;
          }
        }

        // Build specificBreakdown from primary_muscles
        if (set.exercises && Array.isArray(set.exercises.primary_muscles)) {
          set.exercises.primary_muscles.forEach(muscle => {
            const matched = VALID_SPECIFIC_MUSCLES.find(
              v => v.toLowerCase() === muscle.toLowerCase()
            );
            if (matched) {
              specificBreakdown[matched] = (specificBreakdown[matched] || 0) + 1;
            }
          });
        }

        if (set.exercises && Array.isArray(set.exercises.secondary_muscles)) {
          set.exercises.secondary_muscles.forEach(muscle => {
            const matched = VALID_SPECIFIC_MUSCLES.find(
              v => v.toLowerCase() === muscle.toLowerCase()
            );
            if (matched) {
              specificBreakdown[matched] = (specificBreakdown[matched] || 0) + 0.5;
            }
          });
        }
      });

      return {
        totalWorkouts,
        totalSets,
        totalVolume,
        muscleBreakdown,
        specificBreakdown
      };
    } catch (err) {
      console.error('getOverviewStats exception:', err);
      throw err;
    }
  }
};
