import { supabase } from '../lib/supabase';

// Helper to generate a short random token
const generateToken = (length = 7) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const sharingService = {
  /**
   * Create a sharing record and return a deep link.
   */
  async createShareLink(workoutId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const token = generateToken();

    const { data, error } = await supabase
      .from('shared_workouts')
      .insert({
        workout_id: workoutId,
        shared_by: user.id,
        token: token,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      token: data.token,
      url: `monolith://share/${data.token}`
    };
  },

  /**
   * Fetch a workout and its exercises using a share token.
   * This is accessible without authentication.
   */
  async getSharedWorkout(token) {
    // 1. Find the share record
    const { data: share, error: shareError } = await supabase
      .from('shared_workouts')
      .select('workout_id, is_revoked')
      .eq('token', token)
      .single();
    
    if (shareError) throw new Error('Invalid or expired share link');
    if (share.is_revoked) throw new Error('This share link has been revoked');

    // 2. Fetch the workout details
    // Note: This requires a policy that allows selecting a workout IF it has a valid sharing bypass.
    // In our schema, developers usually handle this with a RPC or a specific view joined on shared_workouts.
    // For simplicity, we assume the user has configured the policy to allow viewing workouts linked via token.
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('id', share.workout_id)
      .single();
    
    if (workoutError) throw workoutError;
    return workout;
  },

  /**
   * Deep-copy a shared workout into the current user's library.
   */
  async saveSharedWorkout(token) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to save workouts');

    const sharedWorkout = await this.getSharedWorkout(token);

    // Create the copy
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: `${sharedWorkout.name} (Copy)`,
        target_muscles: sharedWorkout.target_muscles,
      })
      .select()
      .single();
    
    if (workoutError) throw workoutError;

    // Map and insert exercises
    const workoutExercises = sharedWorkout.workout_exercises.map((ex, index) => ({
      workout_id: workout.id,
      exercise_id: ex.exercise_id,
      sets_target: ex.sets_target,
      reps_target: ex.reps_target,
      order_index: index,
    }));

    const { error: exError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises);
    
    if (exError) throw exError;

    return workout;
  }
};
