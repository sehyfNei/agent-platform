const uiMeta = {
  overview: 'Monitor automation, quality, and business outcomes.',
  studio: 'Design conversational journeys with reusable building blocks.',
  inbox: 'Track live conversations and simulate handoff scenarios.',
  knowledge: 'Maintain trusted content for retrieval and FAQ responses.',
  channels: 'Connect and govern omnichannel customer touchpoints.',
  analytics: 'Measure containment, escalations, and intent-level quality.'
};

const state = {
  data: null,
  selectedStepId: null
};

const el = {
  navItems: document.querySelectorAll('.nav-item'),
  screens: document.querySelectorAll('.screen'),
  screenTitle: document.getElementById('screen-title'),
  subtitle: document.getElementById('subtitle'),
  deployBtn: document.getElementById('deploy-btn'),
  simulateBtn: document.getElementById('simulate-btn'),
  toast: document.getElementById('toast'),
  kpiConversations: document.getElementById('kpi-conversations'),
  kpiAutomation: document.getElementById('kpi-automation'),
  intentBars: document.getElementById('intent-bars'),
  nodeLibrary: document.getElementById('node-library'),
  flowCanvas: document.getElementById('flow-canvas'),
  stepForm: document.getElementById('step-form'),
  stepLabel: document.getElementById('step-label'),
  stepMessage: document.getElementById('step-message'),
  addStepForm: document.getElementById('add-step-form'),
  newStepLabel: document.getElementById('new-step-label'),
  conversationList: document.getElementById('conversation-list'),
  chatWindow: document.getElementById('chat-window'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  kbForm: document.getElementById('kb-form'),
  kbTitle: document.getElementById('kb-title'),
  kbList: document.getElementById('kb-list'),
  channelList: document.getElementById('channel-list'),
  intentTable: document.getElementById('intent-table'),
  resetBtn: document.getElementById('reset-btn')
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('visible');
  setTimeout(() => el.toast.classList.remove('visible'), 1800);
}

async function loadState() {
  state.data = await api('/api/state');
  if (!state.selectedStepId && state.data.flow.length) {
    state.selectedStepId = state.data.flow[0].id;
  }
}

function renderOverview() {
  const data = state.data;
  el.kpiConversations.textContent = data.metrics.conversations_24h.toLocaleString();
  el.kpiAutomation.textContent = `${data.metrics.automation_rate}%`;

  el.intentBars.innerHTML = data.intents
    .map(
      (item) => `<div class="bar-row"><span>${item.name}</span><div class="track"><div class="fill" style="width:${item.containment}%"></div></div><strong>${item.containment}%</strong></div>`
    )
    .join('');
}

function renderStudio() {
  const data = state.data;
  el.nodeLibrary.innerHTML = data.node_library.map((n) => `<div class="node">${n}</div>`).join('');

  el.flowCanvas.innerHTML = data.flow
    .map(
      (step) =>
        `<button class="flow-step ${state.selectedStepId === step.id ? 'active' : ''}" data-id="${step.id}"><strong>${step.label}</strong><div>${step.message}</div></button>`
    )
    .join('');

  el.flowCanvas.querySelectorAll('.flow-step').forEach((btn) => {
    btn.addEventListener('click', () => selectStep(Number(btn.dataset.id)));
  });

  const selected = data.flow.find((step) => step.id === state.selectedStepId);
  if (selected) {
    el.stepLabel.value = selected.label;
    el.stepMessage.value = selected.message;
  }
}

function renderInbox() {
  const data = state.data;
  el.conversationList.innerHTML = data.conversations.map((c) => `<li>${c}</li>`).join('');
  el.chatWindow.innerHTML = data.chat
    .map((m) => `<div class="msg ${m.role}">${m.text}</div>`)
    .join('');
  el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
}

function renderKnowledge() {
  el.kbList.innerHTML = state.data.kb.map((item) => `<li>${item}</li>`).join('');
}

function renderChannels() {
  el.channelList.innerHTML = state.data.channels
    .map(
      (channel) =>
        `<button class="channel ${channel.connected ? 'connected' : ''}" data-channel="${encodeURIComponent(
          channel.name
        )}"><strong>${channel.name}</strong><div class="status">${
          channel.connected ? 'Connected' : 'Not connected'
        } · click to toggle</div></button>`
    )
    .join('');

  el.channelList.querySelectorAll('[data-channel]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await api(`/api/channels/${button.dataset.channel}`, { method: 'PATCH' });
        await refresh();
        toast('Channel status updated.');
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function renderAnalytics() {
  el.intentTable.innerHTML = state.data.intents
    .map(
      (intent) =>
        `<tr><td>${intent.name}</td><td>${intent.volume}</td><td>${intent.containment}%</td><td>${intent.escalation}%</td></tr>`
    )
    .join('');
}

function selectStep(id) {
  state.selectedStepId = id;
  renderStudio();
}

function setupNavigation() {
  el.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.screen;
      el.navItems.forEach((n) => n.classList.toggle('active', n === item));
      el.screens.forEach((screen) => screen.classList.toggle('active', screen.id === target));
      el.screenTitle.textContent = item.textContent;
      el.subtitle.textContent = uiMeta[target] || '';
    });
  });
}

function setupForms() {
  el.stepForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api(`/api/flow/${state.selectedStepId}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: el.stepLabel.value.trim(),
          message: el.stepMessage.value.trim()
        })
      });
      await refresh();
      toast('Journey step saved.');
    } catch (error) {
      toast(error.message);
    }
  });

  el.addStepForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const step = await api('/api/flow', {
        method: 'POST',
        body: JSON.stringify({ label: el.newStepLabel.value.trim() })
      });
      state.selectedStepId = step.id;
      el.newStepLabel.value = '';
      await refresh();
      toast('New journey step added.');
    } catch (error) {
      toast(error.message);
    }
  });

  el.chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ text: el.chatInput.value.trim() })
      });
      el.chatInput.value = '';
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  });

  el.kbForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/kb', {
        method: 'POST',
        body: JSON.stringify({ title: el.kbTitle.value.trim() })
      });
      el.kbTitle.value = '';
      await refresh();
      toast('Knowledge article added.');
    } catch (error) {
      toast(error.message);
    }
  });
}

function setupActions() {
  el.simulateBtn.addEventListener('click', async () => {
    try {
      const response = await api('/api/simulate', { method: 'POST' });
      await refresh();
      toast(`Simulation complete (+${response.increment} conversations).`);
    } catch (error) {
      toast(error.message);
    }
  });

  el.deployBtn.addEventListener('click', async () => {
    try {
      const response = await api('/api/deploy', { method: 'POST' });
      const channels = response.deployment.channels.join(', ') || 'No connected channels';
      toast(`Published to: ${channels}`);
    } catch (error) {
      toast(error.message);
    }
  });

  el.resetBtn.addEventListener('click', async () => {
    try {
      await api('/api/reset', { method: 'POST' });
      state.selectedStepId = null;
      await refresh();
      toast('Demo data reset.');
    } catch (error) {
      toast(error.message);
    }
  });

}

function renderAll() {
  renderOverview();
  renderStudio();
  renderInbox();
  renderKnowledge();
  renderChannels();
  renderAnalytics();
}

async function refresh() {
  await loadState();
  renderAll();
}

async function init() {
  setupNavigation();
  setupForms();
  setupActions();

  try {
    await refresh();
  } catch (error) {
    toast(`Startup failed: ${error.message}`);
  }
}

init();
