import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPERADMIN_EMAIL = "jonaypc@gmail.com";

export async function DELETE(request: NextRequest) {
    try {
        const { clubId, userEmail } = await request.json();

        // Verificar que es el superadmin quien hace la petición
        if (userEmail !== SUPERADMIN_EMAIL) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Crear cliente admin con service_role (bypass RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Primero eliminar club_members asociados
        await supabaseAdmin
            .from('club_members')
            .delete()
            .eq('club_id', clubId);

        // Luego eliminar pistas asociadas
        await supabaseAdmin
            .from('courts')
            .delete()
            .eq('club_id', clubId);

        // Finalmente eliminar el club
        const { error } = await supabaseAdmin
            .from('clubs')
            .delete()
            .eq('id', clubId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting club:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
