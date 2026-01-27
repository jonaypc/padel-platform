
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oixlimcijivuvmotwivg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peGxpbWNpaml2dXZtb3R3aXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDA0MjQsImV4cCI6MjA4NDQ3NjQyNH0.HtSSdnfHa6iqOEnHKa1Q_DtkgcpB60Xh9ElAurXprlg';

async function runVerification() {
    console.log('🚀 Iniciando Verificación Automatizada de Reservas...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Crear Usuario Temporal
    const email = `test.user.${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    console.log(`\n1. Registrando usuario temporal: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Error al registrar usuario:', authError.message);
        process.exit(1);
    }

    const user = authData.user;
    if (!user) {
        console.error('❌ No se recibió objeto usuario.');
        process.exit(1);
    }
    console.log('✅ Usuario registrado y logueado:', user.id);

    // 2. Obtener un Club
    console.log('\n2. Buscando clubs disponibles...');
    const { data: clubs, error: clubsError } = await supabase
        .from('clubs')
        .select('*')
        .limit(1);

    if (clubsError) {
        console.error('❌ Error al buscar clubs:', clubsError.message);
        process.exit(1);
    }

    if (!clubs || clubs.length === 0) {
        console.error('⚠️ No hay clubs en la base de datos. No se puede verificar reserva.');
        console.log('ℹ️ Esto no es un error de código, sino falta de datos semilla.');
        process.exit(0);
    }

    const club = clubs[0];
    console.log(`✅ Club encontrado: ${club.name} (${club.id})`);

    // 3. Obtener Pistas (Court)
    console.log('\n3. Buscando pistas en el club...');
    const { data: courts, error: courtsError } = await supabase
        .from('courts')
        .select('*')
        .eq('club_id', club.id)
        .limit(1);

    if (courtsError) {
        console.error('❌ Error al buscar pistas:', courtsError.message);
        process.exit(1);
    }

    if (!courts || courts.length === 0) {
        console.error('⚠️ El club no tiene pistas activas.');
        process.exit(0);
    }

    const court = courts[0];
    console.log(`✅ Pista encontrada: ${court.name} (${court.id})`);

    // 4. Crear Reserva
    console.log('\n4. Intentando crear reserva...');

    // Calcular hora futura (mañana a las 10:00)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setMinutes(endTime.getMinutes() + 90); // 90 min duration

    const reservationPayload = {
        club_id: club.id,
        court_id: court.id,
        user_id: user.id,
        start_time: tomorrow.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        type: 'booking'
    };

    const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .insert(reservationPayload)
        .select()
        .single();

    if (resError) {
        console.error('❌ Error al crear reserva:', resError.message);
        // Si es conflicto, es bueno saberlo, pero en un test limpio no debería pasar a menos que se ejecute mucho
        process.exit(1);
    }

    console.log('✅ Reserva creada con éxito:', reservation.id);

    // 5. Verificar Doble Reserva (Debe fallar)
    console.log('\n5. Verificando integridad (Intentar reservar mismo hueco)...');

    const { error: conflictError } = await supabase
        .from('reservations')
        .insert(reservationPayload); // Mismos datos

    if (conflictError) {
        console.log('✅ Sistema rechazó la doble reserva correctamente:', conflictError.message);
    } else {
        console.error('❌ FALLO DE SEGURIDAD: El sistema permitió una doble reserva.');
        process.exit(1);
    }

    console.log('\n🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE');
    process.exit(0);
}

runVerification();
