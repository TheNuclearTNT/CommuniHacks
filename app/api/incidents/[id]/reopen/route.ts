import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import { transition, type ReopenTransitionInput } from '@/lib/workflow/transition';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const body = (await req.json().catch(() => ({}))) as ReopenTransitionInput;
    const detail = await transition(id, 'reopen', me, body);
    return NextResponse.json(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

