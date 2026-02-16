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

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js"></script>
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

loadTasks().then(() => { initSortable(); initSSE(); initCreateForm(); });
</script>
</body>
</html>`;
}
