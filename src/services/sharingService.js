import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

// Helper to generate a short random token
const generateToken = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const sharingService = {
  /**
   * Create a sharing record and return the token + deep link.
   */
  async createShareLink(workoutId) {
    console.log('[SHARING] createShareLink called for workoutId:', workoutId);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[SHARING] Auth error:', authError);
      throw authError;
    }
    if (!user) throw new Error('User not authenticated');
    console.log('[SHARING] Authenticated user:', user.id);

    const token = generateToken();
    console.log('[SHARING] Generated token:', token);

    const insertPayload = {
      workout_id: workoutId,
      shared_by: user.id,
      token: token,
    };
    console.log('[SHARING] Insert payload:', JSON.stringify(insertPayload));

    const { data, error } = await supabase
      .from('shared_workouts')
      .insert(insertPayload)
      .select();

    console.log('[SHARING] Insert result - data:', JSON.stringify(data));
    console.log('[SHARING] Insert result - error:', JSON.stringify(error));

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Insert succeeded but no data returned. Check RLS policies on shared_workouts.');
    }

    const record = data[0];
    console.log('[SHARING] Share record created:', JSON.stringify(record));

    return {
      token: record.token,
      url: Linking.createURL(`share/${record.token}`)
    };
  },

  /**
   * Fetch a workout and its exercises using a share token.
   */
  async getSharedWorkout(token) {
    console.log('[SHARING] getSharedWorkout called with token:', token);

    const { data, error } = await supabase.rpc('get_shared_workout', {
      share_token: token
    });

    console.log('[SHARING] RPC result - data:', JSON.stringify(data));
    console.log('[SHARING] RPC result - error:', JSON.stringify(error));

    if (error) {
      console.error('[SHARING] RPC error:', error.message);
      if (error.message?.includes('Invalid share code')) {
        throw new Error('No workout found for this code. Double-check the 6 characters.');
      }
      if (error.message?.includes('revoked')) {
        throw new Error('This share code has been revoked.');
      }
      throw new Error(error.message || 'Failed to fetch shared workout.');
    }
    if (!data) throw new Error('No workout found for this code.');

    console.log('[SHARING] Workout fetched via RPC:', data.name, '- exercises:', data.workout_exercises?.length);
    return data;
  },

  /**
   * Deep-copy a shared workout into the current user's library.
   */
  async saveSharedWorkout(token) {
    console.log('[SHARING] saveSharedWorkout called with token:', token);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be logged in to save workouts');

    const sharedWorkout = await this.getSharedWorkout(token);
    console.log('[SHARING] Shared workout fetched:', sharedWorkout.name);

    // Create the copy
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        name: sharedWorkout.name,
        target_muscles: sharedWorkout.target_muscles,
      })
      .select();

    console.log('[SHARING] Copy insert - data:', JSON.stringify(workout));
    console.log('[SHARING] Copy insert - error:', JSON.stringify(workoutError));

    if (workoutError) throw workoutError;
    if (!workout || workout.length === 0) throw new Error('Failed to create workout copy');

    const newWorkout = workout[0];

    // Map and insert exercises
    const workoutExercises = sharedWorkout.workout_exercises.map((ex, index) => ({
      workout_id: newWorkout.id,
      exercise_id: ex.exercise_id,
      sets_target: ex.sets_target,
      reps_target: ex.reps_target,
      order_index: index,
    }));

    console.log('[SHARING] Inserting exercises:', workoutExercises.length);

    const { error: exError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises);
    
    if (exError) throw exError;

    console.log('[SHARING] Workout copy complete:', newWorkout.id);
    return newWorkout;
  }
};
