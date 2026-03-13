import { createClient } from '@supabase/supabase-js';

// Load keys explicitly as this is a Node script
const supabaseUrl = 'https://vimcjabjxkbwbmzegwei.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbWNqYWJqeGtid2JtemVnd2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTg3MjYsImV4cCI6MjA4MDQzNDcyNn0.YDmCr6cwindy0nc0GOhaS6a9kY6nXjdFcQ4Cua79zsU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createDevUser() {
    const { data, error } = await supabase.auth.signUp({
        email: 'dev@ourdiet.com',
        password: 'password123',
        options: {
            data: {
                full_name: 'Developer Mode'
            }
        }
    });

    if (error) {
        console.error('Error details:', error);
    } else {
        console.log('User created successfully:', data.user?.email);
    }
}

createDevUser();
