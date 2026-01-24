"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PublicProfilesMap = Record<string, string | null>;

type PublicProfileRow = {
  username: string;
  display_name: string | null;
};

export function normalizeDisplayName(value: string) {
  // trim + lowercase + colapsar espacios múltiples
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Devuelve un mapa:
 * - key: display_name normalizado
 * - value: username (si único) o null (si duplicado)
 */
export async function fetchPublicProfilesMap(): Promise<PublicProfilesMap> {
  const { data } = await supabase.from("public_profiles").select("username, display_name");

  const map: PublicProfilesMap = {};

  for (const p of (data ?? []) as PublicProfileRow[]) {
    if (!p.display_name || !p.username) continue;

    const key = normalizeDisplayName(p.display_name);
    if (!key) continue;

    // Si existe otro username distinto => duplicado => null (no linkar)
    if (map[key] && map[key] !== p.username) {
      map[key] = null;
      continue;
    }

    // Si ya estaba marcado como duplicado, se queda como null
    if (map[key] === null) continue;

    map[key] = p.username;
  }

  return map;
}

export function resolvePublicUsername(
  displayName: string | null,
  map: PublicProfilesMap
): string | null {
  const raw = (displayName ?? "").trim();
  if (!raw) return null;

  const key = normalizeDisplayName(raw);
  const username = map[key];

  // undefined (no existe) o null (duplicado) => no link
  if (!username) return null;

  return username.toLowerCase();
}

export function usePublicProfilesMap() {
  const [map, setMap] = useState<PublicProfilesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      const m = await fetchPublicProfilesMap();
      if (!alive) return;
      setMap(m);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return { map, loading };
}
