import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIVATE_EMAIL = 'keomatiago@gmail.com';
const PRIVATE_PIN = '834589';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();
    const pin = String(body?.pin ?? '').replace(/\D/g, '');

    if (email !== PRIVATE_EMAIL || pin !== PRIVATE_PIN) {
      return new Response(JSON.stringify({ ok: false, message: 'Credenciais privadas inválidas' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, message: 'Configuração do backend incompleta' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const canonicalPassword = `DommoSupremo#${pin}#2026`;

    const {
      data: { users },
      error: listError,
    } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) throw listError;

    const existingUser = users.find((u) => (u.email ?? '').toLowerCase() === email);

    if (existingUser?.id) {
      const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password: canonicalPassword,
        email_confirm: true,
      });

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ ok: true, action: 'updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: canonicalPassword,
      email_confirm: true,
      user_metadata: { private_access: true },
    });

    if (createError) throw createError;

    return new Response(JSON.stringify({ ok: true, action: 'created' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return new Response(JSON.stringify({ ok: false, message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
