import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { sessionsService } from '../services/sessionsService';
import { setsService } from '../services/setsService';
import { workoutsService } from '../services/workoutsService';
import { gamificationService } from '../services/gamificationService';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@reps_activeWorkoutState';

const WorkoutContext = createContext({});

export const WorkoutProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [isLogging, setIsLogging] = useState(false);
  const [lastCompletedAt, setLastCompletedAt] = useState(0);

  // Restore session on app mount (resume after backgrounding/crash)
  useEffect(() => {
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.session) {
            setActiveSession(saved.session);
            setIsLogging(true);
          }
        }
      } catch (e) {
        // Silently fail — no session to restore
      }
    };
    restore();
  }, []);

  /**
   * Start a workout session from a template.
   */
  const startWorkout = useCallback(async (workoutId = null) => {
    setIsLogging(true);
    try {
      let session = {
        id: 'local_' + Date.now(),
        workout_id: workoutId,
        workout_name: '',
        exercises: [],
        started_at: new Date().toISOString(),
      };

      if (workoutId) {
        const detail = await workoutsService.getWorkoutDetail(workoutId);
        session.workout_name = detail.name || '';
        session.exercises = detail.exercises || [];
      }

      // Clear any stale UI state from the previous session before starting fresh
      await AsyncStorage.removeItem('@reps_activeWorkout_ui');

      setActiveSession(session);

      // Persist to AsyncStorage so the session survives backgrounding
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ session }));
    } catch (error) {
      setIsLogging(false);
      throw error;
    }
  }, []);

  /**
   * Finish and commit the session to Supabase.
   * completedSets format: { "exerciseId-setIndex": { weight: string, reps: string } }
   */
  const finishWorkout = useCallback(async (completedSets = {}, notes = '') => {
    if (!activeSession) return;

    try {
      // 1. Create session row in DB — pass workout_name so it survives template deletion
      const dbSession = await sessionsService.startSession(
        activeSession.workout_id,
        activeSession.workout_name
      );

      // 2. Log each completed set to Supabase
      const setPromises = [];
      let setNumber = 1;
      for (const exercise of (activeSession.exercises || [])) {
        const exId = exercise.id || exercise.exercise_id;
        const setsCount = exercise.sets_target || 3;
        let exSetNumber = 1;
        for (let i = 0; i < setsCount; i++) {
          const key = `${exId}-${i}`;
          const setData = completedSets[key];
          if (setData && setData.weight && setData.reps) {
            setPromises.push(
              setsService.logSet(
                dbSession.id,
                exId,
                exSetNumber,
                parseFloat(setData.weight),
                parseInt(setData.reps)
              )
            );
            exSetNumber++;
          }
        }
      }
      
      const loggedSets = await Promise.all(setPromises);

      // Detect PRs for post-commit celebration
      const prs = loggedSets
        .filter(s => s.is_pr && !s.isFirstEver)
        .map(s => {
          const ex = (activeSession.exercises || []).find(e => (e.id || e.exercise_id) === s.exercise_id);
          return {
            name: ex?.name || 'Unknown Exercise',
            weight: s.weight_kg,
            reps: s.reps
          };
        });

      if (prs.length > 0) {
        await AsyncStorage.setItem('@reps_pending_prs', JSON.stringify(prs));
      }

      // 3. Calculate total volume and complete the session
      const totalVolume = Object.values(completedSets).reduce((acc, s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps) || 0;
        return acc + (w * r);
      }, 0);

      await sessionsService.completeSession(dbSession.id, { total_volume_kg: totalVolume, notes });

      let earnedBadges = [];

      // Award XP for completing the session
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const result = await gamificationService.awardXP('session_complete', dbSession.id);
          if (result.newBadges) earnedBadges = [...earnedBadges, ...result.newBadges];

          // Phase 3 checks
          await gamificationService.checkConsistencyAndPerfectWeek(user.id);
          const volBadges = await gamificationService.checkVolumeMilestones(user.id);
          if (volBadges) earnedBadges = [...earnedBadges, ...volBadges];

          // Phase 4 checks
          await gamificationService.updateChallenges(user.id, { sets: completedSets });
        }
      } catch (err) {
        console.error('Failed to award session XP or run Phase 3 checks:', err);
      }

      // 4. Clear local state
      setActiveSession(null);
      setIsLogging(false);
      setLastCompletedAt(Date.now());
      await AsyncStorage.removeItem(STORAGE_KEY);

      return earnedBadges;
    } catch (error) {
      throw error;
    }
  }, [activeSession]);

  /**
   * Cancel and discard the session.
   */
  const cancelWorkout = useCallback(async () => {
    setActiveSession(null);
    setIsLogging(false);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WorkoutContext.Provider value={{
      activeSession,
      isLogging,
      lastCompletedAt,
      startWorkout,
      finishWorkout,
      cancelWorkout,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
