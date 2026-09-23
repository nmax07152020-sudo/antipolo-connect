# Antipolo Connect V2 — Firebase Employee Approval

This version connects the Admin Dashboard to Firestore employee records.

## What's real in V2
- Firebase Email/Password login
- Firebase registration creates `users/{uid}` with `status: pending`
- Admin Dashboard loads real `users` from Firestore
- Live total user and pending approval counts
- Admin can Approve or Reject pending registrations
- Admin role is protected by the `admins/{uid}` record and `active: true` + `role: admin`

## Firebase setup
- Project: `antipolo-connect-web`
- Firestore database: `(default)`
- Authentication: Email/Password enabled
- Publish `firestore.rules` in Firebase Console after any rules changes

## Admin record
Use the admin Auth UID as the document ID in `admins` and set:
- `role`: `admin` (string)
- `active`: `true` (boolean)
- `email`: admin email
- `fullName`: admin full name

The same UID should have a `users/{uid}` record with `role: admin` and `status: approved`.
