# REPS — MASTER TODO

## Gamification

### XP system — earned from completing sessions, hitting PRs, crossing volume milestones, completing personal challenges, reaching exercise mastery tiers, and perfect weeks
- Level system tied to XP — Untrained → Novice → Intermediate → Advanced → Elite → Legend
- Badges — first session, 10/100 sessions, first PR, volume milestones (10k/50k/100k kg lifetime), perfect week, personal challenge completed, exercise mastery tiers
- Consistency score — weekly percentage based on how many assigned split days you completed vs planned
- Exercise mastery — tracks how many times you've logged an exercise and whether you've PRd, shown on Progression tab with a subtle visual tier indicator
- PR celebrations — active session screen reacts in the moment when you log a PR
- Personal challenges — self-set time-bound goals with a progress bar, awards XP and a badge on completion
- Volume milestones — lifetime total crossed thresholds award one-time XP and badges

### Social
- User accounts and friends system — add friends via username or existing code mechanic
- Friend activity — lightweight, just a line showing what they logged and when
- Public profile — shows level, title, badges, consistency score, top PRs
- Customisable profile — avatar color tied to existing app color system
- Titles — earned through achievements, displayed under name
- Split sharing — share full weekly split including recurrence via existing code mechanic

### Leaderboard
- Friends-only leaderboard in Stats tab
- Ranked by XP
- Toggle between This Week and All Time
- Each user picks a flex stat displayed next to their rank — volume, PR count, or consistency score

## Motivational daily reminder notification
- Fires if no workout logged by a user-set time
- Tone slider in Settings (under Alerts) ranging from friendly to brutal with randomised copy per tier so it doesn't repeat
- Time picker in Settings to set when the notification triggers

## 🟠 UI / UX
- [ ] Nav pill glassmorphism effect

## 🔵 AUTH & SECURITY
- [ ] Security audit and checks
- [ ] Improve login screen
- [ ] Google, Apple, and third-party OAuth integration


## 🚀 ONBOARDING
- [ ] First-time onboarding flow after account creation
      - Walk user through core app sections

## 💰 MONETISATION
- [ ] Define which features go behind paywall
- [ ] Implement premium gate

---

## 💡 SUGGESTIONS

### From Dev Classmate
- [ ] Apple Health / Google Fit integration 

### From Heavy User
- [ ] AI coaching chatbot
      - User sets a goal ("bench 100kg in 6 months")
      - AI builds a tailored workout + diet + rest plan
      - Automatically schedules everything into the calendar
      - Could run on Claude API as the backend

