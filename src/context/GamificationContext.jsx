import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { gamificationService } from '../services/gamificationService';
import { useAuth } from './AuthContext';

const GamificationContext = createContext({});

export const GamificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [gamification, setGamification] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGamification = useCallback(async () => {
    if (!user) {
      setGamification(null);
      setBadges([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [gamificationData, badgesData] = await Promise.all([
        gamificationService.getGamificationProfile(user.id),
        gamificationService.getUserBadges(user.id)
      ]);
      setGamification(gamificationData);
      setBadges(badgesData);
      return gamificationData;
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGamification();
  }, [fetchGamification]);

  const refreshGamification = async () => {
    return await fetchGamification();
  };

  const updateGamification = async (updates) => {
    try {
      const updated = await gamificationService.updateGamificationProfile(updates);
      setGamification(updated);
      return updated;
    } catch (error) {
      console.error('Failed to update gamification profile:', error);
      throw error;
    }
  };

  return (
    <GamificationContext.Provider value={{ 
      xp: gamification?.total_xp || 0,
      level: gamification?.level || 'Untrained',
      title: gamification?.selected_title || '',
      progressPercentage: gamificationService.getXpProgress(gamification?.total_xp || 0),
      badges,
      gamification,
      loading, 
      refreshGamification,
      updateGamification
    }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
