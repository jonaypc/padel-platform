"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@padel/core';
import { createBrowserClient } from '../index';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createBrowserClient();

    useEffect(() => {
        let isMounted = true;

        // 1. Obtener sesión inicial
        const getInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!isMounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                // Ignore AbortError
                if (!isMounted) return;
                console.error('Auth error:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        getInitialSession();

        // 2. Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }

            if (isMounted) setIsLoading(false);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setProfile(data as Profile);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
