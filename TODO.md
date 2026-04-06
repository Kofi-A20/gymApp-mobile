NEXT SESSION - TODO

Screens to fix and build out:

1. Calendar Screen
   - Wire up actual session data to calendar days
   - Tap a day to see what workout was done
   - Visual indicator on days that have logged sessions

2. Weights Log Screen
   - Display logged session history
   - Show volume, sets, reps per session
   - Filter/sort options

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
   - START SESSION button in workout detail needs to be fully wired up
   - Create session in Supabase
   - Log sets and reps during active workout
   - Complete session and save to sessions table

8. Workout Detail Screen Redesign
   - Each exercise row should show sets x reps targets, not coaching cues
   - Coaching cues should be hidden by default
   - Tapping the right arrow on an exercise opens a detail/info view
     showing coaching cues and muscle diagram
   - This makes the routine view compact and scannable