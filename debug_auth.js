
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvqjhwiuoqihujfodcgd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3Kpuqe-v7TpgDv295wyjHg_pEXDo3yI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
    // Use the email shown in the screenshot or a known one
    const email = 'gabriel_1bandeira@hotmail.com';
    const password = 'password123';

    console.log(`Testing SignUp for existing email: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.log('RESULT: Error returned');
        console.log('Message:', error.message);
        console.log('Code:', error.code || 'N/A');
    } else {
        console.log('RESULT: Success (200 OK)');
        console.log('Session present?', !!data.session);
        console.log('User ID:', data.user?.id);
        console.log('User Confirmed At:', data.user?.confirmed_at);
    }
}

testAuth();
