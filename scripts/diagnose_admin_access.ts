
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oixlimcijivuvmotwivg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peGxpbWNpaml2dXZtb3R3aXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDA0MjQsImV4cCI6MjA4NDQ3NjQyNH0.HtSSdnfHa6iqOEnHKa1Q_DtkgcpB60Xh9ElAurXprlg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('URL:', SUPABASE_URL);

    // 1. Test Public Access to Clubs (should work for ANON)
    console.log('\n1. Testing Public Access to Clubs...');
    const { data: clubs, error: clubsError } = await supabase
        .from('clubs')
        .select('id, name');

    if (clubsError) {
        console.error('❌ Error fetching clubs:', clubsError.message);
    } else {
        console.log(`✅ Success. Found ${clubs?.length} clubs.`);
        if (clubs && clubs.length > 0) {
            console.log('Sample:', clubs[0]);
        } else {
            console.log('⚠️ Clubs table is empty.');
        }
    }

    // 2. Test Access to Club Members (RLS: usually requires auth, but check if any public policy leaked)
    console.log('\n2. Testing Access to Club Members (as Anon)...');
    const { data: members, error: membersError } = await supabase
        .from('club_members')
        .select('count');

    if (membersError) {
        console.log('ℹ️ Expected Error (RLS blocking non-auth):', membersError.message);
    } else {
        console.log(`⚠️ Surprise: Anon could read club_members! Count: ${members?.length}`);
    }

    console.log('--- DIAGNOSTIC END ---');
}

diagnose().catch(err => console.error('Script Error:', err));
