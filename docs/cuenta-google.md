# Activar «Continuar con Google» (pendiente de María)

El código ya está publicado (app/js/cloud/, tools/supabase.sql) y el botón está oculto mientras app/js/cloud/config.js esté vacío.

## 0. Antes
- El dominio sfumato.dibulios.com debe responder: CNAME sfumato → sfumato-arte.onrender.com en Cloudflare, sin proxy.
- Pausar «finanzas» en Supabase (el plan gratuito solo admite 2 proyectos activos): https://supabase.com/dashboard/project/nqlrlzidiamqunppbazq/settings/general → «Pause project». Se puede reactivar.
- Después, un agente crea «sfumato» en eu-central-1 (org yjawiktqnzydhjrasmhv), aplica tools/supabase.sql y rellena config.js con la URL y la clave anónima.

## Pasos de Google (sustituye <ref> por el id del proyecto nuevo)
1. Crear el proyecto: https://console.cloud.google.com/projectcreate, nombre «Sfumato» → Crear.
2. Pantalla de consentimiento: https://console.cloud.google.com/auth/branding → Empezar. Nombre «Sfumato», correo de asistencia y de contacto: el de María, público «Externo» → Crear.
3. Marca: en la misma página, página principal https://sfumato.dibulios.com, privacidad https://sfumato.dibulios.com/privacidad.html, dominio autorizado dibulios.com → Guardar.
4. Publicar: https://console.cloud.google.com/auth/audience → «Publicar aplicación».
5. ID de cliente: https://console.cloud.google.com/auth/clients/create → Aplicación web «Sfumato web». Origen https://sfumato.dibulios.com. Redirección https://<ref>.supabase.co/auth/v1/callback → Crear (no pegar el ID ni el secreto en el chat).
6. Supabase: https://supabase.com/dashboard/project/<ref>/auth/providers → Google → activar, pegar Client ID y Client Secret → Save.
7. URLs: https://supabase.com/dashboard/project/<ref>/auth/url-configuration → Site URL https://sfumato.dibulios.com; Redirect URLs https://sfumato.dibulios.com/** → Save.
8. Probar: Perfil → Ajustes → «Continuar con Google», en el móvil y en la tablet.

Nota: la página de privacidad no lleva email de contacto; para el RGPD quizá haga falta añadir uno (decisión de María).
