// Tassel — advisor client
// Calls the `advisor-chat` Supabase Edge Function, which holds the Claude
// API key on the server. The app never sees that key. Each phone has a
// Supabase session (anonymous by default) so the function can rate-limit per device.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { ensureSession } from './session';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type ScanContext = { crop?: string; disease?: string; confidence?: number };

/** The server accepts at most 20 turns and the first must be from the user. */
function trimHistory(history: ChatTurn[]): ChatTurn[] {
  let turns = history.slice(-20);
  while (turns.length && turns[0].role !== 'user') turns = turns.slice(1);
  return turns;
}

export async function askAdvisor(history: ChatTurn[], scan?: ScanContext): Promise<string> {
  await ensureSession();

  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>(
    'advisor-chat',
    { body: { messages: trimHistory(history), context: scan } }
  );

  if (error) {
    // The function returns a friendly { error } message for known problems.
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) throw new Error(body.error);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error('The AI advisor is unavailable right now. Check your internet and try again.');
  }

  if (!data?.reply) {
    throw new Error(data?.error || 'The AI advisor did not reply. Please try again.');
  }
  return data.reply;
}

/** First message sent when the chat opens from a scan result (shown to the farmer as a summary). */
export function detectionPrompt(crop: string, disease: string, confidence?: number): string {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return `I am treating ${disease} on my ${crop}. What are the most important steps, what mistakes should I avoid, and how do I know the treatment is working?`;
  }
  const pct = Math.round(confidence * 100);
  if (disease === 'Healthy') {
    return `My ${crop} leaf was scanned and looks healthy (${pct}% confidence). What should I do to keep this crop healthy this season?`;
  }
  return `Tassel detected ${disease} on my ${crop} with ${pct}% confidence. Please explain: 1) what this disease is, 2) what I should do today, 3) treatment options, starting with low-cost cultural and organic methods, then registered chemical options, 4) how to prevent it next season.`;
}
