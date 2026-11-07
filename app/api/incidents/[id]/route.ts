import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/workflow/auth';
import { getIncidentDetail } from '@/lib/workflow/transition';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const detail = await getIncidentDetail(id);
    return NextResponse.json(detail);
  } catch (err) {
    return handleApiError(err);
  }
}

