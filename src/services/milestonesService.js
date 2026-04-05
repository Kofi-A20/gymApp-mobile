import { supabase } from '../lib/supabase';

export const milestonesService = {
  /**
   * Fetch all active milestones for the current user.
   */
  async getMilestones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('milestones')
      .select(`
        *,
        exercises (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  /**
   * Create a new lifting milestone.
   */
  async createMilestone(exerciseId, targetWeight) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Fetch current best weight to initialize current_weight_kg
    const { data: bestSets } = await supabase
      .from('session_sets')
      .select('weight_kg')
      .eq('exercise_id', exerciseId)
      .order('weight_kg', { ascending: false })
      .limit(1);

    const currentWeight = bestSets && bestSets.length > 0 ? bestSets[0].weight_kg : 0;

    const { data, error } = await supabase
      .from('milestones')
      .insert({
        user_id: user.id,
        exercise_id: exerciseId,
        target_weight_kg: targetWeight,
        current_weight_kg: currentWeight,
        achieved_at: currentWeight >= targetWeight ? new Date().toISOString() : null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Delete a milestone.
   */
  async deleteMilestone(milestoneId) {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId);
    
    if (error) throw error;
  }
};
