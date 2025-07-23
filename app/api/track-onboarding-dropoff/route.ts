import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { table, id, data } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    await supabase
      .from(table)
      .update(data)
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
  }
} 