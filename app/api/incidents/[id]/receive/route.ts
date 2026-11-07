import { NextResponse } from 'next/server';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import { transition } from '@/lib/workflow/transition';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const detail = await transition(id, 'receive', me);
    return NextResponse.json(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

