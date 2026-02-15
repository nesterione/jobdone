export function generateHtml(statuses: string[]): string {
  const columns = statuses
    .map(
      (s) => `
      <div class="column" data-status="${s}">
        <h2>${s}</h2>
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
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #121212; --surface: #1e1e1e; --text: #e0e0e0; --text-muted: #999;
      --border: #333; --col-bg: #181818;
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

  .column h2 {
    font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--text-muted); padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }

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

loadTasks().then(() => { initSortable(); initSSE(); });
</script>
</body>
</html>`;
}
