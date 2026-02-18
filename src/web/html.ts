export function generateHtml(
  statuses: string[],
  priorities: string[],
  defaultPriority: string,
): string {
  const firstStatus = statuses[0];
  const columns = statuses
    .map(
      (s) => `
      <div class="column" data-status="${s}">
        <div class="column-header">
          <h2>${s}</h2>
          ${s === firstStatus ? '<button class="add-btn" id="addTaskBtn" title="New task">+</button>' : ""}
        </div>
        ${
          s === firstStatus
            ? `<form class="create-form" id="createForm" style="display:none">
          <input type="text" id="newTaskTitle" placeholder="Task title..." required autocomplete="off">
          <select id="newTaskPriority">
            ${priorities.map((p) => `<option value="${p}"${p === defaultPriority ? " selected" : ""}>${p}</option>`).join("")}
          </select>
          <div class="form-actions">
            <button type="submit" class="btn-create">Create</button>
            <button type="button" class="btn-cancel" id="cancelCreate">Cancel</button>
          </div>
        </form>`
            : ""
        }
        <div class="task-list" data-status="${s}"></div>
      </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>jobdone — Kanban Board</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f5f5f5; --surface: #fff; --text: #1a1a1a; --text-muted: #666;
    --border: #e0e0e0; --col-bg: #eaeaea;
    --high: #e53935; --medium: #fb8c00; --low: #43a047;
    --accent: #1976d2; --accent-hover: #1565c0;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #121212; --surface: #1e1e1e; --text: #e0e0e0; --text-muted: #999;
      --border: #333; --col-bg: #181818;
      --accent: #64b5f6; --accent-hover: #42a5f5;
    }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text); padding: 16px;
  }

  header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  header h1 { font-size: 1.25rem; font-weight: 600; }
  .status-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #43a047; flex-shrink: 0;
  }
  .status-dot.disconnected { background: #fb8c00; }

  .board {
    display: grid;
    grid-template-columns: repeat(${statuses.length}, 1fr);
    gap: 12px;
    min-height: calc(100vh - 80px);
  }

  @media (max-width: 700px) {
    .board { grid-template-columns: 1fr; }
  }

  .column {
    background: var(--col-bg); border-radius: 8px; padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
  }

  .column-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

  .column-header h2 {
    font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .add-btn {
    width: 24px; height: 24px; border-radius: 4px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text-muted); font-size: 1rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    line-height: 1; transition: all 0.15s;
  }
  .add-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

  .create-form {
    background: var(--surface); border-radius: 6px; padding: 10px;
    display: flex; flex-direction: column; gap: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .create-form input,
  .create-form select {
    width: 100%; padding: 6px 8px; border: 1px solid var(--border);
    border-radius: 4px; font-size: 0.85rem;
    background: var(--bg); color: var(--text);
  }

  .create-form input:focus,
  .create-form select:focus {
    outline: none; border-color: var(--accent);
  }

  .form-actions { display: flex; gap: 6px; }

  .btn-create, .btn-cancel {
    padding: 5px 12px; border-radius: 4px; font-size: 0.8rem;
    cursor: pointer; border: 1px solid var(--border);
  }

  .btn-create {
    background: var(--accent); color: #fff; border-color: var(--accent);
  }
  .btn-create:hover { background: var(--accent-hover); }
  .btn-create:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-cancel {
    background: var(--surface); color: var(--text-muted);
  }
  .btn-cancel:hover { background: var(--bg); }

  .task-list { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 40px; }

  .task-card {
    background: var(--surface); border-radius: 6px; padding: 10px 12px;
    border-left: 4px solid var(--medium); cursor: grab;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    transition: box-shadow 0.15s;
  }
  .task-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }

  .task-card[data-priority="high"]   { border-left-color: var(--high); }
  .task-card[data-priority="medium"] { border-left-color: var(--medium); }
  .task-card[data-priority="low"]    { border-left-color: var(--low); }

  .task-title { font-size: 0.9rem; font-weight: 500; margin-bottom: 4px; }
  .task-meta { font-size: 0.75rem; color: var(--text-muted); }
  .task-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }

  .sortable-ghost { opacity: 0.4; }
  .sortable-drag { box-shadow: 0 4px 16px rgba(0,0,0,0.2); }

  /* Slide-over panel */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.2s;
  }
  .overlay.open { opacity: 1; pointer-events: auto; }

  .slide-panel {
    position: fixed; top: 0; right: 0; bottom: 0; width: 480px; max-width: 100vw;
    background: var(--surface); z-index: 101; box-shadow: -4px 0 24px rgba(0,0,0,0.15);
    transform: translateX(100%); transition: transform 0.25s ease;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .slide-panel.open { transform: translateX(0); }

  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .panel-header h3 { font-size: 1rem; font-weight: 600; }
  .panel-header-actions { display: flex; gap: 8px; align-items: center; }

  .panel-body { flex: 1; overflow-y: auto; padding: 20px; }

  .panel-btn {
    padding: 5px 12px; border-radius: 4px; font-size: 0.8rem;
    cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text);
  }
  .panel-btn:hover { background: var(--bg); }
  .panel-btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .panel-btn-primary:hover { background: var(--accent-hover); }
  .panel-btn-close {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; padding: 0;
  }

  .panel-error { color: var(--high); font-size: 0.8rem; margin-bottom: 8px; }

  /* View mode */
  .detail-meta { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .detail-meta-item {
    font-size: 0.8rem; color: var(--text-muted); background: var(--bg);
    padding: 4px 10px; border-radius: 4px;
  }
  .detail-meta-item strong { color: var(--text); }
  .detail-body { font-size: 0.9rem; line-height: 1.6; }
  .detail-body h1, .detail-body h2, .detail-body h3 { margin: 16px 0 8px; }
  .detail-body p { margin: 8px 0; }
  .detail-body ul, .detail-body ol { margin: 8px 0; padding-left: 20px; }
  .detail-body code { background: var(--bg); padding: 2px 4px; border-radius: 3px; font-size: 0.85em; }
  .detail-body pre { background: var(--bg); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; }
  .detail-body pre code { background: none; padding: 0; }

  /* Edit mode */
  .edit-form { display: flex; flex-direction: column; gap: 12px; }
  .edit-field label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
  .edit-field input, .edit-field select, .edit-field textarea {
    width: 100%; padding: 8px 10px; border: 1px solid var(--border);
    border-radius: 4px; font-size: 0.85rem; background: var(--bg); color: var(--text);
    font-family: inherit;
  }
  .edit-field input:focus, .edit-field select:focus, .edit-field textarea:focus {
    outline: none; border-color: var(--accent);
  }
  .edit-field textarea { min-height: 200px; resize: vertical; font-family: monospace; }
</style>
</head>
<body>
<header>
  <h1>jobdone</h1>
  <div class="status-dot" id="statusDot" title="Connected"></div>
</header>
<div class="board">
  ${columns}
</div>

<!-- Slide-over panel -->
<div class="overlay" id="overlay"></div>
<div class="slide-panel" id="slidePanel">
  <div class="panel-header">
    <h3 id="panelTitle">Task Detail</h3>
    <div class="panel-header-actions">
      <button class="panel-btn" id="panelToggleEdit">Edit</button>
      <button class="panel-btn panel-btn-close" id="panelClose">&times;</button>
    </div>
  </div>
  <div class="panel-body" id="panelBody"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
<script>
const statuses = ${JSON.stringify(statuses)};

function renderTasks(grouped) {
  for (const status of statuses) {
    const list = document.querySelector('.task-list[data-status="' + status + '"]');
    if (!list) continue;
    const tasks = grouped[status] || [];
    list.innerHTML = tasks.map(t =>
      '<div class="task-card" data-filename="' + esc(t.filename) + '" data-priority="' + esc(t.priority) + '">' +
        '<div class="task-title">' + esc(t.title) + '</div>' +
        '<div class="task-meta">' + esc(t.priority) + (t.created ? ' · ' + esc(t.created) : '') + '</div>' +
        (t.description ? '<div class="task-desc">' + esc(t.description) + '</div>' : '') +
      '</div>'
    ).join('');
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

async function loadTasks() {
  const res = await fetch('/api/tasks');
  const data = await res.json();
  renderTasks(data);
}

function initSortable() {
  document.querySelectorAll('.task-list').forEach(list => {
    new Sortable(list, {
      group: 'tasks',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async (evt) => {
        const filename = evt.item.dataset.filename;
        const from = evt.from.dataset.status;
        const to = evt.to.dataset.status;
        if (from === to) return;
        await fetch('/api/tasks/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, from, to })
        });
      }
    });
  });
}

function initSSE() {
  const dot = document.getElementById('statusDot');
  const es = new EventSource('/api/events');
  es.onopen = () => { dot.className = 'status-dot'; dot.title = 'Connected'; };
  es.onerror = () => { dot.className = 'status-dot disconnected'; dot.title = 'Reconnecting...'; };
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'refresh') loadTasks();
  };
}

function initCreateForm() {
  const btn = document.getElementById('addTaskBtn');
  const form = document.getElementById('createForm');
  const titleInput = document.getElementById('newTaskTitle');
  const prioritySelect = document.getElementById('newTaskPriority');
  const cancelBtn = document.getElementById('cancelCreate');

  if (!btn || !form) return;

  btn.addEventListener('click', () => {
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    if (form.style.display !== 'none') titleInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    form.style.display = 'none';
    titleInput.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const submitBtn = form.querySelector('.btn-create');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: prioritySelect.value })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        titleInput.value = '';
        form.style.display = 'none';
        loadTasks();
      } else {
        alert(data.error || 'Failed to create task');
      }
    } catch (err) {
      alert('Failed to create task');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

const priorities = ${JSON.stringify(priorities)};
let currentTask = null;
let panelMode = 'view'; // 'view' or 'edit'
let isDragging = false;

function extractIdFromFilename(filename) {
  const m = filename.match(/^(\\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

function openPanel() {
  document.getElementById('overlay').classList.add('open');
  document.getElementById('slidePanel').classList.add('open');
}

function closePanel() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('slidePanel').classList.remove('open');
  currentTask = null;
  panelMode = 'view';
}

async function openTaskDetail(filename) {
  const id = extractIdFromFilename(filename);
  if (!id) return;

  try {
    const res = await fetch('/api/tasks/' + id);
    if (!res.ok) return;
    currentTask = await res.json();
    panelMode = 'view';
    renderPanel();
    openPanel();
  } catch (e) {
    // ignore fetch errors
  }
}

function renderPanel() {
  if (!currentTask) return;
  const body = document.getElementById('panelBody');
  const toggleBtn = document.getElementById('panelToggleEdit');
  document.getElementById('panelTitle').textContent = currentTask.title;

  if (panelMode === 'view') {
    toggleBtn.textContent = 'Edit';
    const rendered = typeof marked !== 'undefined' && marked.parse
      ? marked.parse(currentTask.body || '*No description*')
      : esc(currentTask.body || 'No description');
    body.innerHTML =
      '<div class="detail-meta">' +
        '<div class="detail-meta-item"><strong>Status:</strong> ' + esc(currentTask.status) + '</div>' +
        '<div class="detail-meta-item"><strong>Priority:</strong> ' + esc(currentTask.priority) + '</div>' +
        (currentTask.created ? '<div class="detail-meta-item"><strong>Created:</strong> ' + esc(currentTask.created) + '</div>' : '') +
        '<div class="detail-meta-item"><strong>ID:</strong> ' + currentTask.id + '</div>' +
      '</div>' +
      '<div class="detail-body">' + rendered + '</div>';
  } else {
    toggleBtn.textContent = 'View';
    body.innerHTML =
      '<div id="panelError" class="panel-error"></div>' +
      '<div class="edit-form">' +
        '<div class="edit-field"><label>Title</label>' +
          '<input type="text" id="editTitle" value="' + esc(currentTask.title) + '">' +
        '</div>' +
        '<div class="edit-field"><label>Priority</label>' +
          '<select id="editPriority">' +
            priorities.map(function(p) {
              return '<option value="' + p + '"' + (p === currentTask.priority ? ' selected' : '') + '>' + p + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="edit-field"><label>Created</label>' +
          '<input type="text" id="editCreated" value="' + esc(currentTask.created) + '">' +
        '</div>' +
        '<div class="edit-field"><label>Body (Markdown)</label>' +
          '<textarea id="editBody">' + esc(currentTask.body) + '</textarea>' +
        '</div>' +
        '<div><button class="panel-btn panel-btn-primary" id="saveTaskBtn">Save</button></div>' +
      '</div>';

    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
  }
}

async function saveTask() {
  if (!currentTask) return;
  const errEl = document.getElementById('panelError');
  errEl.textContent = '';

  const title = document.getElementById('editTitle').value.trim();
  if (!title) { errEl.textContent = 'Title cannot be empty.'; return; }

  const priority = document.getElementById('editPriority').value;
  const created = document.getElementById('editCreated').value.trim();
  const body = document.getElementById('editBody').value;

  const saveBtn = document.getElementById('saveTaskBtn');
  saveBtn.disabled = true;

  try {
    const res = await fetch('/api/tasks/' + currentTask.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frontMatter: { title: title, priority: priority, created: created },
        body: body
      })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Failed to save.'; return; }
    // Refresh and re-open in view mode
    await loadTasks();
    const refreshRes = await fetch('/api/tasks/' + currentTask.id);
    if (refreshRes.ok) currentTask = await refreshRes.json();
    panelMode = 'view';
    renderPanel();
  } catch (e) {
    errEl.textContent = 'Failed to save task.';
  } finally {
    saveBtn.disabled = false;
  }
}

function initPanel() {
  document.getElementById('overlay').addEventListener('click', closePanel);
  document.getElementById('panelClose').addEventListener('click', closePanel);
  document.getElementById('panelToggleEdit').addEventListener('click', function() {
    panelMode = panelMode === 'view' ? 'edit' : 'view';
    renderPanel();
  });

  // Click handler on task cards (delegate from board)
  document.querySelector('.board').addEventListener('mousedown', function() { isDragging = false; });
  document.querySelector('.board').addEventListener('mousemove', function() { isDragging = true; });
  document.querySelector('.board').addEventListener('click', function(e) {
    if (isDragging) return;
    const card = e.target.closest('.task-card');
    if (!card) return;
    openTaskDetail(card.dataset.filename);
  });
}

loadTasks().then(() => { initSortable(); initSSE(); initCreateForm(); initPanel(); });
</script>
</body>
</html>`;
}
