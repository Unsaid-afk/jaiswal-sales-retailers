import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, rate } = body;

        // Validate inputs
        if (!category || rate === undefined) {
            return NextResponse.json({ error: "Missing required fields: category, rate" }, { status: 400 });
        }

        const numericRate = parseFloat(rate);
        if (isNaN(numericRate)) {
            return NextResponse.json({ error: "Rate must be a number" }, { status: 400 });
        }

        // Perform bulk update
        const { data, error } = await supabase
            .from('items')
            .update({ rate: numericRate })
            .eq('category', category)
            .select();

        if (error) {
            console.error('Error bulk updating items detailed:', JSON.stringify(error, null, 2));
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: data?.length || 0, data });
    } catch (e) {
        console.error("Bulk update exception:", e);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
