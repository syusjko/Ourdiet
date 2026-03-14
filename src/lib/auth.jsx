import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(true);

    const fetchProfile = async (userId) => {
        if (!userId) { setProfile(null); setProfileLoading(false); return; }
        setProfileLoading(true);
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        setProfile(data || null);
        setProfileLoading(false);
    };

    useEffect(() => {
        // Fetch current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user || null;
            setUser(u);
            setLoading(false);
            if (u) fetchProfile(u.id);
            else setProfileLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const u = session?.user || null;
                setUser(u);
                if (u) fetchProfile(u.id);
                else { setProfile(null); setProfileLoading(false); }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, profileLoading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

