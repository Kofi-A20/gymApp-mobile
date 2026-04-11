NEXT SESSION - TODO

Screens to fix and build out:

1. Calendar Screen
   - [x] Wire up actual session data to calendar days
   - [x] Tap a day to see what workout was done
   - [x] Visual indicator on days that have logged sessions

2. Weights Log Screen
   - [x] Display logged session history
   - [x] Show volume, sets, reps per session
   - [ ] Filter/sort options
   - [x] History cards with detail drill-down
   - [x] Delete and edit specific historical sets
   - [x] PR Progression Archive
   - [x] Body weight tab migrated to Calories

3. Calorie Calculator Screen
   - [x] Wire up to user profile data (weight, height, activity level, goal)
   - [x] Calculate and display TDEE and targets
   - [x] Macro ratios
   - [x] Goal progress bar
   - [x] Weekly weight log with strategy-aware deltas
   - [x] Profile weight auto-sync on log
   - [x] Weekly reminder notification

4. Settings & Account Screen
   - [x] Save profile data to Supabase users table
   - [x] Units toggle (kg/lbs) persisting to DB
   - [x] Dark/light mode persisting to DB
   - [x] Logout wired up
   - [x] Weekly weight reminder (day + time picker)

5. Header Component Refactor
   - [ ] Build shared Header component accepting props: title, leftAction, rightAction
   - [ ] Replace all individual screen headers with this component

6. Exercise Library
   - [ ] Expand global exercise list in Supabase
   - [ ] Muscle heat map diagram showing targeted muscles per exercise
   - [ ] Global routine publishing — users opt-in to share routines publicly (FUTURE)

7. Start Session Flow
   - [x] START SESSION button wired up
   - [x] Create session in Supabase on completion
   - [x] Log sets and reps during active workout
   - [x] Progressive set locking
   - [x] Background persistence via AsyncStorage
   - [x] Navigation lockdown
   - [x] Complete session and save to sessions table in bulk

8. Workout Detail Screen
   - [x] Sets x reps targets per exercise row
   - [x] Coaching cues hidden by default
   - [x] Tapping arrow opens detail view with coaching cues
   - [ ] Muscle diagram in expanded view

9. Batch Delete UX (all screens)
   - [ ] Select-all button when selection mode is active

10. remove the damned burger icon (three horizontal lines) from the top left of the screen and fix icons in settings and all other screens