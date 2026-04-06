import { supabase } from '../lib/supabase';

export const calendarService = {
  /**
   * Fetch all workout check-ins for a specific month/year.
   * Month is 0-indexed (0 = Jan, 11 = Dec).
   */
  async getCheckinsByMonth(year, month) {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_checkins')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  /**
   * Fetch stats for the current month and compare with the previous month.
   */
  async getMonthStats(month, year) {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data: checkins, error } = await supabase
      .from('calendar_checkins')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;

    const completions = {};
    checkins?.forEach(c => {
      const day = new Date(c.date).getDate();
      completions[day] = (completions[day] || 0) + 1;
    });

    return {
      completions,
      monthCount: checkins?.length || 0
    };
  }
};
