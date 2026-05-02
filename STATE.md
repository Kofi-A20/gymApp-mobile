# Antigravity — State File
_Last updated: end of gamification testing session (Phases 1–6 complete)_

---

## Stack
- React Native + Expo
- Supabase (auth, database, RLS)
- AsyncStorage (splits, flex stat toggle)
- MaterialCommunityIcons

## App Structure
5 bottom tabs: Workouts, Calendar, Log/Stats, Calories, Profile

Profile screen has 4 tabs:
- PROFILE — original profile content
- RANK — level, XP bar, title, badge showcase, consistency score, personal challenges, flex stat picker
- SOCIAL — friends list, activity feed, add friend, pending requests
- RANKINGS — leaderboard with THIS WEEK / ALL TIME toggle

---

## Supabase Tables

### Pre-gamification (existing)
- `users`
- `sessions`
- `session_sets` — has `is_pr` column
- `exercises`
- `workouts`
- `workout_exercises`
- `milestones`
- `shared_workouts`
- `calendar_checkins`
- `weight_logs`

### Added by gamification (Phases 1–6)
| Table | Purpose |
|---|---|
| `user_gamification` | Core profile: `total_xp`, `level`, `selected_title`, `avatar_color`, `flex_stat` |
| `xp_ledger` | Immutable XP event log — source of truth |
| `badge_definitions` | 12 badge catalog with `grants_title` field |
| `user_badges` | Junction: badges earned per user |
| `exercise_mastery` | Per-exercise: `total_logs`, `has_pr`, `tier` |
| `user_challenges` | Custom goals: `challenge_type`, `target_value`, `current_value`, `unit`, `is_completed` |
| `friendships` | `user_a`, `user_b`, `status` (pending/accepted) |
| `shared_splits` | Shared split data between friends |

> RLS policies: all in place and audited. Trigger: auto-creates `user_gamification` row on new user signup. Existing users backfilled.

---

## XP Awards
| Event | XP |
|---|---|
| Session complete | 50 |
| PR hit | 100 |
| Mastery tier-up | 75 |
| Volume milestone | 200 |
| Perfect week | 250 |
| Challenge complete | 150 |

## Levels
Untrained → Novice → Intermediate → Advanced → Elite → Legend

## Mastery Tiers (per exercise)
- Bronze: 10 logs
- Silver: 25 logs + PR
- Gold: 50 logs + PR
- Diamond: 100 logs + PR

## Badges (12 total)
- Sessions: `first_session`, `sessions_10`, `sessions_100`
- Performance: `first_pr`, `volume_10k`, `volume_50k`, `volume_100k`
- Mastery: `mastery_bronze`, `mastery_silver`, `mastery_gold`
- Special: `perfect_week`, `challenge_complete`

---

## Key Files

### New files (gamification)
- `gamificationService.js` — `awardXP()`, `getLevelForXP()`, `checkAndAwardBadges()`, `getUserBadges()`
- `GamificationContext.jsx` — wraps app, exposes `xp`, `level`, `badges`, `refreshGamification()`
- `PRCelebration.jsx` — full screen animated overlay, confetti, auto-dismisses 2.5s
- `Challenges.jsx` — create/track personal challenges, progress bars
- `socialService.js` — `sendFriendRequest`, `acceptFriendRequest`, `removeFriend`, `getFriends`, `getPendingRequests`, `getFriendActivity`, `getLeaderboard()`
- `Social.jsx` — friends list, activity feed, add friend, pending requests
- `FriendProfile.jsx` — read-only: level, title, badges, top 3 PRs
- `AddFriendModal.jsx` — search by username

### Modified files (gamification)
- `App.jsx`
- `WorkoutContext.jsx` — `finishWorkout()` triggers XP, badges, mastery, perfect week check
- `setsService.js` — `logSet()` triggers XP on PR, `checkIfPR()` (only true if previous record exists)
- `Profile.jsx`
- `Stats.jsx`
- `TabNavigator.jsx`
- `MainNavigator.jsx`

