# Guía de Despliegue en Vercel (Paso a Paso)

Esta guía te ayudará a subir tu plataforma (Player App y Club App) a Vercel y conectarla con Supabase.

## 1. Preparación en GitHub
Asegúrate de que todo tu código está subido a tu repositorio de GitHub.

```bash
git add .
git commit -m "Preparado para deploy"
git push origin main
```

## 2. Configurar "Player App" en Vercel

1.  Ve a [vercel.com/new](https://vercel.com/new).
2.  Selecciona tu repositorio **`padel-platform`** y haz clic en **Import**.
3.  Configura el proyecto así:

| Campo | Valor |
| :--- | :--- |
| **Project Name** | `padel-player` (o el nombre que quieras) |
| **Framework Preset** | `Next.js` (detectado automáticamente) |
| **Root Directory** | Haz clic en `Edit` y selecciona **`apps/player`** |
| **Build Command** | Déjalo vacío (default) o pon `cd ../.. && npx turbo run build --filter=@padel/player` |
| **Install Command** | `pnpm install` (Vercel lo suele detectar) |

4.  **Environment Variables** (Despliega la sección):
    Copia las variables de tu archivo `.env.local`:
    *   `NEXT_PUBLIC_SUPABASE_URL` : `tu_url_de_supabase`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` : `tu_clave_anon_de_supabase`

5.  Haz clic en **Deploy**.

## 3. Configurar "Club App" en Vercel

1.  Vuelve al Dashboard de Vercel y haz clic en **Add New... > Project**.
2.  Vuelve a importar **EL MISMO repositorio** (`padel-platform`).
3.  Configura este segundo proyecto:

| Campo | Valor |
| :--- | :--- |
| **Project Name** | `padel-club` |
| **Root Directory** | Haz clic en `Edit` y selecciona **`apps/club`** |
| **Environment Variables** | Añade las mismas variables de Supabase que en la app anterior. |

4.  Haz clic en **Deploy**.

## 4. Configuración Final en Supabase (Auth)

Para que el login funcione en producción, necesitas decirle a Supabase que confíe en tus nuevos dominios de Vercel.

1.  Ve a tu **Supabase Dashboard**.
2.  Entra en **Authentication** -> **URL Configuration**.
3.  En **Site URL**, pon la URL de tu app de jugadores (ej: `https://padel-player.vercel.app`).
4.  En **Redirect URLs**, añade:
    *   `https://padel-player.vercel.app/**`
    *   `https://padel-club.vercel.app/**`  (La URL que te haya dado Vercel para la app del club)

## 5. Verificar

1.  Abre tu app de Player en el móvil o navegador.
2.  Intenta hacer Login.
3.  Verifica que el Ranking y el Perfil cargan los datos.

---

> **Nota sobre Base de Datos:**
> Tu base de datos (Supabase) ya está en la nube, así que no tienes que "subir" nada de SQL. Vercel se conectará automáticamente a la misma base de datos que usas en desarrollo (a menos que crees un proyecto de Supabase separado para producción, pero para empezar usa el mismo).
