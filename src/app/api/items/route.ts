import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('items').select('*');
  if (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  try {
    const body = await req.json();
    const { name_en, name_gu, rate } = body;

    if (!name_en || !name_gu || rate === undefined) {
      return NextResponse.json({ error: "Missing required fields: name_en, name_gu, rate" }, { status: 400 });
    }

    const { data, error } = await supabase.from('items').insert([body]).select();

    if (error) {
      console.error('Error inserting item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select();

    if (error) {
      console.error('Error updating item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const id = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) {
    console.error('Error deleting item:', error);
    const userFriendlyError = error.message.includes('foreign key constraint')
      ? 'Cannot delete this item because it is part of one or more bills. Please remove it from all bills first.'
      : 'Failed to delete item.';
    return NextResponse.json({ error: userFriendlyError, details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 