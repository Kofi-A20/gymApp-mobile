NEXT SESSION - TODO

Screens to fix and build out:

1. Calendar Screen
   - [x] Wire up actual session data to calendar days
   - [x] Tap a day to see what workout was done
   - [x] Visual indicator on days that have logged sessions

2. Weights Log Screen
   - [x] Display logged session history
   - [x] Show volume, sets, reps per session
   - [x] Filter/sort options (filter chips by workout name already in archive)
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
   - [x] Build shared RepsHeader component
   - [x] Replace all individual screen headers
   - [x] Remove burger icon from all main tab screens
   - [x] Select-all in selection mode headers

6. Exercise Library
   - [x] Expand global exercise list in Supabase (856 exercises seeded)
   - [x] Core exercises seeded (15 exercises)
   - [x] Granular muscle group filters in AddWorkout
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
   - [x] Select-all in WorkoutsLibrary
   - [x] Select-all in WeightsLog
   - [x] Select-all in Calories weight log
   - [ ] Select-all in Calendar planned sessions (low priority)

10. Profile & Weight Flow
    - [x] Weight field read-only after first log
    - [x] Tapping weight navigates to Calories weight log with auto-scroll
    - [x] Weight log auto-syncs profile.weight_kg
    - [x] Profile always shows latest logged weight

11. Navigation & UI
    - [x] Animated pill tab bar with correct centering
    - [x] Profile stack reset on tab press
    - [x] SafeAreaView migration to useSafeAreaInsets
    - [x] Black base layer to prevent white flash
    - [x] Workout routine create flow overhauled
    - [x] Exercise expand/collapse with save in AddWorkout

12. Sharing & Social (FUTURE)
    - [ ] Deep link sharing of routines between users
    - [ ] Global public routine library
    - [ ] Users can publish and download community routines
    - [ ] Muscle heat map in exercise library