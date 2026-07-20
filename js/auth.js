// ============================================================
// ELANIIN DESIGN STUDIO — AUTH MODULE
// Phase 2: Supabase auth logic
// ============================================================

/**
 * Login with email + password.
 * On success, redirects based on profile role.
 */
async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profile?.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'workspace.html';
  }
}

/**
 * Register a new user.
 * Validates passwords match before calling Supabase.
 * On success, redirects to workspace.html.
 */
async function register(email, password, confirmPassword) {
  if (password !== confirmPassword) {
    throw new Error('Las contraseñas no coinciden.');
  }
  if (password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;

  window.location.href = 'workspace.html';
}

/**
 * Sign out and redirect to login.
 * Call from admin.html and workspace.html.
 */
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

/**
 * Session guard — call at the top of protected pages.
 * @param {string|null} requiredRole - 'admin' | 'user' | null (any authenticated user)
 * @returns {{ user, profile } | null}
 */
async function requireAuth(requiredRole = null) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role, email')
    .eq('id', session.user.id)
    .single();

  if (requiredRole && profile?.role !== requiredRole) {
    window.location.href = 'workspace.html';
    return null;
  }

  return { user: session.user, profile };
}
