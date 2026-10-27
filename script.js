/**
 * ============================================================================
 * Email Communication Simulator - Core Engine
 * Subject: B.Tech Computer Networks | SMTP, POP3 & IMAP Role Play Demonstration
 * Standard: RFC 5321 (SMTP), RFC 1939 (POP3), RFC 3501 (IMAP), RFC 2045 (MIME)
 * ============================================================================
 */

// Application State Object
const state = {
  stage: 1,              // 1 to 5
  substep: 0,            // current substep within the stage
  isPlaying: false,
  isPaused: false,
  speed: 1.0,            // 0.5x to 3.0x
  protocol: 'imap',      // 'imap' or 'pop3'
  pop3Delete: true,      // true: delete on server; false: keep copy
  tlsEnabled: true,
  hasAttachment: true,
  activeFilter: 'all',   // 'all', 'smtp', 'net', 'access'
  logs: [],              // collection of all log events
  serverMailbox: [],     // array of emails on server
  clientInbox: [],       // array of emails retrieved by client
  autoAdvanceTimer: null,// timer for sequential playback
  activeSpeakerMember: 1 // 1 to 5
};

// Speaker Profiles & Role Play Dialogues
const rolePlayData = {
  1: {
    name: "Member 1: Sender / Alice",
    role: "User Agent (UA)",
    avatar: "👩‍💻",
    speech: `"Hello everyone! I represent Member 1, the Sender using an email client like Gmail. Email is an asynchronous, store-and-forward communication system. As a User Agent (UA), I compose the message, format RFC 5322 headers (From, To, Date, Subject), encode the PDF attachment using MIME boundaries, and initiate an SMTP submission session to hand the message off to my outgoing mail server."`,
    concepts: [
      "User Agent (UA) acts as the human-to-network interface",
      "MIME (RFC 2045) encodes binary/multimedia into 7-bit ASCII",
      "SMTP is a Push Protocol; submission uses TCP port 587 with STARTTLS"
    ]
  },
  2: {
    name: "Member 2: Outgoing SMTP Server",
    role: "Sender's Mail Transfer Agent (MTA)",
    avatar: "📮",
    speech: `"I am Member 2, representing the Outgoing SMTP Server (smtp.gmail.com). When Alice's client connects, I verify her identity with AUTH PLAIN. After receiving the email through the DATA command, I place it into my local Spool Queue. I then perform a DNS query for MX (Mail Exchange) records of 'example.org' to find the destination mail server."`,
    concepts: [
      "SMTP (RFC 5321) handshake: EHLO, STARTTLS, AUTH, MAIL FROM, RCPT TO, DATA",
      "Spool Queue: Holds messages if recipient network is temporarily unreachable",
      "DNS MX Records: Map the recipient domain (@example.org) to host IP (mail.example.org)"
    ]
  },
  3: {
    name: "Member 3: Internet & Routers",
    role: "Internet Backbone & TCP/IP Layer",
    avatar: "🌐",
    speech: `"I am Member 3, representing the Internet Backbone and intermediate Routers. While SMTP operates at the Application Layer (Layer 7), it relies on TCP (Layer 4) for reliable, ordered byte delivery over port 25. My routers forward IP packets hop-by-hop across multiple Autonomous Systems (AS) until reaching the recipient's mail server."`,
    concepts: [
      "Application Layer (SMTP) is decoupled from Transport/Network routing (TCP/IP)",
      "TCP 3-Way Handshake (SYN, SYN-ACK, ACK) guarantees connection reliability",
      "IP Packets traverse multiple autonomous router hops across the WAN"
    ]
  },
  4: {
    name: "Member 4: Recipient Mail Server",
    role: "Incoming MTA & Spool Mailbox Store",
    avatar: "🏢",
    speech: `"I am Member 4, the Recipient Mail Server (mail.example.org). My incoming SMTP listener accepts the relay transfer on port 25, checks that 'bob.receiver' is an existing local mailbox, runs spam/virus filtering, and safely stores the email in Bob's server mailbox spool (/var/mail/bob). The email stays safely stored here until Bob connects to retrieve it."`,
    concepts: [
      "Incoming MTA performs recipient mailbox verification and spam inspection",
      "Mailbox Spool: Persistent server storage (e.g. Maildir or mbox format)",
      "Decoupling: Sender does not need recipient device to be online"
    ]
  },
  5: {
    name: "Member 5: Receiver / Bob",
    role: "Mail Access Agent (POP3 / IMAP)",
    avatar: "📱",
    speech: `"I am Member 5, representing Bob and the Mail Access protocols. SMTP cannot be used to pull messages from a mailbox because it is strictly a push protocol. In POP3 (RFC 1939), the client downloads the message and deletes it from the server spool. In IMAP (RFC 3501), the email remains stored on the server and synchronizes status (\\Seen) across all of Bob's devices!"`,
    concepts: [
      "Mail Access protocols are 'Pull' protocols (POP3 on port 110/995, IMAP on port 143/993)",
      "POP3: Download-and-delete philosophy; offline-first, single-device model",
      "IMAP: Store-and-sync philosophy; multiple device synchronization, folder management"
    ]
  }
};

// DOM Element References
let dom = {};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  cacheDOMElements();
  bindEventListeners();
  updateRolePlayCard(1);
  renderMimePreview();
  updateProtocolSummary();
  updateUIStage();
});

