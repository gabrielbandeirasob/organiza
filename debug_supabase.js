
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvqjhwiuoqihujfodcgd.supabase.co';
// The key found in .env.local
const SUPABASE_KEY = 'sb_publishable_3Kpuqe-v7TpgDv295wyjHg_pEXDo3yI';

console.log('Initializing Supabase Client...');
console.log('URL:', SUPABASE_URL);
console.log('KEY:', SUPABASE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    try {
        console.log('\n--- 1. Testing Default Connection (Read) ---');
        // Try to read generic info or just a table (should fail RLS or 401 if key bad)
        const { data, error } = await supabase.from('transactions').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('READ ERROR:', error.message, error.code, error.details);
        } else {
            console.log('READ SUCCESS (Public/Anon access worked, count):', data);
        }

        console.log('\n--- 2. Testing Authentication (Sign Up) ---');
        const email = `test_user_${Date.now()}@gmail.com`;
        const password = 'password123';

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            console.error('AUTH ERROR:', authError.message);
            return; // Stop if auth fails
        }

        console.log('AUTH SUCCESS. User ID:', authData.user ? authData.user.id : 'No user returned');

        if (authData.user) {
            console.log('\n--- 3. Testing Insert (RLS) ---');
            const { data: insertData, error: insertError } = await supabase
                .from('transactions')
                .insert({
                    description: 'Debug Transaction',
                    amount: 100,
                    type: 'expense',
                    category: 'Outro',
                    date: new Date().toISOString().split('T')[0],
                    user_id: authData.user.id
                })
                .select();

            if (insertError) {
                console.error('INSERT ERROR:', insertError.message, insertError.details);
            } else {
                console.log('INSERT SUCCESS:', insertData);
            }
        }

    } catch (err) {
        console.error('SCRIPT EXCEPTION:', err);
    }
}

test();