### AsyncStorage
- `splitsService.js` — splits live here (not Supabase)
- `@reps_pending_prs` — written in `WorkoutContext.finishWorkout` pre-navigation, read+deleted in `WorkoutComplete.jsx`, deleted on unmount
- `@reps_pending_badges` — written as `"pending"` at start of `finishWorkout`, overwritten with final badge array on completion, deleted in `WorkoutComplete.jsx` on unmount
- `@reps_activeWorkout_ui` — active workout UI state (set inputs, completed sets, notes, rest timer)
- `last_badge_seen` — timestamp used by `getUnseenBadges` to filter unseen badges
- Flex stat toggle persisted via AsyncStorage

---

## Current Status
All 6 phases implemented. Schema audited. System stabilized and cross-user data visibility resolved.

**Status: Gamification & Social core finalized.**
> [!IMPORTANT]
> **Database Update Required:** A combined fix script containing RLS updates, badge renaming, and the critical signup trigger fix is at `src/scripts/gamification_fixes.sql`. Please run this in the Supabase SQL Editor.

## Recent Sessions

### WorkoutComplete celebration flow (latest)
**Status: Complete**

Changes made:
- `WorkoutComplete.jsx` — Done button gated behind `celebrationsComplete` derived boolean; disabled + opacity 0.4 until all celebrations dismissed
- `celebrationsReady` state added — prevents Done button being briefly tappable before `checkCelebrations` runs
- Redundant `getGamificationProfile` call removed from `checkCelebrations` — `refreshGamification()` now returns profile directly (~500ms saved)
- Badge retry ladder reduced from `[0, 500, 800]` to `[0, 750]` — cuts one Supabase round trip (~250-350ms saved), total celebration delay now ~900ms
- `WorkoutContext.jsx` — `@reps_pending_badges` AsyncStorage key written as `"pending"` at start of `finishWorkout`, overwritten with final badge array on completion (short-circuit mechanism for future optimization)
- All timing/debug `console.log` statements removed from `WorkoutComplete.jsx` and `WorkoutContext.jsx`

### WorkoutsLibrary caching (previous)
**Status: Complete**

- `hasFetched` ref guard added — prevents duplicate fetches
- `hasFetched.current = true` set optimistically before `getUserWorkouts()` call
- `setParams({ refresh: undefined })` clears refresh signal after consuming

### Resolved Issues
1. XP bar correctly renders empty at 0 XP.
2. First-ever set of an exercise now correctly awards a PR and doesn't crash.
3. Mastery tiers (Bronze/Silver/Gold/Diamond) visible in Stats/Progression view.
4. Badge "sessions_10" renamed to "10 Sessions".
5. Consistency score dynamically calculated for both self and friends.
6. Friends can now view each other's badges and PRs (RLS fixed).
7. Android white screen flash on navigation resolved via theme integration.
8. Android CTA buttons in workout creation no longer obscured by nav bar.
9. Username search is now case-insensitive; format enforced on edit.
10. Social tab now reacts instantly to new friend requests via Realtime.
11. Friend list refreshes automatically after accepting/declining requests.
12. Friend activity feed join error fixed by decoupling queries.


### Test order
1. XP fires on workout finish → check `xp_ledger` row in Supabase
2. Level label updates in UI
3. PR celebration overlay appears (and doesn't appear on first-ever log)
4. Badge earning — `first_session`, `first_pr`, `sessions_10` (idempotency check)
5. Exercise mastery progression — 10 logs = Bronze
6. Perfect week XP fires once per Mon–Sun week
7. Volume milestones — one-time at 10k/50k/100k kg
8. Personal challenges — create one, finish workouts, check progress updates
9. Social — two devices: friend request → accept → view friend profile
10. Leaderboard — THIS WEEK vs ALL TIME toggle, flex stat switching, persists on reopen

---

## Next Up
1. Composite leaderboard redesign — weekly/monthly toggle, friends-first, rank movement indicators, `last_week_rank` column, Supabase score function
2. Activity feed milestone redesign — PR hit, rank jump, level up, streak events
3. Push notifications for friend requests via Expo
4. Security audit — `calendarService`, `setsService`, `exercisesService`, `sessionsService` missing `user_id` filters (RLS is current guard, full fix parked)