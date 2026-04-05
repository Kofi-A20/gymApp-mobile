import { supabase } from '../lib/supabase';

export const exercisesService = {
  /**
   * Fetch all global exercises.
   */
  async getGlobalExercises() {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .is('user_id', null)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch custom exercises for the current user.
   */
  async getCustomExercises() {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .not('user_id', 'is', null)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  /**
   * Search across both global and custom exercises.
   */
  async searchExercises(query) {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new custom exercise for the user.
   */
  async createCustomExercise(exerciseData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        ...exerciseData,
        user_id: user.id,
        is_custom: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
