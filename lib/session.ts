// Tassel — sessions
// Every phone gets an anonymous Supabase session on first launch, so scans,
// farms and forum posts work without a sign-up. A farmer can later attach an
// email + password to the same account (their data is kept) or sign in on a
// new phone.

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

let pending: Promise<Session> | null = null;

export async function ensureSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  if (!pending) {
    pending = (async () => {
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (error || !anon.session) {
        throw new Error('Could not start a session. Check your internet connection.');
      }
      return anon.session;
    })().finally(() => {
      pending = null;
    });
  }
  return pending;
}

export async function currentUserId(): Promise<string> {
  const session = await ensureSession();
  return session.user.id;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAnonymous = !session || Boolean((session.user as { is_anonymous?: boolean }).is_anonymous) || !session.user.email;
  return { session, ready, isAnonymous, email: session?.user.email ?? null };
}

/** Attach an email + password to the current (anonymous) account. Farm data is kept. */
export async function upgradeAccount(email: string, password: string, name: string) {
  await ensureSession();
  const { data, error } = await supabase.auth.updateUser({ email, password, data: { name } });
  if (error) throw new Error(error.message);
  // If email confirmation is on, the address stays pending until the link is opened.
  const pendingEmail = (data.user as { new_email?: string } | null)?.new_email;
  return { needsConfirmation: Boolean(pendingEmail) || !data.user?.email_confirmed_at };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(error.message);
}

/** Signs out and immediately starts a fresh anonymous session so the app keeps working. */
export async function signOut() {
  await supabase.auth.signOut();
  await ensureSession();
}
