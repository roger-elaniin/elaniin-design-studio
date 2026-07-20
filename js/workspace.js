// ============================================================
// ELANIIN DESIGN STUDIO — WORKSPACE MODULE
// Phase 4: User workspace logic
// ============================================================

// ---- STATE ----
var currentUser     = null;
var projects        = [];
var activeProjectId   = null;
var activeProjectName = '';
var activeProjectType = '';
var currentHtml     = null;
var sending         = false;
var pendingType     = null;
var previewOpen     = false;

// ---- CONSTANTS ----
var TYPE_LABELS = {
  websites: 'Websites & Landings',
  reports:  'Dashboards & Reports',
  saas:     'Tools / SaaS / Web Apps',
  deck:     'Deck System',
};

var TYPE_BADGES = {
  websites: 'WEB',
  reports:  'RPT',
  saas:     'APP',
  deck:     'DECK',
};

var TYPE_ICONS = {
  websites: 'ti-world',
  reports:  'ti-chart-bar',
  saas:     'ti-layout-dashboard',
  deck:     'ti-presentation',
};

var TYPE_ORDER = ['websites', 'reports', 'saas', 'deck'];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  var session = await requireAuth();
  if (!session) return;

  currentUser = session.user;
  document.getElementById('user-email').textContent = session.profile.email;

  // Set dynamic greeting in empty state
  var firstName = getFirstName(session.profile.email);
  var headingEl = document.getElementById('empty-heading');
  if (headingEl) headingEl.textContent = getGreeting(firstName);

  // Bind textarea auto-resize + enter-to-send
  var chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Sync sidebar visual state with localStorage on load
  var initCollapsed = document.documentElement.classList.contains('sidebar--collapsed');
  var initToggleIcon = document.getElementById('sidebar-toggle-icon');
  var initLogoFull   = document.getElementById('logo-full');
  if (initToggleIcon) initToggleIcon.className     = initCollapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
  if (initLogoFull)   initLogoFull.style.display   = initCollapsed ? 'none'  : 'block';

  await loadProjects();
});

// ============================================================
// VIEW MANAGEMENT
// ============================================================
function showView(view) {
  var emptyState = document.getElementById('empty-state');
  var chatView   = document.getElementById('chat-view');
  emptyState.classList.toggle('hidden', view !== 'empty');
  chatView.classList.toggle('hidden',   view !== 'chat');
}

function openModal(type) {
  pendingType = type;

  var step1     = document.getElementById('modal-step-1');
  var step2     = document.getElementById('modal-step-2');
  var nameInput = document.getElementById('modal-project-name');

  nameInput.value = '';

  if (type) {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    setModalTypeBadge(type);
    setTimeout(function() { nameInput.focus(); }, 50);
  } else {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function selectModalType(type) {
  pendingType = type;
  document.getElementById('modal-step-1').classList.add('hidden');
  document.getElementById('modal-step-2').classList.remove('hidden');
  setModalTypeBadge(type);
  setTimeout(function() { document.getElementById('modal-project-name').focus(); }, 50);
}

function setModalTypeBadge(type) {
  var badge = document.getElementById('modal-type-badge');
  badge.textContent = TYPE_LABELS[type] || type;
  badge.className   = 'modal-type-badge type-badge type-badge--' + type;
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  pendingType = null;
}

// ============================================================
// PROJECTS — CRUD
// ============================================================
async function loadProjects() {
  try {
    var res = await supabaseClient
      .from('projects')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false });

    if (res.error) throw res.error;
    projects = res.data || [];
    renderSidebar(projects);

    if (!projects.length) {
      showView('empty');
    } else if (!activeProjectId) {
      showView('empty');
    }
  } catch (e) {
    showToast('Error al cargar proyectos: ' + e.message, 'error');
  }
}

async function createProject(name, type) {
  var res = await supabaseClient
    .from('projects')
    .insert({ name: name, type: type, user_id: currentUser.id })
    .select()
    .single();
  if (res.error) throw res.error;
  return res.data;
}

async function deleteProject(id) {
  await supabaseClient.from('messages').delete().eq('project_id', id);
  await supabaseClient.from('projects').delete().eq('id', id);
}

