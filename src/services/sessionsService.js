import { supabase } from '../lib/supabase';

export const sessionsService = {
  /**
   * Start a new workout session.
   */
  async startSession(workoutId = null) {
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
    
    if (error) throw error;
    return data;
  },

  /**
   * Complete a session and compute final volume stats.
   * totalVolumeKg should ideally be pre-calculated by the UI or via computed DB field,
   * but for now we take it as an argument or re-calculate it.
   */
  async completeSession(sessionId, finalStats = {}) {
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
    
    if (error) throw error;

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
  },

  /**
   * Fetch session list for the user.
   */
  async getSessions(limit = 20) {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        workouts (name)
      `)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  /**
   * Get full details of a session, including all logged sets.
   */
  async getSessionDetail(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        workouts (name),
        session_sets (
          *,
          exercises (name, muscle_group)
        )
      `)
      .eq('id', sessionId)
      .single();
    
    if (error) throw error;

    // Sort sets by log time or set number
    if (data.session_sets) {
        data.session_sets.sort((a, b) => a.set_number - b.set_number);
    }
    
    return data;
  }
};
