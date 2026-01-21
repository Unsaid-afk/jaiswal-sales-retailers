
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Testing connection to:", supabaseUrl);

    const { data: vendors, error: vError } = await supabase.from('vendors').select('*').limit(5);
    if (vError) {
        console.error("Error fetching vendors:", vError);
    } else {
        console.log(`Vendors found: ${vendors.length}`);
        if (vendors.length > 0) console.log(vendors[0]);
    }

    const { data: items, error: iError } = await supabase.from('items').select('*').limit(5);
    if (iError) {
        console.error("Error fetching items:", iError);
    } else {
        console.log(`Items found: ${items.length}`);
    }
}

testFetch();
