import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profileService';
import { useAuth } from './AuthContext';

const ProfileContext = createContext({});

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await profileService.getProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates) => {
    try {
      const updated = await profileService.updateProfile(updates);
      setProfile(updated);
      return updated;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const toggleUnits = async () => {
    if (!profile) return;
    const newUnits = profile.units === 'kg' ? 'lbs' : 'kg';
    await updateProfile({ units: newUnits });
  };

  return (
    <ProfileContext.Provider value={{ 
      profile, 
      loading, 
      refreshProfile: fetchProfile, 
      updateProfile,
      toggleUnits 
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
