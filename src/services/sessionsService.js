import { supabase } from '../lib/supabase';

export const sessionsService = {
  /**
   * Start a new workout session.
   */
  async startSession(workoutId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          workout_id: workoutId,
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
          workout_name: s.workouts?.name || 'FREE SESSION',
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

      // Sort sets by log time or set number
      if (data.session_sets) {
          data.session_sets.sort((a, b) => a.set_number - b.set_number);
      }
      
      return data;
    } catch (err) {
      console.error('getSessionDetail exception:', err);
      throw err;
    }
  }
};
