# REPS — MASTER TODO

---

## 🐛 Bugs & UI Fixes
## 📐 UI Scale & Density Overhaul

**Root cause:** Hero headings are ~56-64px across every screen (poster scale, not mobile scale). Cards and input fields have excessive internal padding. Screens feel like a website scaled to phone size.

**Benchmark screens** (these are correct — do not change): Active Workout, Calorie Command, Calendar. Extract their exact hero heading size, small label above hero, card padding, input field height, and section label size — then apply those values globally to every other screen.

### Global fixes needed
- **Hero headings** — reduce from ~56-64px to ~36-40px across all screens, single line where possible
- **Card/tile padding** — reduce from ~20-24px to ~14-16px so tiles are shorter and show more content
- **Input field height** — reduce internal vertical padding so form fields feel native not chunky
- **Section labels used as heroes** — FRIENDS, EXERCISE SELECTION inside cards should be 14-16px label size, not heading size

### Screen-specific
- **Workout Library** — "WORKOUT LIBRARY." too large, workout cards too tall for their content
- **Create Workout** — "CREATE WORKOUT" hero eats top third of screen, exercise row cards too tall, placeholder text cut off
- **Configure Sets** — "CONFIGURE THE SETS" three lines of massive type, workout name below it same visual weight as heading — should be secondary
- **Session History** — "SESSION HISTORY." too large, session cards too tall (only 3.5 visible, should be 6-7)
- **Progression** — "WEIGHT PROGRESS." too large
- **Overview Stats** — "OVERVIEW STATS." too large
- **Leaderboard** — row cards too tall, right side (flex stat) has too much dead space
- **Social Tab** — FRIENDS heading oversized for a section label, too much empty space around activity tile and VIEW ALL FRIENDS link
- **Settings** — OPTIONS heading too large, theme selector tiles (STARK WHITE / DEEP BLACK) too tall
- **Profile Biometrics** — HEIGHT/WEIGHT/AGE/ACTIVITY tiles too tall, dead space between label and value
- **Profile Physical Metrics** — all input fields too tall, SELECT DATE OF BIRTH placeholder text oversized
---
### Screens that are fine — do not touch
- Active Workout
- Calorie Command
- Calendar
### 🏋️ Workout Detail
- **Remove video from exercise expansion** — Expanding an exercise row shows both a muscle diagram and a video. Remove video entirely from this view. Video playback is only for active workout sessions.
---
### 💪 Active Workout
- **Video trigger button redesign** — Replace the eye icon with a small pill labelled "VIDEO" so its purpose is immediately clear.
- **Light mode — exercise completion highlight** — Completion tick/highlight is a washed-out pale green in light mode. Should be visible and consistent with the theme accent color.
---
### ➕ Create Workout (Light Mode)
- **Filter pills go black when selected** — Should use theme accent color instead.
- **"Next / Configure Workout" button is black** — Should use theme accent color with appropriate contrast text.
- **"Create Workout Routine" button in Configure Workout is black** — Same fix, use theme accent color.
- **Exercise selection state doesn't use accent color** — Selected exercises should highlight using theme accent color.
---

## 💡 Feature Requests (From User Testing)

### 🔥 Calorie Command
- **Toggle to hide Calorie Command screen** — not every user wants calorie guidance. Add an option in Settings to completely hide the Calorie Command tab for users who don't need it.
- **Manual calorie target input** — instead of the app calculating a target, let users who know what they're doing enter their own calorie and macro targets directly. so more of a suggestion for calories and if you want to log your own goal then you can do that.


### 💪 Active Workout
- **Tick all sets at once** — add a "COMPLETE ALL" option per exercise so users who log after their session can mark all sets done in one tap. This requires removing the current restriction that locks subsequent sets until the previous one is filled — all sets should be freely editable at any time.
- **Add ad-hoc exercises mid-session** — during an active workout, allow the user to add exercises that weren't in the routine (e.g. a machine was busy, they swapped). These extra exercises should be clearly distinguished in the session archive as a deviation from the routine (e.g. tagged "ADDED MID-SESSION" or shown in a separate section of the workout record).
- **Set and rep logging for ad-hoc exercises** — when a mid-session exercise is added, the user must be able to specify sets, reps, and weight for it just like any routine exercise.