// Cache DOM Elements
function cacheDOMElements() {
  dom = {
    // Controls
    btnStart: document.getElementById('btnStart'),
    btnStartText: document.getElementById('btnStartText'),
    btnPause: document.getElementById('btnPause'),
    btnPauseText: document.getElementById('btnPauseText'),
    btnPrevStep: document.getElementById('btnPrevStep'),
    btnNextStep: document.getElementById('btnNextStep'),
    btnReset: document.getElementById('btnReset'),
    speedSlider: document.getElementById('speedSlider'),
    speedBadge: document.getElementById('speedBadge'),
    protoImap: document.getElementById('protoImap'),
    protoPop3: document.getElementById('protoPop3'),
    pop3OptionsBox: document.getElementById('pop3OptionsBox'),
    chkPop3Delete: document.getElementById('chkPop3Delete'),
    chkTls: document.getElementById('chkTls'),
    chkAttachment: document.getElementById('chkAttachment'),
    attachmentPreviewBox: document.getElementById('attachmentPreviewBox'),

    // Role Play
    speakerAvatar: document.getElementById('speakerAvatar'),
    speakerName: document.getElementById('speakerName'),
    speakerRole: document.getElementById('speakerRole'),
    speakerSpeech: document.getElementById('speakerSpeech'),
    speakerConcepts: document.getElementById('speakerConcepts'),
    memberBtns: document.querySelectorAll('.member-btn'),

    // Stepper
    stageTrackFill: document.getElementById('stageTrackFill'),
    stepNodes: document.querySelectorAll('.step-node'),
    step5Sublabel: document.getElementById('step5Sublabel'),

    // Pipeline
    pipelineStatusBadge: document.getElementById('pipelineStatusBadge'),
    pipelineWirePath: document.getElementById('pipelineWirePath'),
    packetEnvelope: document.getElementById('packetEnvelope'),
    packetIcon: document.getElementById('packetIcon'),
    packetTag: document.getElementById('packetTag'),
    topologyNodes: document.querySelectorAll('.topology-node'),
    node5ProtoLabel: document.getElementById('node5ProtoLabel'),

    // Form
    fromAddress: document.getElementById('fromAddress'),
    toAddress: document.getElementById('toAddress'),
    emailSubject: document.getElementById('emailSubject'),
    emailBody: document.getElementById('emailBody'),
    btnPreviewMimeLink: document.getElementById('btnPreviewMimeLink'),

    // Terminal
    terminalViewport: document.getElementById('terminalViewport'),
    terminalTabBtns: document.querySelectorAll('.terminal-tab-btn'),
    btnCopyTerminal: document.getElementById('btnCopyTerminal'),
    btnClearTerminal: document.getElementById('btnClearTerminal'),

    // Receiver Storage
    tabBtnServerMailbox: document.getElementById('tabBtnServerMailbox'),
    tabBtnClientInbox: document.getElementById('tabBtnClientInbox'),
    serverMailboxContainer: document.getElementById('serverMailboxContainer'),
    clientInboxContainer: document.getElementById('clientInboxContainer'),
    serverMailboxBadge: document.getElementById('serverMailboxBadge'),
    serverMailboxContent: document.getElementById('serverMailboxContent'),
    clientInboxBadge: document.getElementById('clientInboxBadge'),
    clientInboxContent: document.getElementById('clientInboxContent'),
    clientProtoLabel: document.getElementById('clientProtoLabel'),
    retrievalSummaryCard: document.getElementById('retrievalSummaryCard'),
    retrievalSummaryTitle: document.getElementById('retrievalSummaryTitle'),
    retrievalSummaryBody: document.getElementById('retrievalSummaryBody'),

    // Modals
    modalComparison: document.getElementById('modalComparison'),
    modalMime: document.getElementById('modalMime'),
    modalScript: document.getElementById('modalScript'),
    btnOpenComparison: document.getElementById('btnOpenComparison'),
    btnOpenMimeInspector: document.getElementById('btnOpenMimeInspector'),
    btnOpenScriptModal: document.getElementById('btnOpenScriptModal'),
    mimeRawCode: document.getElementById('mimeRawCode')
  };
}

// Bind Event Listeners
function bindEventListeners() {
  // Master Controls
  dom.btnStart.addEventListener('click', handleStart);
  dom.btnPause.addEventListener('click', handlePauseResume);
  dom.btnPrevStep.addEventListener('click', handlePrevStep);
  dom.btnNextStep.addEventListener('click', handleNextStep);
  dom.btnReset.addEventListener('click', handleReset);

  // Speed
  dom.speedSlider.addEventListener('input', (e) => {
    state.speed = parseFloat(e.target.value);
    dom.speedBadge.textContent = state.speed + 'x';
  });

  // Protocol Selection
  dom.protoImap.addEventListener('change', () => setProtocol('imap'));
  dom.protoPop3.addEventListener('change', () => setProtocol('pop3'));
  dom.chkPop3Delete.addEventListener('change', (e) => {
    state.pop3Delete = e.target.checked;
    updateProtocolSummary();
  });

  // TLS & Attachment Toggles
  dom.chkTls.addEventListener('change', (e) => {
    state.tlsEnabled = e.target.checked;
  });
  dom.chkAttachment.addEventListener('change', (e) => {
    state.hasAttachment = e.target.checked;
    dom.attachmentPreviewBox.style.display = state.hasAttachment ? 'flex' : 'none';
    renderMimePreview();
  });

  // Role Play Member Navigation
  dom.memberBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const memberId = parseInt(btn.getAttribute('data-member'), 10);
      updateRolePlayCard(memberId);
    });
  });

  // Step Node Direct Jump
  dom.stepNodes.forEach(node => {
    node.addEventListener('click', () => {
      const targetStep = parseInt(node.getAttribute('data-step'), 10);
      jumpToStage(targetStep);
    });
  });

  // Terminal Tabs
  dom.terminalTabBtns.forEach(tab => {
    tab.addEventListener('click', () => {
      dom.terminalTabBtns.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeFilter = tab.getAttribute('data-filter');
      renderTerminal();
    });
  });

  // Terminal Copy & Clear
  dom.btnCopyTerminal.addEventListener('click', copyTerminalLog);
  dom.btnClearTerminal.addEventListener('click', () => {
    state.logs = [];
    renderTerminal();
  });

  // Receiver View Tabs
  dom.tabBtnServerMailbox.addEventListener('click', () => {
    dom.tabBtnServerMailbox.classList.add('active');
    dom.tabBtnClientInbox.classList.remove('active');
    dom.serverMailboxContainer.style.display = 'block';
    dom.clientInboxContainer.style.display = 'none';
  });
  dom.tabBtnClientInbox.addEventListener('click', () => {
    dom.tabBtnClientInbox.classList.add('active');
    dom.tabBtnServerMailbox.classList.remove('active');
    dom.clientInboxContainer.style.display = 'block';
    dom.serverMailboxContainer.style.display = 'none';
  });

  // Modals Open/Close
  dom.btnOpenComparison.addEventListener('click', () => openModal(dom.modalComparison));
  dom.btnOpenMimeInspector.addEventListener('click', () => openModal(dom.modalMime));
  dom.btnPreviewMimeLink.addEventListener('click', () => openModal(dom.modalMime));
  dom.btnOpenScriptModal.addEventListener('click', () => openModal(dom.modalScript));

  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      closeModal(document.getElementById(modalId));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });
}

