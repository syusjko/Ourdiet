import { supabase } from '../lib/supabase';

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

export async function getTokens(userId) {
    if (!userId) return 3;
    const today = getTodayDate();
    
    // Fetch user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_tokens, last_token_reset')
        .eq('id', userId)
        .single();
        
    if (!profile) return 3; // Fallback
    
    // Reset tokens if last_token_reset is not today
    if (profile.last_token_reset !== today) {
        await supabase
            .from('profiles')
            .update({ ai_tokens: 3, last_token_reset: today })
            .eq('id', userId);
        return 3;
    }
    
    return profile.ai_tokens;
}

export async function useTokens(userId) {
    if (!userId) return false;
    
    const tokens = await getTokens(userId);
    if (tokens > 0) {
        // Decrease token
        await supabase
            .from('profiles')
            .update({ ai_tokens: tokens - 1 })
            .eq('id', userId);
            
        // Trigger generic event so UI updates
        window.dispatchEvent(new Event('tokens_updated'));
        return true;
    }
    return false;
}