// ============================================================
// PROJECTS — UI
// ============================================================
function renderSidebar(data) {
  var list = document.getElementById('projects-list');
  if (!data.length) {
    list.innerHTML = '<div class="sidebar-no-projects">Sin proyectos aún</div>';
    return;
  }

  // Group by type
  var groups = {};
  data.forEach(function(p) {
    if (!groups[p.type]) groups[p.type] = [];
    groups[p.type].push(p);
  });

  var html = '';
  TYPE_ORDER.forEach(function(type) {
    var group = groups[type];
    if (!group || !group.length) return;
    html += '<div class="project-group-label">' + escHtml(TYPE_LABELS[type] || type) + '</div>';
    group.forEach(function(p) {
      var active = p.id === activeProjectId;
      html += [
        '<div class="project-item' + (active ? ' active' : '') + '" id="proj-' + p.id + '" onclick="openProjectById(\'' + p.id + '\')">',
          '<span class="project-name">' + escHtml(p.name) + '</span>',
          '<span class="project-type-badge">' + (TYPE_BADGES[p.type] || '???') + '</span>',
          '<button class="project-delete" onclick="event.stopPropagation(); confirmDeleteProject(\'' + p.id + '\')" title="Eliminar">',
            '<i class="ti ti-trash"></i>',
          '</button>',
        '</div>',
      ].join('');
    });
  });

  list.innerHTML = html;
}

function filterProjects(query) {
  var q = query.trim().toLowerCase();
  if (!q) {
    renderSidebar(projects);
    return;
  }
  var filtered = projects.filter(function(p) {
    return p.name.toLowerCase().indexOf(q) !== -1;
  });
  if (!filtered.length) {
    document.getElementById('projects-list').innerHTML = '<div class="sidebar-no-projects">Sin resultados</div>';
    return;
  }
  renderSidebar(filtered);
}

function confirmDeleteProject(id) {
  var item = document.getElementById('proj-' + id);
  if (!item) return;
  item.classList.add('confirm-mode');
  item.innerHTML = [
    '<span class="confirm-label">¿Eliminar?</span>',
    '<div class="confirm-actions">',
      '<button class="proj-confirm-yes" onclick="event.stopPropagation(); executeDeleteProject(\'' + id + '\')">Sí</button>',
      '<button class="proj-confirm-no"  onclick="event.stopPropagation(); renderSidebar(projects)">No</button>',
    '</div>',
  ].join('');
}

async function executeDeleteProject(id) {
  try {
    await deleteProject(id);
    if (id === activeProjectId) {
      activeProjectId   = null;
      activeProjectName = '';
      activeProjectType = '';
      currentHtml       = null;
    }
    await loadProjects();
    showToast('Proyecto eliminado');
    if (!activeProjectId) showView('empty');
  } catch (e) {
    showToast('Error al eliminar: ' + e.message, 'error');
    await loadProjects();
  }
}

async function openProjectById(id) {
  var project = projects.find(function(p) { return p.id === id; });
  if (!project) return;
  await openProject(project);
}

async function openProject(project) {
  activeProjectId   = project.id;
  activeProjectName = project.name;
  activeProjectType = project.type;
  currentHtml       = null;
  previewOpen       = false;

  // Update sidebar (re-render to show active state)
  renderSidebar(projects);

  // Update chat topbar
  document.getElementById('chat-project-name').textContent = project.name;
  var topbarBadge = document.getElementById('chat-type-badge');
  topbarBadge.textContent = TYPE_BADGES[project.type] || '???';
  topbarBadge.className   = 'type-badge type-badge--' + project.type;

  // Reset preview panel
  document.getElementById('preview-panel').classList.add('hidden');
  document.getElementById('preview-iframe').removeAttribute('srcdoc');
  document.getElementById('preview-empty').style.display  = 'flex';
  document.getElementById('preview-iframe').style.display = 'none';

  // Load and render messages
  clearMessages();
  showView('chat');

  var messages = await loadMessages(project.id);
  if (messages.length) {
    messages.forEach(function(msg) { renderMessage(msg); });
  } else {
    document.getElementById('messages-empty').style.display = 'flex';
  }

  document.getElementById('chat-input').focus();
}

