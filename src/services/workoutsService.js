import { supabase } from '../lib/supabase';

export const workoutsService = {
  /**
   * Fetch all workout templates for the current user.
   */
  async getWorkouts() {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch a single workout with its nested exercises.
   */
  async getWorkoutDetail(workoutId) {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('id', workoutId)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new workout template with its exercises.
   */
  async createWorkout(workoutData, exercises) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Create Workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        ...workoutData,
        user_id: user.id
      })
      .select()
      .single();
    
    if (workoutError) throw workoutError;

    // 2. Create Workout Exercises
    const workoutExercises = exercises.map((ex, index) => ({
      workout_id: workout.id,
      exercise_id: ex.id,
      sets_target: ex.sets_target,
      reps_target: ex.reps_target,
      order_index: index,
    }));

    const { error: exError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises);
    
    if (exError) throw exError;

    return workout;
  },

  /**
   * Update an existing workout and refresh its exercise list.
   */
  async updateWorkout(workoutId, workoutData, exercises) {
    // 1. Update Workout Name/Metadata
    const { error: workoutError } = await supabase
      .from('workouts')
      .update(workoutData)
      .eq('id', workoutId);
    
    if (workoutError) throw workoutError;

    // 2. Clear and Re-insert Workout Exercises (Cleanest approach)
    const { error: deleteError } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', workoutId);
    
    if (deleteError) throw deleteError;

    const workoutExercises = exercises.map((ex, index) => ({
      workout_id: workoutId,
      exercise_id: ex.id,
      sets_target: ex.sets_target,
      reps_target: ex.reps_target,
      order_index: index,
    }));

    const { error: exError } = await supabase
      .from('workout_exercises')
      .insert(workoutExercises);
    
    if (exError) throw exError;
  },

  /**
   * Delete a workout. Cascade on the DB handles workout_exercises.
   */
  async deleteWorkout(workoutId) {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);
    
    if (error) throw error;
  }
};
