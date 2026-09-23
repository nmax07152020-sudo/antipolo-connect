# Antipolo Connect V1

Responsive employee-only social network starter for a City Health Office. Built as a static web app with Firebase Authentication + Cloud Firestore, deployable to GitHub and Vercel/Firebase Hosting.

## What's included
- Responsive login / registration UI
- Pending approval registration flow
- Demo dashboard mode (works before Firebase setup)
- Facebook-style home feed UI
- Employee directory
- Announcements
- Events
- Groups / Units
- Profile
- Settings
- Admin dashboard UI
- Firestore security rules starter
- Mobile bottom navigation

## Firebase setup
1. Create a Firebase project.
2. Add a Web App.
3. Enable Authentication > Sign-in method > Email/Password.
4. Create a Cloud Firestore database.
5. Copy the Firebase Web App config into `firebase.js`.
6. Deploy `firestore.rules` as your Firestore rules.
7. Create one admin account normally through the app.
8. In Firestore console, create `admins/{ADMIN_UID}`. The document can contain `{ "role": "admin" }`.
9. Update that admin user's `users/{ADMIN_UID}` document to `status: "approved"` and `role: "admin"`.

## Important security note
Never place a Firebase Admin SDK service-account private key in frontend files. Firebase Web App config values are intended for client initialization; access control is enforced by Authentication and Firestore Security Rules.

## Local preview
Because `app.js` is an ES module, open the project through a local web server instead of `file://`.

Example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Vercel
Import the GitHub repository into Vercel. This project is a static site and does not require a build command.
