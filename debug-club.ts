
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/player/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: clubs, error } = await supabase
        .from('clubs')
        .select('id, name, slug, opening_hour, booking_duration, shifts');

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(clubs, null, 2));
}

main();
