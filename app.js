const state = {
  screenMeta: {
    overview: 'Monitor automation, quality, and business outcomes.',
    studio: 'Design conversational journeys with reusable building blocks.',
    inbox: 'Track live conversations and simulate handoff scenarios.',
    knowledge: 'Maintain trusted content for retrieval and FAQ responses.',
    channels: 'Connect and govern omnichannel customer touchpoints.',
    analytics: 'Measure containment, escalations, and intent-level quality.'
  },
  intents: [
    { name: 'Order Status', volume: 420, containment: 88, escalation: '12%' },
    { name: 'Refund Request', volume: 196, containment: 79, escalation: '21%' },
    { name: 'Product Search', volume: 388, containment: 82, escalation: '18%' },
    { name: 'Cancel Subscription', volume: 88, containment: 74, escalation: '26%' }
  ],
  nodeLibrary: ['Message', 'Question', 'Condition', 'API', 'Knowledge Search', 'Handoff'],
  flow: [
    { id: 1, label: 'Welcome', message: 'Hi! I can help with orders, refunds, and product questions.' },
    { id: 2, label: 'Intent Detection', message: 'Let me understand your request first.' },
    { id: 3, label: 'Fulfillment', message: 'I found your order details. Would you like updates by WhatsApp?' }
  ],
  selectedStepId: 1,
  conversations: [
    'Anika · Order delay · Waiting 2m',
    'Ravi · Refund status · Waiting 30s',
    'Maya · Product recommendation · Bot resolved'
  ],
  chat: [
    { role: 'bot', text: 'Hello! I am your virtual assistant. What can I help with?' },
    { role: 'user', text: 'Where is my order?' },
    { role: 'bot', text: 'Please share your order ID so I can check the status.' }
  ],
  kb: ['Return policy', 'Shipping SLAs by region', 'Subscription cancellation process'],
  channels: [
    { name: 'Website Widget', connected: true },
    { name: 'WhatsApp', connected: true },
    { name: 'Instagram', connected: false },
    { name: 'Facebook Messenger', connected: false },
    { name: 'Google Business Messages', connected: false },
    { name: 'Slack (Internal)', connected: true }
  ]
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
  intentTable: document.getElementById('intent-table')
};

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('visible');
  setTimeout(() => el.toast.classList.remove('visible'), 1800);
}

function renderOverview() {
  el.intentBars.innerHTML = state.intents
    .map(
      (item) => `<div class="bar-row"><span>${item.name}</span><div class="track"><div class="fill" style="width:${item.containment}%"></div></div><strong>${item.containment}%</strong></div>`
    )
    .join('');
}

function renderStudio() {
  el.nodeLibrary.innerHTML = state.nodeLibrary.map((n) => `<div class="node">${n}</div>`).join('');
  el.flowCanvas.innerHTML = state.flow
    .map(
      (step) =>
        `<button class="flow-step ${state.selectedStepId === step.id ? 'active' : ''}" data-id="${step.id}"><strong>${step.label}</strong><div>${step.message}</div></button>`
    )
    .join('');

  el.flowCanvas.querySelectorAll('.flow-step').forEach((btn) => {
    btn.addEventListener('click', () => selectStep(Number(btn.dataset.id)));
  });
}

function renderInbox() {
  el.conversationList.innerHTML = state.conversations.map((c) => `<li>${c}</li>`).join('');
  el.chatWindow.innerHTML = state.chat
    .map((m) => `<div class="msg ${m.role}">${m.text}</div>`)
    .join('');
  el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
}

function renderKnowledge() {
  el.kbList.innerHTML = state.kb.map((item) => `<li>${item}</li>`).join('');
}

function renderChannels() {
  el.channelList.innerHTML = state.channels
    .map(
      (ch) =>
        `<div class="channel ${ch.connected ? 'connected' : ''}"><strong>${ch.name}</strong><div class="status">${
          ch.connected ? 'Connected' : 'Not connected'
        }</div></div>`
    )
    .join('');
}

function renderAnalytics() {
  el.intentTable.innerHTML = state.intents
    .map((i) => `<tr><td>${i.name}</td><td>${i.volume}</td><td>${i.containment}%</td><td>${i.escalation}</td></tr>`)
    .join('');
}

function selectStep(id) {
  state.selectedStepId = id;
  const step = state.flow.find((item) => item.id === id);
  if (!step) return;
  el.stepLabel.value = step.label;
  el.stepMessage.value = step.message;
  renderStudio();
}

function setupNavigation() {
  el.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.screen;
      el.navItems.forEach((n) => n.classList.toggle('active', n === item));
      el.screens.forEach((screen) => screen.classList.toggle('active', screen.id === target));
      el.screenTitle.textContent = item.textContent;
      el.subtitle.textContent = state.screenMeta[target];
    });
  });
}

function setupForms() {
  el.stepForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const step = state.flow.find((item) => item.id === state.selectedStepId);
    if (!step) return;
    step.label = el.stepLabel.value.trim();
    step.message = el.stepMessage.value.trim();
    renderStudio();
    toast('Journey step updated.');
  });

  el.addStepForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const label = el.newStepLabel.value.trim();
    if (!label) return;
    const id = Math.max(...state.flow.map((step) => step.id)) + 1;
    state.flow.push({ id, label, message: 'Draft message...' });
    el.newStepLabel.value = '';
    selectStep(id);
    toast('New journey step added.');
  });

  el.chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = el.chatInput.value.trim();
    if (!text) return;
    state.chat.push({ role: 'user', text });
    state.chat.push({ role: 'bot', text: 'Thanks! I am checking that in our system.' });
    el.chatInput.value = '';
    renderInbox();
  });

  el.kbForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const article = el.kbTitle.value.trim();
    if (!article) return;
    state.kb.unshift(article);
    el.kbTitle.value = '';
    renderKnowledge();
    toast('Knowledge article added.');
  });
}

function setupActions() {
  el.simulateBtn.addEventListener('click', () => {
    const count = Number(el.kpiConversations.textContent.replace(/,/g, '')) + Math.floor(Math.random() * 20 + 4);
    el.kpiConversations.textContent = count.toLocaleString();
    toast('Simulation completed with synthetic traffic.');
  });

  el.deployBtn.addEventListener('click', () => {
    toast('Agent published to Website Widget and WhatsApp.');
  });
}

function init() {
  renderOverview();
  renderStudio();
  renderInbox();
  renderKnowledge();
  renderChannels();
  renderAnalytics();
  setupNavigation();
  setupForms();
  setupActions();
  selectStep(state.selectedStepId);
}

init();
