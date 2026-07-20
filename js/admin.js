// ============================================================
// ELANIIN DESIGN STUDIO — ADMIN MODULE
// Phase 3: Admin dashboard logic
// ============================================================

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth('admin');
  if (!session) return;
  document.getElementById('user-email').textContent = session.profile.email;
  loadTab('prompts');
});

// ---- TAB META ----
const TAB_META = {
  prompts:  { title: 'Prompts',                 subtitle: 'Gestiona los prompts del sistema por tipo de entregable.' },
  mcp:      { title: 'MCP',                      subtitle: 'Configura la URL del servidor EDS-MCP.' },
  archivos: { title: 'Archivos de referencia',   subtitle: 'Almacena los archivos HTML de referencia para el sistema de IA.' },
  usuarios: { title: 'Usuarios',                 subtitle: 'Gestiona los usuarios con acceso al Design Studio.' },
};

// ---- TAB SWITCHING ----
function loadTab(tab) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.tab === tab);
  });

  // Update topbar
  document.getElementById('page-title').textContent    = TAB_META[tab].title;
  document.getElementById('page-subtitle').textContent = TAB_META[tab].subtitle;

  // Show correct panel
  document.querySelectorAll('.tab-panel').forEach(function(el) {
    el.classList.toggle('hidden', el.dataset.panel !== tab);
  });

  // Load data
  if (tab === 'prompts')  loadPrompts();
  if (tab === 'mcp')      loadMcp();
  if (tab === 'archivos') loadArchivos();
  if (tab === 'usuarios') loadUsers();
}

// ============================================================
// CONFIG CRUD
// ============================================================
async function getConfig(key) {
  const { data } = await supabaseClient
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value || '';
}

async function setConfig(key, value) {
  const { error } = await supabaseClient
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// ============================================================
// TAB 1 — PROMPTS
// ============================================================
const PROMPT_KEYS = {
  websites: 'prompt_websites',
  reports:  'prompt_reports',
  saas:     'prompt_saas',
  deck:     'prompt_deck',
};

var activePromptTab = 'websites';

function loadPrompts() {
  switchPromptTab(activePromptTab);
}

async function switchPromptTab(tab) {
  activePromptTab = tab;

  document.querySelectorAll('.prompt-tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.prompt === tab);
  });
  document.querySelectorAll('.prompt-panel').forEach(function(panel) {
    panel.classList.toggle('hidden', panel.dataset.prompt !== tab);
  });

  const key      = PROMPT_KEYS[tab];
  const textarea = document.getElementById('textarea-' + tab);
  const btn      = document.getElementById('save-prompt-' + tab);

  textarea.disabled = true;
  btn.disabled      = true;

  try {
    textarea.value    = await getConfig(key);
  } catch (_) {
    textarea.value = '';
  } finally {
    textarea.disabled = false;
    btn.disabled      = false;
    textarea.focus();
  }
}

async function savePrompt(tab) {
  var key   = PROMPT_KEYS[tab];
  var value = document.getElementById('textarea-' + tab).value;
  var btn   = document.getElementById('save-prompt-' + tab);

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    await setConfig(key, value);
    showToast('Prompt guardado correctamente');
  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar prompt';
  }
}

// ============================================================
// TAB 2 — MCP
// ============================================================
async function loadMcp() {
  var url = await getConfig('mcp_url');
  document.getElementById('mcp-url-input').value = url;
  updateMcpStatus(url);
}

function updateMcpStatus(url) {
  var badge = document.getElementById('mcp-status');
  if (url && url.trim()) {
    badge.textContent = 'URL configurada';
    badge.className   = 'status-badge status-badge--success';
  } else {
    badge.textContent = 'Sin configurar';
    badge.className   = 'status-badge status-badge--neutral';
  }
}

async function saveMcp() {
  var url = document.getElementById('mcp-url-input').value.trim();
  var btn = document.getElementById('save-mcp-btn');

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    await setConfig('mcp_url', url);
    updateMcpStatus(url);
    showToast('URL del servidor MCP guardada');
  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar URL';
  }
}

// ============================================================
// TAB 3 — ARCHIVOS DE REFERENCIA
// ============================================================
async function loadArchivos() {
  try {
    var deck = await getConfig('html_reference_deck');
    var ds   = await getConfig('html_reference_design_system');

    var deckEl = document.getElementById('textarea-ref-deck');
    var dsEl   = document.getElementById('textarea-ref-ds');

    deckEl.value = deck;
    dsEl.value   = ds;

    updateCharCount('ref-deck', deck.length);
    updateCharCount('ref-ds', ds.length);
  } catch (e) {
    showToast('Error al cargar archivos: ' + e.message, 'error');
  }
}

function updateCharCount(id, count) {
  var el = document.getElementById('count-' + id);
  if (el) el.textContent = Number(count).toLocaleString('es') + ' caracteres';
}

