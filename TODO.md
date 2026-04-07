NEXT SESSION - TODO

Screens to fix and build out:

1. Calendar Screen
   - Wire up actual session data to calendar days
   - Tap a day to see what workout was done
   - Visual indicator on days that have logged sessions

2. Weights Log Screen
   - [x] Display logged session history
   - [x] Show volume, sets, reps per session
   - [ ] Filter/sort options
   - [x] History cards with detail drill-down
   - [x] Delete and edit specific historical sets

3. Calorie Calculator Screen
   - Wire up to user profile data (weight, height, activity level, goal)
   - Calculate and display TDEE and targets

4. Settings & Account Screen
   - Save profile data to Supabase users table
   - Units toggle (kg/lbs) persisting to DB
   - Dark/light mode persisting to DB
   - Logout wired up

5. Header Component Refactor
   - Each screen has a slightly different header
   - Build a shared Header component that accepts props for title, left action, right action
   - Replace all individual screen headers with this component

6. Exercise Library
   - Expand the global exercise list in Supabase
   - Muscle heat map diagram showing targeted muscles per exercise

7. Start Session Flow
   - [x] START SESSION button in workout detail needs to be fully wired up
   - [x] Create session in Supabase (on completion)
   - [x] Log sets and reps during active workout (locally with AsyncStorage)
   - [x] Progressive set locking (unlock 1 by 1)
   - [x] Background persistence (AsyncStorage)
   - [x] Navigation lockdown (No back/tabs)
   - [x] Complete session and save to sessions table in bulk

8. Workout Detail Screen Redesign
   - [x] Each exercise row should show sets x reps targets, not coaching cues
   - [x] Coaching cues should be hidden by default
   - [x] Tapping the right arrow on an exercise opens a detail/info view showing coaching cues
   - [ ] Implement muscle diagram visualization in expanded view
   - [x] This makes the routine view compact and scannable.

9. Weights Log Screen Redesign
   - [x] History-based card view implemented
   - [ ] Add PR Progression Archive (Exercise name, last weight, best weight)
   - [ ] Motivates progression by showing hit PRs clearly