### 📅 Backlog / Past Session Logging
- **Log a past workout** — users who forgot to log a session, or who are migrating from a notes app, should be able to record a workout for a past date. This should be accessible from the Calendar screen by tapping a past day and selecting "Log a Past Session".


### 🏋️ Custom Exercises & Video Personalisation
- **Create custom exercises** — if a user can't find an exercise in the global database, they should be able to create their own. Custom exercises are stored locally on their device and appear in the exercise list alongside the global ones, clearly marked as user-created (e.g. a small badge or tag). Note: when the global exercise database is later migrated to a local/offline-first model, custom exercises should merge seamlessly into that list.
- **Custom exercise video links** — every exercise has a default YouTube tutorial video assigned by the app, shown when the VIDEO button is tapped during active workout. Users can optionally add their own preferred YouTube link for any exercise — for example a specific coach or creator they trust. When a custom link is saved, both the default and the user's video are available in a small selection so they can pick which one to watch. Custom video links are stored locally on the device and persist across sessions.

---
### 📅 Calendar (Light Mode)
- **Overall palette too pale/washed out** — General light mode appearance needs contrast improvement.
- **Completed workout day fill color** — Uses the same washed-out color as the active workout exercise tick. Needs to be distinct and clearly communicate a completed day.
---
### 👤 Profile
- **Date of birth does not persist after app restart** — Saving DOB appears to succeed but value is lost on next launch. Investigate Supabase write.
- **Activity Level selector pill doesn't hold selected state** — Currently selected activity level is not visually highlighted. Should match how Gender pills behave, using accent color.
- **Biometrics Activity tile is pitch black in light mode** — Height, Weight, and Age tiles are white in light mode but Activity renders as solid black with white text. Should be consistent with the other tiles.
---
### 📊 Analytics
- **Weight log input placeholder text too large** — Placeholder inside the "Log this week" weight input is oversized and gets cut off. Reduce font size so full hint text is readable.

### ⚙️ Settings
- **Workout Reminders toggle bleeds outside tile on iPhone 14** — Layout bug, needs constraint fix.

---

## 🔒 Security (Parked)
- **Security audit** — `calendarService`, `setsService`, `exercisesService`, `sessionsService` missing `user_id` filters. RLS is the current guard but explicit filters should be added.

---

## 🚧 Incomplete Features

### 👥 Social
- **Friend adding via QR code / 6-character code** — Not yet implemented.
- **Friends list not persisting after app restart** — Friend relationships may only exist in local state and not be written to Supabase on add.
- **Push notifications for friend requests** — When a friend request is sent, the recipient gets no notification. Requires:
  1. Expo push token stored per user in Supabase
  2. `sendFriendRequest` triggers Supabase Edge Function or direct Expo Push API call
  3. Notification payload: `"USERNAME sent you a friend request"`

### 🔔 Motivational Daily Reminder Notification
- Fires if no workout is logged by a user-set time
- Tone slider in Settings (under Alerts) — ranges from friendly to brutal, with randomised copy per tier so messages don't repeat
- Time picker in Settings to control when the notification fires

### 👤 Auth & Onboarding
- **Username not collected during signup** — Must be set afterwards in Profile. Should be part of onboarding.
- **First-time onboarding flow** — Walk new users through core app sections after account creation.
- **Improve login screen**
- **Google, Apple, and third-party OAuth integration**

---

## 🎨 UI / UX
- **Nav pill glassmorphism effect**

---

## 💰 Monetisation
- Define which features go behind paywall
- Implement premium gate

---

## 💡 Suggestions

### From Dev Classmate
- Apple Health / Google Fit integration

### From Heavy User
- AI coaching chatbot
  - User sets a goal (e.g. "bench 100kg in 6 months")
  - AI builds a tailored workout, diet, and rest plan
  - Automatically schedules everything into the calendar
  - Backend powered by Claude API


  friend suggestion
  freind said its toooo blocky 
  and the font was too big liek a web application