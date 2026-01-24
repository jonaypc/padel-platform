# Informe de Desarrollo - Fase 2: Social & Engagement

**Versión:** 2.0 (Post-Roadmap V1)
**Estado:** Completado 🚀
**Objetivo:** Transformar la utilidad de registro de partidos en una red social activa.

---

## 1. Resumen de Funcionalidades
Se han implementado 4 pilares principales sobre la aplicación existente:

### A. Interacción Social (Feed 2.0)
- **Likes**: Botón de "Me gusta" ❤️ con actualización optimista.
- **Comentarios**: Hilo de comentarios 💬 desplegable por partido.
- **Filtros**: Pestañas para ver actividad "Global" o solo de "Siguiendo" (Amigos).

### B. Conexiones (Networking)
- **Sistema de Seguidores**: Funcionalidad Follow/Unfollow.
- **Perfil Público**: Botón de seguir y contadores (Seguidores/Siguiendo).
- **Notificaciones**: Sistema en tiempo real (DB push) para likes, comentarios y nuevos seguidores.

### C. Competición (Rankings)
- **Ranking Global**: Tabla de clasificación automática accesible desde `/ranking`.
- **Buscador**: Búsqueda de jugadores por nombre/username en tiempo real.
- **Cálculo de Stats**: Victorias y Win Rate calculados dinámicamente.

### D. Gamificación (Engagement)
- **Insignias (Badges)**: Sistema de logros automático.
  - *Debutante, Entusiasta, Veterano* (Volumen de partidos).
  - *Dominante, Invencible* (Rendimiento).
  - *Famoso* (Social).
- Visualización de medallas en el perfil público.

---

## 2. Cambios en Base de Datos (Supabase)

### Nuevas Tablas
1.  **`match_likes`**
    - `match_id` (FK), `user_id` (FK).
    - Unique constraint: Un like por usuario/partido.
2.  **`match_comments`**
    - `match_id` (FK), `user_id` (FK), `content` (text).
3.  **`follows`**
    - `follower_id` (FK), `following_id` (FK).
    - Unique constraint: No duplicados.
4.  **`notifications`**
    - `user_id` (receptor), `actor_id` (emisor), `type` (like/comment/follow), `resource_id`.

### Automatización (Triggers SQL)
Se han creado triggers para generar notificaciones automáticamente sin intervención del backend/frontend:
- `on_match_like` -> Crea notificación tipo 'like'.
- `on_match_comment` -> Crea notificación tipo 'comment'.
- `on_new_follow` -> Crea notificación tipo 'follow'.

---

## 3. Arquitectura Frontend (Next.js App Router)

### Nuevas Rutas
- `/notifications/page.tsx`: Listado de actividad reciente.
- `/ranking/page.tsx`: Tabla de clasificación y buscador.

### Componentes Clave Modificados
- **`FeedMatchCard.tsx`**: Refactorizado para incluir lógica de interacción (likes/comentarios) y visualización limpia.
- **`AppHeader.tsx`**: Añadido icono de campana 🔔 con indicador de "no leídos".
- **`PublicPlayerPage`** (`/players/[username]`): Añadida lógica de "Seguir", contadores sociales y visualización de Badges.

### Librerías/Utilidades
- **`src/lib/badges.ts`**: Definición de insignias y lógica de asignación `.calculateBadges()`.

---

## 4. Notas para el Equipo de Desarrollo

### Despliegue
1.  **Ejecutar SQL**: Asegurarse de que el script SQL de creación de tablas y triggers se ha ejecutado en el entorno de producción (Supabase SQL Editor). La tabla `follows` y `notifications` son críticas.
2.  **Variables de Entorno**: No se requieren variables nuevas (usa la conexión Supabase existente).

### Lógica Cliente vs Servidor
- **Ranking e Insignias**: Actualmente se calculan en el **Cliente** (Frontend) tras obtener los datos.
  - *Ventaja*: Rápido desarrollo para MVP.
  - *Escalabilidad*: Para >10,000 usuarios, evaluar mover el cálculo del Ranking a una **Vista Materializada** en SQL.

---

## 5. Script SQL de Referencia (Esquema simplificado)
```sql
-- Tablas necesarias
CREATE TABLE public.match_likes (...);
CREATE TABLE public.match_comments (...);
CREATE TABLE public.follows (...);
CREATE TABLE public.notifications (...);

-- Triggers (Esenciales para notificaciones)
CREATE TRIGGER on_match_like ...;
CREATE TRIGGER on_match_comment ...;
CREATE TRIGGER on_new_follow ...;
```
