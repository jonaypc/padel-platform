import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPERADMIN_EMAIL = "jonaypc@gmail.com";

export async function POST(request: NextRequest) {
    try {
        const { email, password, userEmail } = await request.json();

        // Verificar que es el superadmin quien hace la petición
        if (userEmail !== SUPERADMIN_EMAIL) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Crear cliente admin con service_role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Crear usuario
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Confirma el email automáticamente
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Actualizar el perfil con rol club_admin
        await supabaseAdmin
            .from('profiles')
            .update({ role: 'club_admin' })
            .eq('id', data.user.id);

        return NextResponse.json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email
            }
        });
    } catch (err) {
        console.error('Error creating user:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
