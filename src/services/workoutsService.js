import { supabase } from '../lib/supabase';

export const workoutsService = {
  /**
   * Fetch all workout templates for the current user.
   * Now includes nested exercises for consistent display in cards.
   */
  async getUserWorkouts(userId) {
    try {
      let activeUserId = userId;

      if (!activeUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No authenticated user found');
        activeUserId = user.id;
      }

      console.log('[workoutsService] Fetching workouts for user:', activeUserId);

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercises (*)
          )
        `)
        .eq('user_id', activeUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[workoutsService] getUserWorkouts DB error:', error);
        throw error;
      }

      console.log('[workoutsService] Successfully fetched workouts:', data?.length || 0);

      // Map to flat exercises array as expected by UI
      return (data || []).map(workout => ({
        ...workout,
        exercises: (workout.workout_exercises || [])
          .map(we => ({
            ...(we.exercises || {}),
            sets_target: we.sets_target,
            reps_target: we.reps_target,
            order_index: we.order_index
          }))
          .filter(e => e.id)
          .sort((a, b) => a.order_index - b.order_index)
      }));
    } catch (err) {
      console.error('[workoutsService] getUserWorkouts caught exception:', err);
      throw err;
    }
  },

  /**
   * Fetch a single workout with its nested exercises.
   */
  async getWorkoutDetail(workoutId) {
    try {
      console.log('Fetching detail for workoutId:', workoutId);

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

      if (error) {
        console.error('getWorkoutDetail (workouts table) error:', error);
        throw error;
      }

      console.log('getWorkoutDetail RAW RESPONSE:', JSON.stringify(data, null, 2));

      // Map to flat exercises array as expected by UI
      const mappedData = {
        ...data,
        exercises: (data.workout_exercises || [])
          .map(we => ({
            ...(we.exercises || {}),
            sets_target: we.sets_target,
            reps_target: we.reps_target,
            order_index: we.order_index
          }))
          .filter(e => e.id) // Filter out any null exercises
          .sort((a, b) => a.order_index - b.order_index)
      };

      console.log('getWorkoutDetail MAPPED RESPONSE:', JSON.stringify(mappedData, null, 2));
      return mappedData;
    } catch (err) {
      console.error('getWorkoutDetail exception:', err);
      throw err;
    }
  },

  /**
   * Create a new workout template with its exercises.
   * Matches signature used in CreateWorkout.jsx: (name, description, exercises)
   */
  async createWorkout(name, description, exercises, color = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Creating workout for user:', user.id, 'name:', name);

      // 1. Create Workout template
      const workoutToInsert = {
        name: name,
        description: description || '',
        user_id: user.id,
        color: color,
      };

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert(workoutToInsert)
        .select()
        .single();

      if (workoutError) {
        console.error('createWorkout (workouts table) error:', workoutError);
        throw workoutError;
      }

      console.log('Workout created successfully, ID:', workout.id);

      // 2. Create Workout Exercises link
      const workoutExercises = exercises.map((ex, index) => ({
        workout_id: workout.id,
        exercise_id: ex.exercise_id || ex.id,
        sets_target: ex.sets_target || 3,
        reps_target: ex.reps_target || 10,
        order_index: index,
      }));

      const { error: exError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises);

      if (exError) {
        console.error('createWorkout (workout_exercises table) error:', exError);
        // Wipe orphaned workout
        await supabase.from('workouts').delete().eq('id', workout.id);
        throw exError;
      }

      console.log('Workout exercises linked successfully');
      return workout;
    } catch (err) {
      console.error('createWorkout caught exception:', err);
      throw err;
    }
  },

  /**
   * Update an existing workout and refresh its exercise list.
   */
  async updateWorkout(workoutId, name, description, exercises) {
    try {
      console.log('Updating workout:', workoutId, 'name:', name);

      // 1. Update Workout template
      const { error: workoutError } = await supabase
        .from('workouts')
        .update({ name, description })
        .eq('id', workoutId);

      if (workoutError) {
        console.error('updateWorkout (workouts table) error:', workoutError);
        throw workoutError;
      }

      // 2. Clear and Re-insert Workout Exercises
      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteError) {
        console.error('updateWorkout delete (exercises) error:', deleteError);
        throw deleteError;
      }

      const workoutExercises = exercises.map((ex, index) => ({
        workout_id: workoutId,
        exercise_id: ex.exercise_id || ex.id,
        sets_target: ex.sets_target || 3,
        reps_target: ex.reps_target || 10,
        order_index: index,
      }));

      const { error: exError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises);

      if (exError) {
        console.error('updateWorkout insert (exercises) error:', exError);
        throw exError;
      }

      console.log('Workout updated successfully');
    } catch (err) {
      console.error('updateWorkout exception:', err);
      throw err;
    }
  },

  async updateWorkoutColor(workoutId, color) {
    const { error } = await supabase
      .from('workouts')
      .update({ color })
      .eq('id', workoutId);
    if (error) throw error;
  },

  /**
   * Delete a workout. Cascade on the DB handles workout_exercises.
   */
  async deleteWorkout(workoutId) {
    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) {
        console.error('deleteWorkout error:', error);
        throw error;
      }
    } catch (err) {
      console.error('deleteWorkout exception:', err);
      throw err;
    }
  },

  /**
   * Delete multiple workouts. Cascade on the DB handles workout_exercises.
   */
  async bulkDeleteWorkouts(workoutIds) {
    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .in('id', workoutIds);

      if (error) {
        console.error('bulkDeleteWorkouts error:', error);
        throw error;
      }
    } catch (err) {
      console.error('bulkDeleteWorkouts exception:', err);
      throw err;
    }
  }
};
