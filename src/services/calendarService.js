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
  async getMonthlyStats(year, month) {
    // Current month volume
    const currentStart = new Date(year, month, 1).toISOString();
    const currentEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data: currentMonthSessions, error: currentError } = await supabase
      .from('sessions')
      .select('total_volume_kg')
      .gte('completed_at', currentStart)
      .lte('completed_at', currentEnd);
    
    if (currentError) throw currentError;

    // Previous month volume
    const prevStart = new Date(year, month - 1, 1).toISOString();
    const prevEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data: prevMonthSessions, error: prevError } = await supabase
      .from('sessions')
      .select('total_volume_kg')
      .gte('completed_at', prevStart)
      .lte('completed_at', prevEnd);
    
    if (prevError) throw prevError;

    const currentTotal = currentMonthSessions.reduce((acc, s) => acc + Number(s.total_volume_kg || 0), 0);
    const prevTotal = prevMonthSessions.reduce((acc, s) => acc + Number(s.total_volume_kg || 0), 0);

    let growthPercentage = 0;
    if (prevTotal > 0) {
      growthPercentage = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
      growthPercentage = 100;
    }

    return {
      currentTotal,
      prevTotal,
      growthPercentage: Number(growthPercentage.toFixed(1)),
      sessionCount: currentMonthSessions.length
    };
  }
};
