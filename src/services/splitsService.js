import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const SPLITS_STORAGE_KEY = '@reps_splits';
const PLANNED_STORAGE_KEY = '@reps_plannedSessions';

export const splitsService = {
  async getAllSplits() {
    try {
      const stored = await AsyncStorage.getItem(SPLITS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to load splits:', e);
      return [];
    }
  },

  async saveSplit(split) {
    try {
      const splits = await this.getAllSplits();
      const existingIndex = splits.findIndex(s => s.id === split.id);
      let newSplits = [...splits];
      
      if (existingIndex >= 0) {
        newSplits[existingIndex] = split;
      } else {
        newSplits.push(split);
      }
      
      await AsyncStorage.setItem(SPLITS_STORAGE_KEY, JSON.stringify(newSplits));
      
      if (split.isActive) {
        await this.regenerateSessionsForSplit(split);
      } else {
        await this.clearFutureSessions(split.id);
      }
      
      return split;
    } catch (e) {
      console.error('Failed to save split:', e);
      throw e;
    }
  },

  async deleteSplit(splitId) {
    try {
      const splits = await this.getAllSplits();
      const newSplits = splits.filter(s => s.id !== splitId);
      await AsyncStorage.setItem(SPLITS_STORAGE_KEY, JSON.stringify(newSplits));
      await this.clearFutureSessions(splitId);
    } catch (e) {
      console.error('Failed to delete split:', e);
      throw e;
    }
  },

  async toggleSplitActive(splitId, isActive) {
    try {
      const splits = await this.getAllSplits();
      const splitIndex = splits.findIndex(s => s.id === splitId);
      if (splitIndex >= 0) {
        splits[splitIndex].isActive = isActive;
        await AsyncStorage.setItem(SPLITS_STORAGE_KEY, JSON.stringify(splits));
        
        if (isActive) {
          await this.regenerateSessionsForSplit(splits[splitIndex]);
        } else {
          await this.clearFutureSessions(splitId);
        }
      }
    } catch (e) {
      console.error('Failed to toggle split:', e);
      throw e;
    }
  },

  async regenerateSessionsForSplit(split) {
    await this.clearFutureSessions(split.id);
    
    // Generate for next 8 weeks (56 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newSessions = [];
    
    for (let i = 0; i < 56; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dayOfWeek = currentDate.getDay(); // 0-6
      
      // Find assignments for this day
      const dayAssignments = split.assignments.filter(a => a.dayOfWeek === dayOfWeek);
      
      for (const assignment of dayAssignments) {
        // Check recurrence
        const weekIndex = Math.floor(i / 7);
        const recurrence = assignment.recurrenceWeeks || 1;
        if (weekIndex % recurrence !== 0) {
          continue; // Skip this week
        }

        const sessionDate = new Date(currentDate);
        sessionDate.setHours(assignment.hour, assignment.minute, 0, 0);
        
        // Don't plan in the past
        if (sessionDate > new Date()) {
          newSessions.push({
            id: `split_${split.id}_${sessionDate.getTime()}_${assignment.routineId}`,
            splitId: split.id,
            workoutId: assignment.routineId,
            workoutName: assignment.routineName,
            workoutColor: assignment.routineColor || null,
            dateTime: sessionDate.toISOString(),
            notificationId: null, // Will be managed by syncNotifications
          });
        }
      }
    }
    
    try {
      const stored = await AsyncStorage.getItem(PLANNED_STORAGE_KEY);
      let plannedSessions = stored ? JSON.parse(stored) : [];
      plannedSessions = [...plannedSessions, ...newSessions].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(plannedSessions));
      
      // Sync notifications immediately to ensure next 7 days are scheduled
      await this.syncNotifications();
    } catch (e) {
      console.error('Failed to save generated split sessions:', e);
    }
  },

  async clearFutureSessions(splitId) {
    try {
      const stored = await AsyncStorage.getItem(PLANNED_STORAGE_KEY);
      if (!stored) return;
      
      let plannedSessions = JSON.parse(stored);
      const now = new Date().toISOString();
      
      const sessionsToKeep = plannedSessions.filter(s => {
        if (s.splitId === splitId && s.dateTime > now) {
          if (s.notificationId) {
            Notifications.cancelScheduledNotificationAsync(s.notificationId).catch(() => {});
          }
          return false; // Remove it
        }
        return true; // Keep it
      });
      
      await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(sessionsToKeep));
    } catch (e) {
      console.error('Failed to clear future split sessions:', e);
    }
  },

  async syncNotifications() {
    try {
      const stored = await AsyncStorage.getItem(PLANNED_STORAGE_KEY);
      if (!stored) return;
      
      let plannedSessions = JSON.parse(stored);
      const now = new Date();
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(now.getDate() + 7);
      
      let modified = false;
      
      for (const session of plannedSessions) {
        const sessionDate = new Date(session.dateTime);
        
        // If it's in the past, clean up if it had a notification
        if (sessionDate <= now) {
          continue;
        }
        
        // If within 7 days, it should have a notification
        if (sessionDate <= sevenDaysFromNow) {
          if (!session.notificationId) {
            // Schedule it
            try {
              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'TIME TO TRAIN',
                  body: `${session.workoutName.toUpperCase()} IS SCHEDULED FOR NOW.`,
                  data: { workoutId: session.workoutId },
                  sound: true,
                },
                trigger: {
                  type: 'date',
                  date: sessionDate,
                },
              });
              session.notificationId = notificationId;
              modified = true;
            } catch (err) {
              console.warn('Failed to schedule local notification:', err);
            }
          }
        } else {
          // If > 7 days and has a notification, cancel it to free up slots
          if (session.notificationId) {
            await Notifications.cancelScheduledNotificationAsync(session.notificationId).catch(() => {});
            session.notificationId = null;
            modified = true;
          }
        }
      }
      
      if (modified) {
        await AsyncStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(plannedSessions));
      }
    } catch (e) {
      console.error('Failed to sync notifications:', e);
    }
  }
};
