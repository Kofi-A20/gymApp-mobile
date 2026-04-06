import { supabase } from '../lib/supabase';

export const exercisesService = {
  /**
   * Fetch all exercises (global + custom).
   */
  async getAllExercises() {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase.from('exercises').select('*').order('name');
    
    // If logged in, get global OR own custom
    if (user) {
      query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query;
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