// ============================================================
// HANDLE "Nuevo proyecto" MODAL CREATE
// ============================================================
async function handleCreateProject() {
  var name  = document.getElementById('modal-project-name').value.trim();
  var type  = pendingType;
  var btn   = document.getElementById('modal-create-btn');
  var errEl = document.getElementById('modal-error');

  errEl.textContent = '';

  if (!name) {
    errEl.textContent = 'El nombre es obligatorio.';
    return;
  }
  if (!type) {
    errEl.textContent = 'Selecciona un tipo.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creando...';

  try {
    var project = await createProject(name, type);
    hideModal();
    await loadProjects();
    await openProject(project);
    showToast('Proyecto creado');
  } catch (e) {
    errEl.textContent = 'Error: ' + e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Crear proyecto';
  }
}

// ============================================================
// MESSAGES
// ============================================================
async function loadMessages(projectId) {
  var res = await supabaseClient
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');
  return res.data || [];
}

async function saveMessage(projectId, role, content) {
  await supabaseClient
    .from('messages')
    .insert({ project_id: projectId, role: role, content: content });
  // Update project updated_at
  await supabaseClient
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', projectId);
}

function clearMessages() {
  var area = document.getElementById('messages-area');
  Array.from(area.children).forEach(function(child) {
    if (child.id !== 'messages-empty') child.remove();
  });
  var emptyEl = document.getElementById('messages-empty');
  if (emptyEl) emptyEl.style.display = 'none';
}

function isHtmlContent(content) {
  var t = content.trim().toLowerCase();
  return t.startsWith('<!doctype') || t.startsWith('<html');
}

function renderMessage(msg) {
  // Hide chat empty state
  var emptyEl = document.getElementById('messages-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  var div    = document.createElement('div');
  div.className = 'message message--' + msg.role;

  var bubble = document.createElement('div');
  bubble.className   = 'message-bubble';
  bubble.textContent = msg.content;
  div.appendChild(bubble);

  if (msg.role === 'assistant' && isHtmlContent(msg.content)) {
    currentHtml = msg.content;
    updatePreview();
    var badge = document.createElement('span');
    badge.className   = 'message-html-badge';
    badge.textContent = 'HTML generado';
    div.appendChild(badge);
  }

  var area = document.getElementById('messages-area');
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

// ============================================================
// SEND MESSAGE
// ============================================================
async function sendMessage() {
  var input = document.getElementById('chat-input');
  var text  = input.value.trim();

  if (!text || sending || !activeProjectId) return;
  sending = true;

  var sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    input.value       = '';
    input.style.height = '40px';

    await saveMessage(activeProjectId, 'user', text);
    renderMessage({ role: 'user', content: text });

    // Phase 5 will replace this with real API call
    var placeholder = '[Conexión con API pendiente — Phase 5]';
    await saveMessage(activeProjectId, 'assistant', placeholder);
    renderMessage({ role: 'assistant', content: placeholder });

    // Reload sidebar to reflect updated_at ordering
    await loadProjects();
  } catch (e) {
    showToast('Error al enviar: ' + e.message, 'error');
  } finally {
    sending = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  }
}

// ============================================================
// PREVIEW PANEL
// ============================================================
function togglePreview() {
  previewOpen = !previewOpen;
  var panel = document.getElementById('preview-panel');
  panel.classList.toggle('hidden', !previewOpen);

  var btn = document.getElementById('preview-btn');
  if (btn) {
    btn.classList.toggle('active', previewOpen);
  }

  if (previewOpen && currentHtml) {
    updatePreview();
  }
}

function updatePreview() {
  var iframe    = document.getElementById('preview-iframe');
  var emptyPrev = document.getElementById('preview-empty');
  if (!iframe || !currentHtml) return;
  iframe.srcdoc           = currentHtml;
  iframe.style.display    = 'block';
  emptyPrev.style.display = 'none';
}

// ============================================================
// DOWNLOAD
// ============================================================
function downloadHtml() {
  if (!currentHtml) {
    showToast('No hay HTML generado aún', 'error');
    return;
  }
  var blob     = new Blob([currentHtml], { type: 'text/html' });
  var url      = URL.createObjectURL(blob);
  var a        = document.createElement('a');
  a.href       = url;
  a.download   = activeProjectName.toLowerCase().replace(/\s+/g, '-') + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Descargado — súbelo a Elaniin Docs ✓');
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type) {
  type = type || 'success';
  var toast       = document.getElementById('toast');
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
// ============================================================
// GREETING & NAVIGATION
// ============================================================
function getFirstName(email) {
  var local = (email || '').split('@')[0];
  var first = local.split('.')[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function getGreeting(firstName) {
  var hour = new Date().getHours();
  var greeting, icon;
  if (hour >= 5 && hour < 12)       { greeting = 'Buenos días';   icon = '☀️'; }
  else if (hour >= 12 && hour < 19) { greeting = 'Buenas tardes'; icon = '🌤️'; }
  else                               { greeting = 'Buenas noches'; icon = '🌙'; }
  return greeting + ', ' + firstName + ' ' + icon;
}

function showEmptyState() {
  activeProjectId   = null;
  activeProjectName = '';
  activeProjectType = '';
  currentHtml       = null;
  previewOpen       = false;
  renderSidebar(projects);
  document.getElementById('preview-panel').classList.add('hidden');
  showView('empty');
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
function toggleSidebar() {
  var collapsed = document.documentElement.classList.toggle('sidebar--collapsed');
  localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0');
  var icon     = document.getElementById('sidebar-toggle-icon');
  var logoFull = document.getElementById('logo-full');
  if (icon)     icon.className          = collapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
  if (logoFull) logoFull.style.display  = collapsed ? 'none'  : 'block';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
