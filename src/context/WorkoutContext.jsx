import React, { createContext, useContext, useState, useCallback } from 'react';
import { sessionsService } from '../services/sessionsService';
import { setsService } from '../services/setsService';

const WorkoutContext = createContext({});

export const WorkoutProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [activeSets, setActiveSets] = useState([]);
  const [isLogging, setIsLogging] = useState(false);

  /**
   * Start a workout session.
   */
  const startWorkout = useCallback(async (workoutId = null) => {
    setIsLogging(true);
    try {
      const session = await sessionsService.startSession(workoutId);
      setActiveSession(session);
      setActiveSets([]);
    } catch (error) {
      console.error('Failed to start workout:', error);
      setIsLogging(false);
      throw error;
    }
  }, []);

  /**
   * Log a set to the active session.
   */
  const logSet = useCallback(async (exerciseId, weight, reps) => {
    if (!activeSession) return;

    try {
      // Determine set number for this exercise in this session
      const existingSetsForEx = activeSets.filter(s => s.exercise_id === exerciseId);
      const setNumber = existingSetsForEx.length + 1;

      const newSet = await setsService.logSet(activeSession.id, exerciseId, setNumber, weight, reps);
      setActiveSets(prev => [...prev, newSet]);
      return newSet;
    } catch (error) {
      console.error('Failed to log set:', error);
      throw error;
    }
  }, [activeSession, activeSets]);

  /**
   * Finish and save the session.
   */
  const finishWorkout = useCallback(async (notes = '') => {
    if (!activeSession) return;

    try {
      // Calculate total volume
      const totalVolume = activeSets.reduce((acc, s) => acc + (s.weight_kg * s.reps), 0);

      await sessionsService.completeSession(activeSession.id, {
        total_volume_kg: totalVolume,
        notes
      });

      setActiveSession(null);
      setActiveSets([]);
      setIsLogging(false);
    } catch (error) {
      console.error('Failed to finish workout:', error);
      throw error;
    }
  }, [activeSession, activeSets]);

  /**
   * Cancel and discard the current session.
   */
  const cancelWorkout = useCallback(() => {
    setActiveSession(null);
    setActiveSets([]);
    setIsLogging(false);
    // Note: We might want to delete the session in the DB too
  }, []);

  return (
    <WorkoutContext.Provider value={{ 
      activeSession, 
      activeSets, 
      isLogging, 
      startWorkout, 
      logSet, 
      finishWorkout, 
      cancelWorkout 
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