// Set Access Protocol
function setProtocol(protocol) {
  state.protocol = protocol;
  dom.pop3OptionsBox.style.display = protocol === 'pop3' ? 'flex' : 'none';
  dom.clientProtoLabel.textContent = protocol.toUpperCase();
  dom.node5ProtoLabel.textContent = protocol === 'imap' ? 'IMAP (Port 993)' : 'POP3 (Port 995)';
  dom.step5Sublabel.textContent = protocol === 'imap' ? 'IMAP Sync' : 'POP3 Download';
  updateProtocolSummary();

  // If already at stage 5, re-execute stage 5 with new protocol branch
  if (state.stage === 5 && state.serverMailbox.length > 0) {
    executeStage5();
  }
}

// Update Protocol Summary Text
function updateProtocolSummary() {
  if (state.protocol === 'imap') {
    dom.retrievalSummaryTitle.textContent = "📬 IMAP Mode Active (RFC 3501)";
    dom.retrievalSummaryBody.innerHTML = `
      IMAP synchronizes with the server. When Bob retrieves and reads the message on his client, the original email <strong>remains on the server</strong> with the <code>\\Seen</code> flag updated. Other devices (phone, tablet) will see the identical state.
    `;
  } else {
    dom.retrievalSummaryTitle.textContent = "📦 POP3 Mode Active (RFC 1939)";
    if (state.pop3Delete) {
      dom.retrievalSummaryBody.innerHTML = `
        POP3 downloads the message to Bob's device and issues the <code>DELE 1</code> command. The message is <strong>permanently deleted from the server mailbox</strong> upon logout, preserving server storage but limiting mail to this single machine.
      `;
    } else {
      dom.retrievalSummaryBody.innerHTML = `
        POP3 downloads the message to Bob's device. With "keep copy" enabled, no <code>DELE</code> command is issued, leaving the email on the server (though POP3 lacks multi-device read/unread synchronization).
      `;
    }
  }
}

// Open / Close Modal Helpers
function openModal(modalEl) {
  modalEl.classList.add('active');
}
function closeModal(modalEl) {
  modalEl.classList.remove('active');
}

