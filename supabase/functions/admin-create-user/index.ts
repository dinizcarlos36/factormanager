// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-base-url, x-api-key',
};

export default async function(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    const body = await req.json();
    const { email, password, full_name, role, phone } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try to get injected credentials or use defaults
    const baseUrl = req.headers.get('x-base-url') || (typeof Deno !== 'undefined' && Deno.env.get('BASE_URL')) || '';
    const apiKey = req.headers.get('x-api-key') || (typeof Deno !== 'undefined' && Deno.env.get('API_KEY')) || '';

    if (!baseUrl || !apiKey) {
      console.error('Missing BASE_URL or API_KEY');
      return new Response(JSON.stringify({ 
        error: 'Backend configuration error: service credentials missing.',
        debug: { hasBaseUrl: !!baseUrl, hasApiKey: !!apiKey }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Corrected endpoint path based on REST docs
    const authEndpoint = `${baseUrl}/api/auth/users`;
    
    console.log(`Creating user at: ${authEndpoint}`);

    // Step 1: Create auth user via admin API with email pre-verified
    const signupRes = await fetch(authEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // Must be an admin key
      },
      body: JSON.stringify({
        email,
        password,
        name: full_name,
        emailVerified: true // Set verified to skip email confirmation
      }),
    });

    if (!signupRes.ok) {
      const errText = await signupRes.text();
      let errorDetail = errText;
      try {
        const errJson = JSON.parse(errText);
        errorDetail = errJson.message || errJson.error || errText;
      } catch (e) {}
      
      return new Response(JSON.stringify({ error: `Auth user creation failed: ${errorDetail}` }), {
        status: signupRes.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const signupData = await signupRes.json();
    const userId = signupData.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID not returned from auth API', debug: signupData }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Create user_profile entry
    const profileRes = await fetch(`${baseUrl}/rest/v1/user_profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify([{
        user_id: userId,
        full_name,
        role,
        phone: phone || null,
      }]),
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      return new Response(JSON.stringify({ error: `Profile creation failed: ${errText}`, userId }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const profileData = await profileRes.json();

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: userId, email, full_name, role },
      profile: profileData 
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
