const state = {
  activities: [
    'Sales bot resolved 84 chats automatically.',
    'WhatsApp channel connected for Support.',
    'Knowledge article updated: Refund Policy.',
    'New intent added: check_order_status.'
  ],
  paletteNodes: ['Welcome', 'Collect Input', 'API Call', 'Condition', 'Handover'],
  flow: [
    { id: 1, label: 'Welcome', message: 'Hi! How can I help you today?' },
    { id: 2, label: 'Collect Email', message: 'Please share your email address.' }
  ],
  selectedNodeId: 1,
  knowledge: ['Refund Policy', 'Shipping timelines', 'Account deletion process'],
  channels: [
    { name: 'Web Widget', connected: true },
    { name: 'WhatsApp', connected: true },
    { name: 'Instagram', connected: false },
    { name: 'Facebook Messenger', connected: false },
    { name: 'Google Business', connected: false },
    { name: 'Slack', connected: true }
  ],
  intents: [
    { name: 'Order Status', volume: 420, resolution: '88%' },
    { name: 'Return Request', volume: 196, resolution: '79%' },
    { name: 'Product Info', volume: 388, resolution: '82%' }
  ]
};

const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  screens: document.querySelectorAll('.screen'),
  screenTitle: document.getElementById('screen-title'),
  activityList: document.getElementById('activity-list'),
  nodePalette: document.getElementById('node-palette'),
  flowCanvas: document.getElementById('flow-canvas'),
  nodeForm: document.getElementById('node-form'),
  nodeLabel: document.getElementById('node-label'),
  nodeMessage: document.getElementById('node-message'),
  kbForm: document.getElementById('kb-form'),
  kbTitle: document.getElementById('kb-title'),
  kbList: document.getElementById('kb-list'),
  channelList: document.getElementById('channel-list'),
  intentTable: document.getElementById('intent-table'),
  simulateBtn: document.getElementById('simulate-btn'),
  deployBtn: document.getElementById('deploy-btn'),
  toast: document.getElementById('toast')
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  setTimeout(() => elements.toast.classList.remove('visible'), 1800);
}

function renderActivity() {
  elements.activityList.innerHTML = state.activities.map((a) => `<li>${a}</li>`).join('');
}

function renderPalette() {
  elements.nodePalette.innerHTML = state.paletteNodes
    .map((node) => `<div class="node-item">${node}</div>`)
    .join('');
}

function selectNode(id) {
  state.selectedNodeId = id;
  const node = state.flow.find((n) => n.id === id);
  if (!node) return;
  elements.nodeLabel.value = node.label;
  elements.nodeMessage.value = node.message;
  renderFlow();
}

function renderFlow() {
  elements.flowCanvas.innerHTML = state.flow
    .map(
      (node) =>
        `<button class="flow-node" data-id="${node.id}" style="text-align:left; background:${
          state.selectedNodeId === node.id ? '#312e81' : '#1f2937'
        }"><strong>${node.label}</strong><div>${node.message}</div></button>`
    )
    .join('');

  elements.flowCanvas.querySelectorAll('.flow-node').forEach((el) => {
    el.addEventListener('click', () => selectNode(Number(el.dataset.id)));
  });
}

function renderKnowledge() {
  elements.kbList.innerHTML = state.knowledge.map((k) => `<li>${k}</li>`).join('');
}

function renderChannels() {
  elements.channelList.innerHTML = state.channels
    .map(
      (c) =>
        `<div class="channel ${c.connected ? 'connected' : ''}"><span>${c.name}</span><span>${
          c.connected ? 'Connected' : 'Not connected'
        }</span></div>`
    )
    .join('');
}

function renderIntents() {
  elements.intentTable.innerHTML = state.intents
    .map((intent) => `<tr><td>${intent.name}</td><td>${intent.volume}</td><td>${intent.resolution}</td></tr>`)
    .join('');
}

function setupNavigation() {
  elements.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      elements.navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      const screen = item.dataset.screen;
      elements.screens.forEach((s) => s.classList.toggle('active', s.id === screen));
      elements.screenTitle.textContent = item.textContent;
    });
  });
}

function setupForms() {
  elements.nodeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const node = state.flow.find((n) => n.id === state.selectedNodeId);
    if (!node) return;
    node.label = elements.nodeLabel.value.trim();
    node.message = elements.nodeMessage.value.trim();
    renderFlow();
    showToast('Node updated.');
  });

  elements.kbForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = elements.kbTitle.value.trim();
    if (!title) return;
    state.knowledge.unshift(title);
    elements.kbTitle.value = '';
    renderKnowledge();
    showToast('Knowledge article added.');
  });
}

function setupActions() {
  elements.simulateBtn.addEventListener('click', () => {
    const conversations = Number(elements.conversationsCount?.textContent || 1284) + Math.floor(Math.random() * 10);
    document.getElementById('conversations-count').textContent = conversations.toLocaleString();
    showToast('Simulation completed: 9 conversations processed.');
  });

  elements.deployBtn.addEventListener('click', () => {
    showToast('Agent deployed to Web Widget and WhatsApp.');
  });
}

function init() {
  renderActivity();
  renderPalette();
  renderFlow();
  renderKnowledge();
  renderChannels();
  renderIntents();
  setupNavigation();
  setupForms();
  setupActions();
  selectNode(state.selectedNodeId);
}

init();