// Role Play Presentation Card Updater
function updateRolePlayCard(memberId) {
  state.activeSpeakerMember = memberId;

  dom.memberBtns.forEach(btn => {
    if (parseInt(btn.getAttribute('data-member'), 10) === memberId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const data = rolePlayData[memberId];
  if (data) {
    dom.speakerAvatar.textContent = data.avatar;
    dom.speakerName.textContent = data.name;
    dom.speakerRole.textContent = data.role;
    dom.speakerSpeech.textContent = data.speech;

    dom.speakerConcepts.innerHTML = '';
    data.concepts.forEach(concept => {
      const li = document.createElement('li');
      li.textContent = concept;
      dom.speakerConcepts.appendChild(li);
    });
  }
}

// Terminal Logging System
function logEvent(tag, tagClass, text, category = 'smtp', isCommand = false, isResponse = false) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

  const logObj = {
    time: timeStr,
    tag: tag,
    tagClass: tagClass,
    text: text,
    category: category,
    isCommand: isCommand,
    isResponse: isResponse
  };

  state.logs.push(logObj);
  appendTerminalLine(logObj);
}

function appendTerminalLine(logObj) {
  // Check if matches active filter
  if (state.activeFilter !== 'all' && state.activeFilter !== logObj.category) {
    return;
  }

  const lineEl = document.createElement('div');
  lineEl.className = 'term-line';

  let contentClass = 'term-content';
  if (logObj.isCommand) contentClass += ' term-command';
  else if (logObj.isResponse) contentClass += ' term-response';
  else if (logObj.tagClass === 'tag-network' || logObj.tagClass === 'tag-info') contentClass += ' term-highlight';

  lineEl.innerHTML = `
    <span class="term-time">[${logObj.time}]</span>
    <span class="term-tag ${logObj.tagClass}">${logObj.tag}</span>
    <span class="${contentClass}">${escapeHtml(logObj.text)}</span>
  `;

  dom.terminalViewport.appendChild(lineEl);
  dom.terminalViewport.scrollTop = dom.terminalViewport.scrollHeight;
}

function renderTerminal() {
  dom.terminalViewport.innerHTML = '';
  state.logs.forEach(log => {
    if (state.activeFilter === 'all' || state.activeFilter === log.category) {
      appendTerminalLine(log);
    }
  });
}

function copyTerminalLog() {
  const text = state.logs.map(l => `[${l.time}] [${l.tag}] ${l.text}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const originalText = dom.btnCopyTerminal.innerHTML;
    dom.btnCopyTerminal.innerHTML = 'Copied!';
    setTimeout(() => { dom.btnCopyTerminal.innerHTML = originalText; }, 1500);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Render MIME Structure in Modal
function renderMimePreview() {
  const from = dom.fromAddress.value;
  const to = dom.toAddress.value;
  const subject = dom.emailSubject.value;
  const body = dom.emailBody.value;
  const boundary = "----=_NextPart_001_847291";

  let mimeText = `MIME-Version: 1.0
From: ${from}
To: ${to}
Subject: ${subject}
Date: ${new Date().toUTCString()}
Message-ID: <${Date.now()}.cn_roleplay@gmail.com>`;

  if (state.hasAttachment) {
    mimeText += `\nContent-Type: multipart/mixed; boundary="${boundary}"

This is a multi-part message in MIME format.

--${boundary}
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

${body}

--${boundary}
Content-Type: application/pdf; name="CN_Group_Report.pdf"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="CN_Group_Report.pdf"

JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwKL0ZpbHRlciAvRmxhdGVEZWNvZGUK
L0xlbmd0aCAzOTQKNDAgMCBSCi9UeXBlIC9YT2JqZWN0Ci9TdWJ0eXBlIC9JbWFnZQovV2lk
... [Simulated 142KB Base64 PDF Stream] ...
--${boundary}--`;
  } else {
    mimeText += `\nContent-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

${body}`;
  }

  dom.mimeRawCode.textContent = mimeText;
}

// Sleep Helper respecting speed
function delay(ms) {
  return new Promise(resolve => {
    const actualMs = ms / state.speed;
    state.autoAdvanceTimer = setTimeout(resolve, actualMs);
  });
}

// UI Stage State Synchronizer
function updateUIStage() {
  const stage = state.stage;

  // Track fill percentage (0%, 25%, 50%, 75%, 100%)
  const percentage = ((stage - 1) / 4) * 100;
  dom.stageTrackFill.style.width = percentage + '%';

  // Stepper Nodes
  dom.stepNodes.forEach(node => {
    const stepNum = parseInt(node.getAttribute('data-step'), 10);
    node.classList.remove('active', 'completed');
    if (stepNum === stage) {
      node.classList.add('active');
    } else if (stepNum < stage) {
      node.classList.add('completed');
    }
  });

  // Pipeline Topology Nodes
  dom.topologyNodes.forEach(node => {
    const stepNum = parseInt(node.getAttribute('data-step'), 10);
    node.classList.remove('active');
    const chip = node.querySelector('.node-status-chip');
    if (chip) chip.classList.remove('visible');

    if (stepNum === stage) {
      node.classList.add('active');
      if (chip) chip.classList.add('visible');
    }
  });

  // Move Envelope along pipeline
  // Stage 1: 10%, Stage 2: 30%, Stage 3: 50%, Stage 4: 70%, Stage 5: 90%
  const envelopePositions = { 1: '10%', 2: '30%', 3: '50%', 4: '70%', 5: '90%' };
  dom.packetEnvelope.style.left = envelopePositions[stage] || '10%';

  // Envelope Tags
  const envelopeTags = {
    1: 'UA Compose',
    2: 'SMTP Spool',
    3: 'IP Packet',
    4: 'Incoming MTA',
    5: state.protocol.toUpperCase() + ' Retrieve'
  };
  dom.packetTag.textContent = envelopeTags[stage];

  // Pipeline Wire active animation
  if (state.isPlaying && !state.isPaused) {
    dom.pipelineWirePath.classList.add('active');
  } else {
    dom.pipelineWirePath.classList.remove('active');
  }

  // Auto-sync Speaker with current stage
  updateRolePlayCard(stage);
}

// Playback Control Handlers
async function handleStart() {
  if (state.isPlaying) return;

  state.isPlaying = true;
  state.isPaused = false;
  state.stage = 1;

  dom.btnStart.disabled = true;
  dom.btnPause.disabled = false;
  dom.btnPauseText.textContent = "Pause";

  dom.pipelineStatusBadge.textContent = "Simulation Running";
  dom.pipelineStatusBadge.style.background = "var(--accent-emerald-light)";
  dom.pipelineStatusBadge.style.color = "var(--accent-emerald-dark)";

  await runSimulationSequence();
}

function handlePauseResume() {
  if (!state.isPlaying) return;

  state.isPaused = !state.isPaused;
  dom.btnPauseText.textContent = state.isPaused ? "Resume" : "Pause";

  if (state.isPaused) {
    clearTimeout(state.autoAdvanceTimer);
    dom.pipelineStatusBadge.textContent = "Paused";
    dom.pipelineStatusBadge.style.background = "var(--accent-amber-light)";
    dom.pipelineStatusBadge.style.color = "var(--accent-amber-dark)";
    dom.pipelineWirePath.classList.remove('active');
  } else {
    dom.pipelineStatusBadge.textContent = "Simulation Running";
    dom.pipelineStatusBadge.style.background = "var(--accent-emerald-light)";
    dom.pipelineStatusBadge.style.color = "var(--accent-emerald-dark)";
    dom.pipelineWirePath.classList.add('active');
    runSimulationSequence();
  }
}

async function handleNextStep() {
  if (state.stage < 5) {
    state.stage++;
    updateUIStage();
    await executeCurrentStageOnly();
  }
}

async function handlePrevStep() {
  if (state.stage > 1) {
    state.stage--;
    updateUIStage();
    await executeCurrentStageOnly();
  }
}

function handleReset() {
  clearTimeout(state.autoAdvanceTimer);
  state.isPlaying = false;
  state.isPaused = false;
  state.stage = 1;
  state.serverMailbox = [];
  state.clientInbox = [];

  dom.btnStart.disabled = false;
  dom.btnPause.disabled = true;
  dom.btnPauseText.textContent = "Pause";

  dom.pipelineStatusBadge.textContent = "Ready • Idle";
  dom.pipelineStatusBadge.style.background = "var(--primary-100)";
  dom.pipelineStatusBadge.style.color = "var(--primary-800)";

  updateUIStage();
  renderServerMailbox();
  renderClientInbox();

  logEvent("SYS", "tag-info", "Simulation reset to initial state.", "smtp");
}

function jumpToStage(stageNum) {
  state.stage = stageNum;
  updateUIStage();
  executeCurrentStageOnly();
}

// Master Sequential Runner
async function runSimulationSequence() {
  while (state.isPlaying && !state.isPaused && state.stage <= 5) {
    updateUIStage();
    await executeCurrentStageOnly();

    if (state.stage < 5) {
      await delay(900);
      if (!state.isPaused && state.isPlaying) {
        state.stage++;
      }
    } else {
      // Completed all 5 stages
      state.isPlaying = false;
      dom.btnStart.disabled = false;
      dom.btnPause.disabled = true;
      dom.pipelineStatusBadge.textContent = "Completed Successfully";
      dom.pipelineWirePath.classList.remove('active');
      break;
    }
  }
}

// Execute logic for whichever stage is active
async function executeCurrentStageOnly() {
  switch (state.stage) {
    case 1:
      await executeStage1();
      break;
    case 2:
      await executeStage2();
      break;
    case 3:
      await executeStage3();
      break;
    case 4:
      await executeStage4();
      break;
    case 5:
      await executeStage5();
      break;
  }
}

// ============================================================================
// STAGE 1: Sender (User Agent / UA)
// ============================================================================
async function executeStage1() {
  const from = dom.fromAddress.value;
  const to = dom.toAddress.value;
  const subject = dom.emailSubject.value;

  logEvent("UA", "tag-client", `User clicks Send. UA formatting message envelope for <${to}>`, "smtp");
  await delay(400);

  logEvent("UA", "tag-client", `MIME multipart container created (hasAttachment=${state.hasAttachment})`, "smtp");
  await delay(400);

  logEvent("UA", "tag-info", `UA establishing TCP socket connection to outgoing submission server: smtp.gmail.com:587`, "net");
  await delay(400);

  logEvent("TCP", "tag-network", `[TCP Handshake] Client -> SYN -> smtp.gmail.com:587 (Port 587 Submission)`, "net");
  await delay(300);
  logEvent("TCP", "tag-network", `[TCP Handshake] smtp.gmail.com -> SYN-ACK -> Client [ESTABLISHED]`, "net");
}

// ============================================================================
// STAGE 2: Outgoing SMTP Server (MTA) & MX Lookup
// ============================================================================
async function executeStage2() {
  const from = dom.fromAddress.value;
  const to = dom.toAddress.value;
  const recipientDomain = to.split('@')[1] || "example.org";

  // Server greeting
  logEvent("SMTP", "tag-server", `220 smtp.gmail.com ESMTP Postfix Submission Ready (RFC 5321)`, "smtp", false, true);
  await delay(350);

  // EHLO
  logEvent("SMTP", "tag-client", `EHLO [192.168.1.105] (Alice-Workstation)`, "smtp", true, false);
  await delay(300);

  logEvent("SMTP", "tag-server", `250-smtp.gmail.com greets [192.168.1.105]`, "smtp", false, true);
  logEvent("SMTP", "tag-server", `250-SIZE 35882577`, "smtp", false, true);
  logEvent("SMTP", "tag-server", `250-8BITMIME`, "smtp", false, true);
  if (state.tlsEnabled) {
    logEvent("SMTP", "tag-server", `250-STARTTLS`, "smtp", false, true);
  }
  logEvent("SMTP", "tag-server", `250-AUTH PLAIN LOGIN`, "smtp", false, true);
  logEvent("SMTP", "tag-server", `250 OK`, "smtp", false, true);
  await delay(400);

  // STARTTLS Negotiation
  if (state.tlsEnabled) {
    logEvent("SMTP", "tag-client", `STARTTLS`, "smtp", true, false);
    await delay(300);
    logEvent("SMTP", "tag-server", `220 2.0.0 Ready to start TLS`, "smtp", false, true);
    await delay(350);
    logEvent("TLS", "tag-network", `[TLS Handshake] TLSv1.3 negotiated with Cipher: TLS_AES_256_GCM_SHA384`, "net");
    await delay(300);
    logEvent("SMTP", "tag-client", `EHLO [192.168.1.105] (encrypted)`, "smtp", true, false);
    logEvent("SMTP", "tag-server", `250 OK [Encrypted channel verified]`, "smtp", false, true);
    await delay(350);
  }

  // Authentication
  logEvent("SMTP", "tag-client", `AUTH PLAIN AGFsaWNlLnNlbmRlcgBwYXNzd29yZDEyMw==`, "smtp", true, false);
  await delay(300);
  logEvent("SMTP", "tag-server", `235 2.7.0 Authentication successful`, "smtp", false, true);
  await delay(350);

  // Envelope Sender & Recipient
  logEvent("SMTP", "tag-client", `MAIL FROM:<${from}>`, "smtp", true, false);
  await delay(300);
  logEvent("SMTP", "tag-server", `250 2.1.0 Sender <${from}> OK`, "smtp", false, true);
  await delay(300);

  logEvent("SMTP", "tag-client", `RCPT TO:<${to}>`, "smtp", true, false);
  await delay(300);
  logEvent("SMTP", "tag-server", `250 2.1.5 Recipient <${to}> OK`, "smtp", false, true);
  await delay(350);

  // DATA
  logEvent("SMTP", "tag-client", `DATA`, "smtp", true, false);
  await delay(250);
  logEvent("SMTP", "tag-server", `354 Enter mail, end with "." on a line by itself`, "smtp", false, true);
  await delay(400);

  logEvent("DATA", "tag-client", `[Transmitting Headers + MIME payload (142 KB)]...`, "smtp");
  await delay(350);
  logEvent("SMTP", "tag-client", `.`, "smtp", true, false);
  await delay(300);

  logEvent("SMTP", "tag-server", `250 2.0.0 OK: queued as 4XpQzL5mBmz2`, "smtp", false, true);
  await delay(400);

  // DNS MX Query by Sender's MTA
  logEvent("DNS", "tag-network", `[DNS Resolver] Outgoing MTA querying DNS for MX records of '${recipientDomain}'...`, "net");
  await delay(400);
  logEvent("DNS", "tag-network", `[DNS Answer] '${recipientDomain}' IN MX 10 mail.${recipientDomain} [IP: 198.51.100.25]`, "net");
}

// ============================================================================
// STAGE 3: Internet Backbone & Routers (TCP Relay)
// ============================================================================
async function executeStage3() {
  const from = dom.fromAddress.value;
  const to = dom.toAddress.value;
  const recipientDomain = to.split('@')[1] || "example.org";

  logEvent("NET", "tag-network", `[Network] Initiating inter-server TCP connection from smtp.gmail.com to mail.${recipientDomain}:25`, "net");
  await delay(350);

  logEvent("TCP", "tag-network", `[TCP Handshake] 203.0.113.10:48291 -> SYN -> 198.51.100.25:25 (Standard SMTP Relay)`, "net");
  await delay(300);
  logEvent("TCP", "tag-network", `[TCP Handshake] 198.51.100.25:25 -> SYN-ACK -> 203.0.113.10:48291 [ESTABLISHED]`, "net");
  await delay(350);

  logEvent("ROUTER", "tag-network", `[IP Routing] Packet routed through AS15169 -> Tier-1 Transit (Hop 1..3) -> AS64496`, "net");
  await delay(400);

  // Relay Dialogue
  logEvent("RELAY", "tag-server", `220 mail.${recipientDomain} ESMTP Ready for incoming relay`, "smtp", false, true);
  await delay(300);
  logEvent("RELAY", "tag-client", `EHLO smtp.gmail.com`, "smtp", true, false);
  await delay(250);
  logEvent("RELAY", "tag-server", `250 mail.${recipientDomain} Hello smtp.gmail.com`, "smtp", false, true);
  await delay(250);
  logEvent("RELAY", "tag-client", `MAIL FROM:<${from}>`, "smtp", true, false);
  logEvent("RELAY", "tag-server", `250 2.1.0 OK`, "smtp", false, true);
  await delay(250);
  logEvent("RELAY", "tag-client", `RCPT TO:<${to}>`, "smtp", true, false);
  logEvent("RELAY", "tag-server", `250 2.1.5 Recipient OK`, "smtp", false, true);
  await delay(250);
  logEvent("RELAY", "tag-client", `DATA`, "smtp", true, false);
  logEvent("RELAY", "tag-server", `354 Go ahead`, "smtp", false, true);
  await delay(300);
  logEvent("RELAY", "tag-client", `[Relaying MIME stream with PDF attachment]`, "smtp");
  logEvent("RELAY", "tag-client", `.`, "smtp", true, false);
  await delay(350);
  logEvent("RELAY", "tag-server", `250 2.0.0 Message accepted for local spool`, "smtp", false, true);
}

// ============================================================================
// STAGE 4: Recipient Mail Server (Spool Storage & Validation)
// ============================================================================
async function executeStage4() {
  const to = dom.toAddress.value;

  logEvent("MTA-IN", "tag-server", `Incoming MTA inspecting envelope recipient: <${to}>`, "smtp");
  await delay(350);

  logEvent("MTA-IN", "tag-server", `[Mailbox Lookup] Checking passwd/vmail db for user 'bob.receiver' -> VALID MAILBOX`, "smtp");
  await delay(350);

  logEvent("FILTER", "tag-network", `[Security Filter] SpamAssassin score: 0.1/5.0 (HAM) | ClamAV virus scan: CLEAN`, "net");
  await delay(400);

  logEvent("MDA", "tag-server", `[Local Delivery Agent] Writing RFC 5322 file to /var/mail/bob.receiver/Maildir/new/`, "smtp");
  await delay(400);

  // Put message into state.serverMailbox
  state.serverMailbox = [{
    id: 1,
    from: dom.fromAddress.value,
    to: dom.toAddress.value,
    subject: dom.emailSubject.value,
    body: dom.emailBody.value,
    hasAttachment: state.hasAttachment,
    receivedAt: new Date().toLocaleTimeString(),
    flags: ["\\Recent"],
    isDeleted: false
  }];

  renderServerMailbox();
  logEvent("MTA-IN", "tag-info", `Message safely deposited in Bob's server mailbox spool. Awaiting client retrieval.`, "smtp");
}

// ============================================================================
// STAGE 5: Receiver Client (POP3 or IMAP Retrieval)
// ============================================================================
async function executeStage5() {
  if (state.protocol === 'imap') {
    await executeIMAPRetrieval();
  } else {
    await executePOP3Retrieval();
  }
}

// IMAP Execution Branch
async function executeIMAPRetrieval() {
  logEvent("IMAP", "tag-info", `Bob's Client connecting to mail.example.org on port 993 (IMAPS)`, "access");
  await delay(350);

  logEvent("IMAP", "tag-server", `* OK [CAPABILITY IMAP4rev1 SASL-IR LITERAL+ IDLE] IMAP4rev1 Server Ready`, "access", false, true);
  await delay(300);

  logEvent("IMAP", "tag-client", `A01 LOGIN bob.receiver SecretPassword99`, "access", true, false);
  await delay(300);
  logEvent("IMAP", "tag-server", `A01 OK [CAPABILITY IMAP4rev1] Logged in successfully`, "access", false, true);
  await delay(350);

  logEvent("IMAP", "tag-client", `A02 SELECT INBOX`, "access", true, false);
  await delay(300);
  logEvent("IMAP", "tag-server", `* 1 EXISTS`, "access", false, true);
  logEvent("IMAP", "tag-server", `* 1 RECENT`, "access", false, true);
  logEvent("IMAP", "tag-server", `* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)`, "access", false, true);
  logEvent("IMAP", "tag-server", `A02 OK [READ-WRITE] SELECT completed`, "access", false, true);
  await delay(400);

  // Fetch Headers
  logEvent("IMAP", "tag-client", `A03 FETCH 1 (FLAGS BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)])`, "access", true, false);
  await delay(300);
  logEvent("IMAP", "tag-server", `* 1 FETCH (FLAGS (\\Recent) BODY[HEADER.FIELDS (DATE FROM SUBJECT)] {82}...)`, "access", false, true);
  logEvent("IMAP", "tag-server", `A03 OK FETCH completed`, "access", false, true);
  await delay(350);

  // Fetch Body
  logEvent("IMAP", "tag-client", `A04 FETCH 1 BODY[]`, "access", true, false);
  await delay(350);
  logEvent("IMAP", "tag-server", `* 1 FETCH (FLAGS (\\Recent) BODY[] {145920} [Full MIME Message Payload])`, "access", false, true);
  logEvent("IMAP", "tag-server", `A04 OK FETCH completed`, "access", false, true);
  await delay(350);

  // Store Flag Seen
  logEvent("IMAP", "tag-client", `A05 STORE 1 +FLAGS (\\Seen)`, "access", true, false);
  await delay(300);
  logEvent("IMAP", "tag-server", `* 1 FETCH (FLAGS (\\Seen))`, "access", false, true);
  logEvent("IMAP", "tag-server", `A05 OK STORE completed`, "access", false, true);
  await delay(350);

  logEvent("IMAP", "tag-client", `A06 LOGOUT`, "access", true, false);
  logEvent("IMAP", "tag-server", `* BYE IMAP4rev1 Server logging out`, "access", false, true);
  logEvent("IMAP", "tag-server", `A06 OK LOGOUT completed`, "access", false, true);

  // Update State: In IMAP, mail remains on server, but has \Seen flag
  if (state.serverMailbox.length > 0) {
    state.serverMailbox[0].flags = ["\\Seen"];
  }

  // Client inbox displays message
  state.clientInbox = [{
    from: dom.fromAddress.value,
    subject: dom.emailSubject.value,
    body: dom.emailBody.value,
    hasAttachment: state.hasAttachment,
    retrievedProtocol: 'IMAP (Port 993)',
    flag: '\\Seen (Synced)'
  }];

  renderServerMailbox();
  renderClientInbox();

  logEvent("IMAP", "tag-info", `SUCCESS: Message rendered on Bob's client. Message remains intact on server for other devices!`, "access");
}

// POP3 Execution Branch
async function executePOP3Retrieval() {
  logEvent("POP3", "tag-info", `Bob's Client connecting to mail.example.org on port 995 (POP3S)`, "access");
  await delay(350);

  logEvent("POP3", "tag-server", `+OK POP3 server ready (mail.example.org Postfix)`, "access", false, true);
  await delay(300);

  logEvent("POP3", "tag-client", `USER bob.receiver`, "access", true, false);
  await delay(250);
  logEvent("POP3", "tag-server", `+OK User name accepted, password required`, "access", false, true);
  await delay(300);

  logEvent("POP3", "tag-client", `PASS SecretPassword99`, "access", true, false);
  await delay(300);
  logEvent("POP3", "tag-server", `+OK Mailbox locked and ready (1 messages, 145920 octets)`, "access", false, true);
  await delay(350);

  // STAT command
  logEvent("POP3", "tag-client", `STAT`, "access", true, false);
  await delay(250);
  logEvent("POP3", "tag-server", `+OK 1 145920`, "access", false, true);
  await delay(300);

  // LIST command
  logEvent("POP3", "tag-client", `LIST`, "access", true, false);
  await delay(250);
  logEvent("POP3", "tag-server", `+OK 1 messages (145920 octets)`, "access", false, true);
  logEvent("POP3", "tag-server", `1 145920`, "access", false, true);
  logEvent("POP3", "tag-server", `.`, "access", false, true);
  await delay(350);

  // RETR command
  logEvent("POP3", "tag-client", `RETR 1`, "access", true, false);
  await delay(350);
  logEvent("POP3", "tag-server", `+OK 145920 octets follow...`, "access", false, true);
  logEvent("POP3", "tag-server", `[Full raw RFC 5322 message stream downloaded to client disk]`, "access");
  logEvent("POP3", "tag-server", `.`, "access", false, true);
  await delay(400);

  // Client inbox displays downloaded email
  state.clientInbox = [{
    from: dom.fromAddress.value,
    subject: dom.emailSubject.value,
    body: dom.emailBody.value,
    hasAttachment: state.hasAttachment,
    retrievedProtocol: 'POP3 (Port 995)',
    flag: 'Local Only'
  }];

  // DELE command handling
  if (state.pop3Delete) {
    logEvent("POP3", "tag-client", `DELE 1`, "access", true, false);
    await delay(300);
    logEvent("POP3", "tag-server", `+OK Message 1 marked as deleted`, "access", false, true);
    await delay(350);

    logEvent("POP3", "tag-client", `QUIT`, "access", true, false);
    await delay(300);
    logEvent("POP3", "tag-server", `+OK mail.example.org POP3 server signing off (1 message expunged)`, "access", false, true);

    // Delete message from server
    if (state.serverMailbox.length > 0) {
      state.serverMailbox[0].isDeleted = true;
    }
    logEvent("POP3", "tag-info", `POP3 Download-and-Delete: Message is now removed from server spool. Only local copy exists.`, "access");
  } else {
    logEvent("POP3", "tag-info", `[Config: Keep copy on server] Skipping DELE command.`, "access");
    await delay(250);
    logEvent("POP3", "tag-client", `QUIT`, "access", true, false);
    await delay(300);
    logEvent("POP3", "tag-server", `+OK mail.example.org POP3 server signing off (0 messages deleted)`, "access", false, true);
    logEvent("POP3", "tag-info", `POP3 Download-and-Keep: Message preserved on server spool.`, "access");
  }

  renderServerMailbox();
  renderClientInbox();
}

// Render Server Mailbox UI
function renderServerMailbox() {
  if (state.serverMailbox.length === 0) {
    dom.serverMailboxBadge.textContent = "Empty (0 messages)";
    dom.serverMailboxBadge.className = "mailbox-state-badge";
    dom.serverMailboxContent.innerHTML = `
      <div class="empty-mailbox-msg">
        No email currently stored in recipient mailbox spool. Waiting for incoming SMTP delivery...
      </div>
    `;
    return;
  }

  const msg = state.serverMailbox[0];
  if (msg.isDeleted) {
    dom.serverMailboxBadge.textContent = "Purged / Deleted";
    dom.serverMailboxBadge.className = "mailbox-state-badge deleted";
    dom.serverMailboxContent.innerHTML = `
      <div class="email-item-card is-deleted">
        <div class="email-item-header">
          <span class="email-item-subject">🗑️ ${escapeHtml(msg.subject)}</span>
          <span style="font-size: 0.72rem; color: var(--accent-rose);">DELETED (POP3 DELE)</span>
        </div>
        <div class="email-item-from">From: ${escapeHtml(msg.from)}</div>
        <div class="email-item-snippet" style="font-style: italic; color: var(--slate-400);">
          Message file unlinked from /var/mail/bob spool.
        </div>
      </div>
    `;
  } else {
    dom.serverMailboxBadge.textContent = "1 Stored Message";
    dom.serverMailboxBadge.className = "mailbox-state-badge synced";
    const flagBadges = msg.flags.map(f => `<span class="flag-pill">${f}</span>`).join(' ');

    dom.serverMailboxContent.innerHTML = `
      <div class="email-item-card">
        <div class="email-item-header">
          <span class="email-item-subject">✉️ ${escapeHtml(msg.subject)}</span>
          <span style="font-size: 0.72rem; color: var(--slate-500);">${msg.receivedAt}</span>
        </div>
        <div class="email-item-from">From: ${escapeHtml(msg.from)}</div>
        <div class="email-item-snippet">${escapeHtml(msg.body.substring(0, 90))}...</div>
        <div class="email-item-footer">
          <span>Flags: ${flagBadges}</span>
          ${msg.hasAttachment ? '<span style="color: var(--primary-700); font-weight: 700;">📎 Attachment</span>' : ''}
        </div>
      </div>
    `;
  }
}

// Render Client Inbox UI
function renderClientInbox() {
  if (state.clientInbox.length === 0) {
    dom.clientInboxBadge.textContent = "Not Synced";
    dom.clientInboxBadge.className = "mailbox-state-badge";
    dom.clientInboxContent.innerHTML = `
      <div class="empty-mailbox-msg">
        Client has not yet initiated mail retrieval session.
      </div>
    `;
    return;
  }

  const msg = state.clientInbox[0];
  dom.clientInboxBadge.textContent = "Downloaded & Viewed";
  dom.clientInboxBadge.className = "mailbox-state-badge synced";

  dom.clientInboxContent.innerHTML = `
    <div class="email-item-card" style="border-left: 4px solid var(--accent-emerald);">
      <div class="email-item-header">
        <span class="email-item-subject">📥 ${escapeHtml(msg.subject)}</span>
        <span class="flag-pill" style="background: var(--accent-emerald-light); color: var(--accent-emerald-dark);">${msg.retrievedProtocol}</span>
      </div>
      <div class="email-item-from">From: ${escapeHtml(msg.from)}</div>
      <div class="email-item-snippet" style="margin-top: 6px; white-space: pre-line;">${escapeHtml(msg.body)}</div>
      <div class="email-item-footer" style="margin-top: 10px; border-top: 1px solid var(--slate-100); padding-top: 6px;">
        <span style="font-weight: 700; color: var(--primary-800);">Status: ${msg.flag}</span>
        ${msg.hasAttachment ? '<span style="color: var(--primary-700); font-weight: 700;">📎 CN_Group_Report.pdf (142 KB)</span>' : ''}
      </div>
    </div>
  `;
}
