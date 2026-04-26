export const mapMuscleSlug = (muscleName) => {
  const name = muscleName.toLowerCase();
  if (name.includes('anterior deltoid') || name.includes('front delt')) return 'front-deltoids';
  if (name.includes('posterior deltoid') || name.includes('rear delt')) return 'rear-deltoids';
  if (name.includes('deltoid') || name.includes('shoulder')) return 'front-deltoids';
  if (name.includes('pectoralis') || name.includes('chest')) return 'chest';
  if (name.includes('biceps')) return 'biceps';
  if (name.includes('triceps')) return 'triceps';
  if (name.includes('latissimus') || name.includes('lat')) return 'upper-back';
  if (name.includes('trapezius') || name.includes('trap')) return 'trapezius';
  if (name.includes('rectus abdominis') || name.includes('abs') || name.includes('core')) return 'abs';
  if (name.includes('oblique')) return 'obliques';
  if (name.includes('quadriceps') || name.includes('quad')) return 'quadriceps';
  if (name.includes('hamstring')) return 'hamstring';
  if (name.includes('gluteus') || name.includes('glute')) return 'gluteal';
  if (name.includes('gastrocnemius') || name.includes('calf') || name.includes('calves')) return 'calves';
  if (name.includes('erector') || name.includes('lower back')) return 'lower-back';
  if (name.includes('forearm')) return 'forearm';
  return null;
};

export const intensityColors = {
  6: '#DC2626',
  5: '#EF4444',
  4: '#EA580C',
  3: '#F97316',
  2: '#FB923C',
  1: '#F59E0B',
};

export const getIntensityForPct = (pct) => {
  if (pct >= 0.35) return 6;
  if (pct >= 0.25) return 5;
  if (pct >= 0.15) return 4;
  if (pct >= 0.08) return 3;
  if (pct >= 0.03) return 2;
  return 1;
};

export const EXERCISE_FILTERS = ['ALL', 'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'CORE', 'FOREARMS'];

export const muscleFilterMap = {
  CHEST: ['Chest'],
  BACK: ['Lats', 'Trapezius', 'Lower Back'],
  SHOULDERS: ['Front Deltoids', 'Rear Deltoids', 'Shoulders'],
  BICEPS: ['Biceps'],
  TRICEPS: ['Triceps'],
  QUADS: ['Quads'],
  HAMSTRINGS: ['Hamstrings'],
  GLUTES: ['Glutes'],
  CALVES: ['Calves'],
  CORE: ['Abs', 'Obliques'],
  FOREARMS: ['Forearms'],
};

export const exerciseMatchesFilter = (exercise, filter) => {
  if (filter === 'ALL') return true;
  const targets = muscleFilterMap[filter] || [];
  const mg = exercise.muscle_group?.toUpperCase() || '';
  const primaryMuscles = exercise.primary_muscles || [];
  return mg === filter || targets.some(m => primaryMuscles.includes(m));
};
