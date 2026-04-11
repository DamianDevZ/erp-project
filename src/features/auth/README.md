# Auth Feature

Handles authentication, authorization, and user session management.

## Purpose

Manages user sign-up, login, password reset, and role-based access control.

## Integration

Uses **Supabase Auth** for:
- Email/password authentication
- Session management (via cookies)
- Password reset flow

## Components

| Component | Description |
|-----------|-------------|
| `LoginForm` | Email/password login |
| `SignUpForm` | New user registration |
| `ResetPasswordForm` | Password reset request |

## Server Actions

| Action | Description |
|--------|-------------|
| `signIn` | Authenticate user |
| `signUp` | Register new user |
| `signOut` | End user session |
| `resetPassword` | Send reset email |
| `updatePassword` | Set new password |

## Middleware

The app uses middleware (`src/middleware.ts`) to:
1. Refresh expired sessions automatically
2. Protect dashboard routes from unauthenticated access

## Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access, can manage users |
| `manager` | CRUD on drivers, assignments, payroll |
| `viewer` | Read-only access |
