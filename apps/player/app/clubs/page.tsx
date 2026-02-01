"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { MapPin, ChevronRight, Search } from "lucide-react";

interface Club {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  logo_url: string | null;
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadClubs() {
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('id, name, slug, location, logo_url')
          .order('name');

        if (!isMounted) return; // Component unmounted, don't update state

        if (error) {
          // Ignore AbortError (happens in dev with StrictMode)
          if (error.message?.includes('AbortError') || error.code === 'ABORT_ERR') {
            // Request aborted - normal in dev
            return;
          }
          console.error("Error Supabase al cargar clubs:", error);
        } else {
          setClubs(data || []);
        }
      } catch (err) {
        // Catch any abort errors from fetch
        if (!isMounted) return;
        console.error('Error loading clubs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadClubs();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClubs = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <AppHeader />

      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Explorar Clubs</h1>

        {/* Buscador */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Buscar club o zona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition"
          />
          <Search className="absolute left-4 top-3.5 text-gray-500" size={20} />
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClubs.length > 0 ? (
              filteredClubs.map(club => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.slug}`}
                  className="block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-green-500/50 transition group"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl overflow-hidden">
                        {club.logo_url ? (
                          <Image src={club.logo_url} alt={club.name} width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <span>🏟️</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-green-400 transition">{club.name}</h3>
                        {club.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <MapPin size={12} />
                            <span>{club.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="text-gray-600 group-hover:text-green-500 transition" size={20} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-gray-400">No se encontraron clubs</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
