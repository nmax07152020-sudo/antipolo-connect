# Antipolo Connect — Clean V2

Clean employee-community build for the Antipolo City Health Office.

## Clean-up included
- Removed all hard-coded demo posts, announcements, events, birthdays, groups, notifications, employee names, profile counts, and demo dashboard login.
- Home feed, announcements, events, groups, messages, saved items, and notifications use empty states until real data is published.
- Employee Directory loads approved employees from Firestore.
- Admin Dashboard loads registrations from Firestore and supports Approve/Reject.
- Firebase Authentication + Firestore configuration retained.
- Enhanced City Health Office branding and responsive UI retained.

## Files
- index.html — enhanced UI
- app.js — clean Firebase-connected behavior
- firebase.js — existing Firebase web configuration
- firestore.rules — existing Firestore rules
- styles.css — existing styles
- vercel.json — Vercel configuration
