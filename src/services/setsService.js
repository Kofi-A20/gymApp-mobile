import { supabase } from '../lib/supabase';

export const setsService = {
  /**
   * Log a new set for a session.
   * Includes PR detection logic.
   */
  async logSet(sessionId, exerciseId, setNumber, weight_kg, reps) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Detect if this is a PR (highest weight for this user/exercise)
    const { data: bestSets, error: prError } = await supabase
      .from('session_sets')
      .select('weight_kg')
      .eq('exercise_id', exerciseId)
      .order('weight_kg', { ascending: false })
      .limit(1);
    
    if (prError) throw prError;

    let is_pr = false;
    if (bestSets.length === 0 || weight_kg > bestSets[0].weight_kg) {
      is_pr = true;
    }

    // 2. Insert the set
    const { data, error } = await supabase
      .from('session_sets')
      .insert({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: setNumber,
        weight_kg: weight_kg,
        reps: reps,
        is_pr: is_pr,
      })
      .select()
      .single();
    
    if (error) throw error;

    // 3. If it's a PR, update the milestone table if a goal exists
    if (is_pr) {
        try {
            await supabase
                .from('milestones')
                .update({ 
                    current_weight_kg: weight_kg
                })
                .eq('user_id', user.id)
                .eq('exercise_id', exerciseId)
                .is('achieved_at', null); // only update active goals
        } catch (err) {
            console.error('Failed to update milestone:', err);
        }
    }

    return data;
  },

  /**
   * Fetch all sets for a single session.
   */
  async getSetsForSession(sessionId) {
    const { data, error } = await supabase
      .from('session_sets')
      .select(`
        *,
        exercises (name)
      `)
      .eq('session_id', sessionId)
      .order('logged_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch previous sets for a specific exercise to help the user compare.
   */
  async getPreviousSetsForExercise(exerciseId, limit = 5) {
    const { data, error } = await supabase
      .from('session_sets')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('logged_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a logged set.
   */
  async deleteSet(setId) {
    const { error } = await supabase
      .from('session_sets')
      .delete()
      .eq('id', setId);
    
    if (error) throw error;
  },

  /**
   * Update an existing historical set's metrics
   */
  async updateSet(setId, weight_kg, reps) {
    const { data, error } = await supabase
      .from('session_sets')
      .update({
        weight_kg: weight_kg,
        reps: reps
      })
      .eq('id', setId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch PR progression for all exercises.
   * Groups by exercise to find Best All-Time and Last Logged weights.
   */
  async getUserProgression() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('session_sets')
        .select(`
          weight_kg,
          reps,
          logged_at,
          exercise_id,
          exercises (name, muscle_group, primary_muscles),
          sessions!inner (user_id)
        `)
        .eq('sessions.user_id', user.id)
        .order('logged_at', { ascending: false });

      if (error) throw error;

      const progressionMap = {};
      
      (data || []).forEach(set => {
        const exId = set.exercise_id;
        const exName = set.exercises?.name || 'UNKNOWN';
        const exMuscleGroup = set.exercises?.muscle_group || '';
        const exPrimaryMuscles = set.exercises?.primary_muscles || [];

        if (!progressionMap[exId]) {
          progressionMap[exId] = {
            id: exId,
            name: exName,
            muscle_group: exMuscleGroup,
            primary_muscles: exPrimaryMuscles,
            bestWeight: set.weight_kg,
            lastWeight: set.weight_kg,
            lastDate: set.logged_at
          };
        } else {
          // Update best if current set is higher
          if (set.weight_kg > progressionMap[exId].bestWeight) {
            progressionMap[exId].bestWeight = set.weight_kg;
          }
        }
      });

      return Object.values(progressionMap).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('getUserProgression error:', err);
      throw err;
    }
  }
};
