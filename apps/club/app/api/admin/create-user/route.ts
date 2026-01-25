import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPERADMIN_EMAIL = "jonaypc@gmail.com";

export async function POST(request: NextRequest) {
    try {
        const { email, password, clubId, userEmail } = await request.json();

        // Verificar que el usuario que hace la petición es superadmin
        if (userEmail !== SUPERADMIN_EMAIL) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Validar datos
        if (!email || !password || !clubId) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
        }

        // Crear cliente con service role key
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Crear el usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Auto-confirmar email
        });

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Crear/actualizar perfil en la tabla profiles
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                display_name: email.split('@')[0],
                role: 'club_admin'
            }, { onConflict: 'id' });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // No fallar por esto, el trigger debería crearlo
        }

        // 3. Asignar al club
        const { error: memberError } = await supabaseAdmin
            .from('club_members')
            .insert({
                club_id: clubId,
                user_id: userId,
                role: 'admin'
            });

        if (memberError) {
            return NextResponse.json({ error: 'Usuario creado pero error al asignar al club: ' + memberError.message }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            userId,
            message: 'Usuario creado y asignado al club correctamente'
        });

    } catch (error: unknown) {
        console.error('Error creating user:', error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
