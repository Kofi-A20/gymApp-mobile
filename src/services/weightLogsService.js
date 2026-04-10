import { supabase } from '../lib/supabase';

export const weightLogsService = {
  /**
   * Log a new body weight entry for the current week.
   */
  async logWeight(weightKg) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weight_logs')
      .insert({ user_id: user.id, weight_kg: weightKg })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all weight log entries for the current user, ordered chronologically.
   */
  async getWeightLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete a weight log entry by ID.
   */
  async deleteWeightLog(id) {
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
