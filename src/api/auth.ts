import { api } from '../lib/api';
import type { User } from '../types';

/** Update the signed-in user's own profile (name / phone). */
export const updateProfile = (payload: { name?: string; phone?: string | null }) =>
  api.patch<{ user: User }>('/auth/profile', payload).then((r) => r.data.user);

/** Change the signed-in user's password (verifies the current one). */
export const changePassword = (currentPassword: string, newPassword: string) =>
  api
    .post<{ message: string }>('/auth/change-password', { currentPassword, newPassword })
    .then((r) => r.data);

/** Request a password reset — emails a magic reset link (generic response). */
export const forgotPassword = (email: string) =>
  api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data);

/** Set a new password using the token from the emailed reset link. */
export const resetPassword = (resetToken: string, password: string) =>
  api.post<{ message: string }>('/auth/reset-password', { resetToken, password }).then((r) => r.data);
