# REPS — MASTER TODO

---

## 🐛 Bugs & UI Fixes

### 🏋️ Workout Detail
- **Remove video from exercise expansion** — Expanding an exercise row shows both a muscle diagram and a video. Remove video entirely from this view. Video playback is only for active workout sessions.

### 💪 Active Workout
- **Video trigger button redesign** — Replace the eye icon with a small pill labelled "VIDEO" so its purpose is immediately clear.
- **Light mode — exercise completion highlight** — Completion tick/highlight is a washed-out pale green in light mode. Should be visible and consistent with the theme accent color.

### ➕ Create Workout (Light Mode)
- **Filter pills go black when selected** — Should use theme accent color instead.
- **"Next / Configure Workout" button is black** — Should use theme accent color with appropriate contrast text.
- **"Create Workout Routine" button in Configure Workout is black** — Same fix, use theme accent color.
- **Exercise selection state doesn't use accent color** — Selected exercises should highlight using theme accent color.

### 📅 Calendar (Light Mode)
- **Overall palette too pale/washed out** — General light mode appearance needs contrast improvement.
- **Completed workout day fill color** — Uses the same washed-out color as the active workout exercise tick. Needs to be distinct and clearly communicate a completed day.

### 👤 Profile
- **Date of birth does not persist after app restart** — Saving DOB appears to succeed but value is lost on next launch. Investigate Supabase write.
- **Activity Level selector pill doesn't hold selected state** — Currently selected activity level is not visually highlighted. Should match how Gender pills behave, using accent color.
- **Biometrics Activity tile is pitch black in light mode** — Height, Weight, and Age tiles are white in light mode but Activity renders as solid black with white text. Should be consistent with the other tiles.

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