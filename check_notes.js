
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvqjhwiuoqihujfodcgd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cWpod2l1b3FpaHVqZm9kY2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMzEyMzQsImV4cCI6MjA4NTYwNzIzNH0.HG3h4Q6eIVS0M-TTVsmI5REO5T-y6o-3lTNtzzsx9HY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect(tableName) {
    try {
        console.log(`Inspecting table: ${tableName}...`);
        // This is a trick to get column names if RPC isn't available
        const { data, error } = await supabase.from(tableName).select('*').limit(0);
        if (error) {
            console.log(`[${tableName}] ERROR:`, error.message);
        } else {
            console.log(`[${tableName}] COLUMNS:`, Object.keys(data[0] || {}).length ? Object.keys(data[0]) : 'No data to infer columns');
        }
    } catch (e) {
        console.log(`[${tableName}] EXCEPTION:`, e.message);
    }
}

async function runAll() {
    await inspect('note_folders');
    await inspect('notes');
    process.exit(0);
}

runAll().catch(e => {
    console.error('FAILED:', e);
    process.exit(1);
});
