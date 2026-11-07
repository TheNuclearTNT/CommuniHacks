import { NextResponse } from 'next/server';
import type { SupervisorReviewInput } from '@/lib/types';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import { transition } from '@/lib/workflow/transition';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const body = (await req.json().catch(() => null)) as SupervisorReviewInput;
    const detail = await transition(id, 'review', me, body);
    return NextResponse.json(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

