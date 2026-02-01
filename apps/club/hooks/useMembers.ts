"use client";

import { useState, useCallback } from "react";
import { createBrowserClient } from "@padel/supabase";
import type { Profile } from "@padel/core";

export interface ClubMember {
    user_id: string;
    club_id: string;
    role: "admin" | "staff";
    joined_at: string;
    profiles: Profile;
}

export function useMembers() {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<"admin" | "staff" | null>(null);
    const [clubId, setClubId] = useState<string | null>(null);

    const supabase = createBrowserClient();

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // 1. Get current user's club and role
            const { data: myMembership } = await supabase
                .from('club_members')
                .select('club_id, role')
                .eq('user_id', user.id)
                .single();

            if (!myMembership) return;

            setClubId(myMembership.club_id);
            setCurrentUserRole(myMembership.role as "admin" | "staff");

            // 2. Get all members of the club
            const { data: allMembers, error } = await supabase
                .from('club_members')
                .select('*, profiles(*)')
                .eq('club_id', myMembership.club_id)
                .order('role', { ascending: true });

            if (!error && allMembers) {
                setMembers(allMembers as unknown as ClubMember[]);
            }
        } catch (err) {
            console.error("Error fetching members:", err);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    const searchUser = async (query: string) => {
        if (!query || query.length < 3) return { data: [], error: null };

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(5);

        return { data, error };
    };

    const addMember = async (userId: string, role: "admin" | "staff") => {
        if (!clubId) return { error: { message: "No club ID found" } };

        const { error } = await supabase
            .from('club_members')
            .insert({
                club_id: clubId,
                user_id: userId,
                role: role
            });

        if (!error) {
            await fetchMembers();
        }
        return { error };
    };

    const updateMemberRole = async (userId: string, newRole: "admin" | "staff") => {
        if (!clubId) return { error: { message: "No club ID found" } };

        const { error } = await supabase
            .from('club_members')
            .update({ role: newRole })
            .eq('club_id', clubId)
            .eq('user_id', userId);

        if (!error) {
            await fetchMembers();
        }
        return { error };
    };

    const removeMember = async (userId: string) => {
        if (!clubId) return { error: { message: "No club ID found" } };

        const { error } = await supabase
            .from('club_members')
            .delete()
            .eq('club_id', clubId)
            .eq('user_id', userId);

        if (!error) {
            await fetchMembers();
        }
        return { error };
    };

    return {
        loading,
        members,
        currentUserRole,
        fetchMembers,
        searchUser,
        addMember,
        updateMemberRole,
        removeMember
    };
}
