import { redirect } from 'next/navigation';

/**
 * Password recovery is owned by Clerk, the application's authentication
 * provider. Keeping this legacy URL prevents old bookmarks from entering the
 * retired Supabase Auth flow.
 */
export default function ForgotPasswordPage() {
  redirect('/sign-in');
}