async function saveArchivo(id, key) {
  var value = document.getElementById('textarea-' + id).value;
  var btn   = document.getElementById('save-' + id + '-btn');

  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    await setConfig(key, value);
    showToast('Archivo guardado correctamente');
  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar';
  }
}

// ============================================================
// TAB 4 — USUARIOS
// ============================================================
// NOTE: The current RLS policy (profiles_select_own) only allows users
// to see their own row. To enable admin listing, add this policy in Supabase:
//   create policy "profiles_admin_read_all" on profiles for select
//   using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

async function loadUsers() {
  var tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="4" class="table-loading">Cargando usuarios...</td></tr>';

  try {
    var res = await supabaseClient.from('profiles').select('*').order('created_at');
    if (res.error) throw res.error;
    renderUsers(res.data || []);
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-error">Error al cargar: ' + escHtml(e.message) + '</td></tr>';
  }
}

function renderUsers(users) {
  var tbody = document.getElementById('users-tbody');

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay usuarios registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(function(u) {
    return [
      '<tr id="row-' + u.id + '">',
        '<td class="td-email">' + escHtml(u.email) + '</td>',
        '<td><span class="role-badge role-badge--' + u.role + '">' + (u.role === 'admin' ? 'Admin' : 'Usuario') + '</span></td>',
        '<td class="td-date">' + formatDate(u.created_at) + '</td>',
        '<td><div class="action-cell" id="actions-' + u.id + '">',
          '<button class="btn-danger-sm" onclick="confirmDelete(\'' + u.id + '\')">Eliminar</button>',
        '</div></td>',
      '</tr>',
    ].join('');
  }).join('');
}

function confirmDelete(userId) {
  var cell = document.getElementById('actions-' + userId);
  cell.innerHTML = [
    '<span class="confirm-text">¿Confirmar eliminación?</span>',
    '<button class="btn-danger-sm" onclick="deleteUser(\'' + userId + '\')">Sí</button>',
    '<button class="btn-ghost-sm" onclick="loadUsers()">No</button>',
  ].join('');
}

async function deleteUser(userId) {
  try {
    var res = await supabaseClient.from('profiles').delete().eq('id', userId);
    if (res.error) throw res.error;
    var row = document.getElementById('row-' + userId);
    if (row) row.remove();
    showToast('Usuario eliminado');
  } catch (e) {
    showToast('Error al eliminar: ' + e.message, 'error');
    loadUsers();
  }
}

// NOTE: supabaseClient.auth.signUp() while logged in as admin will log out the admin
// in Supabase JS v2. For production, implement a /api/create-user serverless
// function that uses the service role key to call auth.admin.createUser().
async function createUser() {
  var email    = document.getElementById('new-user-email').value.trim();
  var password = document.getElementById('new-user-password').value;
  var role     = document.getElementById('new-user-role').value;
  var msgEl    = document.getElementById('create-user-msg');
  var btn      = document.getElementById('create-user-btn');

  msgEl.textContent = '';
  msgEl.className   = 'create-msg';

  if (!email || !password) {
    msgEl.textContent = 'El email y la contraseña son obligatorios.';
    msgEl.className   = 'create-msg create-msg--error';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creando...';

  try {
    var res = await supabaseClient.auth.signUp({ email, password });
    if (res.error) throw res.error;

    if (res.data.user && role === 'admin') {
      await supabaseClient.from('profiles').update({ role: 'admin' }).eq('id', res.data.user.id);
    }

    document.getElementById('new-user-email').value    = '';
    document.getElementById('new-user-password').value = '';

    msgEl.textContent = 'Usuario creado correctamente.';
    msgEl.className   = 'create-msg create-msg--success';

    await loadUsers();
  } catch (e) {
    msgEl.textContent = 'Error: ' + e.message;
    msgEl.className   = 'create-msg create-msg--error';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Crear usuario';
  }
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
function toggleAdminSidebar() {
  var collapsed = document.documentElement.classList.toggle('admin-sidebar--collapsed');
  localStorage.setItem('admin_sidebar_collapsed', collapsed ? '1' : '0');
  var icon = document.getElementById('admin-sidebar-toggle-icon');
  if (icon) icon.className = collapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
}

// Sync icon on load
document.addEventListener('DOMContentLoaded', function() {
  if (document.documentElement.classList.contains('admin-sidebar--collapsed')) {
    var icon = document.getElementById('admin-sidebar-toggle-icon');
    if (icon) icon.className = 'ti ti-chevron-right';
  }
});

// ============================================================
// TOAST
// ============================================================
function showToast(message, type) {
  type = type || 'success';
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = 'toast toast--' + type + ' toast--visible';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.className = 'toast';
  }, 3500);
}

// ============================================================
// UTILS
// ============================================================
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
