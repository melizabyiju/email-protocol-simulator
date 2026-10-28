// ============================================================================
// EMAIL FLOW SIMULATOR - Clean Core Script
// Smooth Traversal, Centered Envelope, Collapsible Protocol Terminal
// ============================================================================

const state = {
    isAnimating: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 5,
    protocol: 'imap',
    pop3Delete: true,
    stepDelay: 1200,
    message: null,
    timer: null
};

// DOM References
const elements = {
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    nextBtn: document.getElementById('nextBtn'),
    resetBtn: document.getElementById('resetBtn'),
    protocolSelect: document.getElementById('protocolSelect'),
    pop3OptionWrapper: document.getElementById('pop3OptionWrapper'),
    pop3DeleteChk: document.getElementById('pop3DeleteChk'),
    toggleLogBtn: document.getElementById('toggleLogBtn'),
    terminalWrapper: document.getElementById('terminalWrapper'),
    btnClearLog: document.getElementById('btnClearLog'),
    smtpLog: document.getElementById('smtpLog'),

    // Pipeline
    pipelineTrack: document.getElementById('pipelineTrack'),
    envelope: document.getElementById('envelope'),
    memberBadge: document.getElementById('memberBadge'),
    actionText: document.getElementById('actionText'),

    // Form
    fromEmail: document.getElementById('fromEmail'),
    toEmail: document.getElementById('toEmail'),
    subject: document.getElementById('subject'),
    message: document.getElementById('message'),
    chkAttachment: document.getElementById('chkAttachment'),

    // Storage
    serverBadge: document.getElementById('serverBadge'),
    serverMailbox: document.getElementById('serverMailbox'),
    clientBadge: document.getElementById('clientBadge'),
    clientMailbox: document.getElementById('clientMailbox'),
    protocolBadge: document.getElementById('protocolBadge')
};

// Narration for each stage
const narrationData = [
    {
        member: "Member 1: Sender (Alice)",
        text: "Composing email and initiating SMTP connection on port 587 (Submission)."
    },
    {
        member: "Member 2: SMTP Server",
        text: "Authenticating sender, queuing message in spool, and looking up recipient DNS MX record."
    },
    {
        member: "Member 3: Internet & Network",
        text: "Routers forwarding TCP packets across the network hops to destination mail server."
    },
    {
        member: "Member 4: Recipient Server",
        text: "Incoming server validates mailbox address and deposits email into /var/mail/bob."
    },
    {
        member: "Member 5: Receiver (Bob)",
        text: "Client retrieves email using IMAP (stays on server) or POP3 (downloaded to device)."
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    // Position envelope at Node 1 initially
    setTimeout(() => updateEnvelopePosition(0), 100);
});

window.addEventListener('resize', () => {
    updateEnvelopePosition(state.currentStep);
});

function initEvents() {
    elements.startBtn.addEventListener('click', handleStart);
    elements.pauseBtn.addEventListener('click', handlePauseResume);
    elements.nextBtn.addEventListener('click', handleNextStep);
    elements.resetBtn.addEventListener('click', handleReset);

    elements.protocolSelect.addEventListener('change', handleProtocolChange);
    elements.pop3DeleteChk.addEventListener('change', (e) => state.pop3Delete = e.target.checked);

    elements.toggleLogBtn.addEventListener('click', toggleTerminal);
    elements.btnClearLog.addEventListener('click', clearLog);
}

// Terminal Visibility Toggle
function toggleTerminal() {
    const isHidden = elements.terminalWrapper.style.display === 'none';
    if (isHidden) {
        elements.terminalWrapper.style.display = 'block';
        elements.toggleLogBtn.textContent = 'Hide Protocol Terminal';
        elements.toggleLogBtn.classList.add('active');
        elements.smtpLog.scrollTop = elements.smtpLog.scrollHeight;
    } else {
        elements.terminalWrapper.style.display = 'none';
        elements.toggleLogBtn.textContent = 'Show Protocol Terminal';
        elements.toggleLogBtn.classList.remove('active');
    }
}

// Protocol Change
function handleProtocolChange(e) {
    state.protocol = e.target.value;
    elements.protocolBadge.textContent = state.protocol.toUpperCase();
    elements.pop3OptionWrapper.style.display = state.protocol === 'pop3' ? 'flex' : 'none';

    // If already at step 5 and mailbox has content, re-render step 5
    if (state.currentStep === 4 && state.message) {
        executeStep5();
    }
}

// Start simulation
async function handleStart() {
    if (state.isAnimating && !state.isPaused) return;

    if (!readMessageForm()) return;

    state.isAnimating = true;
    state.isPaused = false;
    state.currentStep = 0;

    elements.startBtn.disabled = true;
    elements.pauseBtn.style.display = 'inline-flex';
    elements.pauseBtn.textContent = 'Pause';
    elements.nextBtn.disabled = true;

    clearLog();
    runPipelineSequence();
}

// Pause / Resume
function handlePauseResume() {
    if (!state.isAnimating) return;

    state.isPaused = !state.isPaused;
    elements.pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';

    if (!state.isPaused) {
        runPipelineSequence();
    } else {
        clearTimeout(state.timer);
    }
}

// Step-by-Step Advance
async function handleNextStep() {
    if (!state.message && !readMessageForm()) return;

    if (state.currentStep < state.totalSteps - 1) {
        state.currentStep++;
        updateVisualStage(state.currentStep);
        await executeStep(state.currentStep);
    } else if (state.currentStep === state.totalSteps - 1) {
        // Already at last step
        state.isAnimating = false;
        elements.startBtn.disabled = false;
        elements.nextBtn.disabled = false;
    }
}

// Reset
function handleReset() {
    clearTimeout(state.timer);
    state.isAnimating = false;
    state.isPaused = false;
    state.currentStep = 0;
    state.message = null;

    elements.startBtn.disabled = false;
    elements.pauseBtn.style.display = 'none';
    elements.nextBtn.disabled = false;

    elements.memberBadge.textContent = 'Ready';
    elements.actionText.textContent = 'Click "Start Simulation" to begin the demonstration.';

    // Reset visual nodes
    for (let i = 1; i <= state.totalSteps; i++) {
        const node = document.getElementById(`node-${i}`);
        if (node) node.className = (i === 1) ? 'node-wrapper active' : 'node-wrapper';
    }

    // Reset timeline
    document.querySelectorAll('.timeline-step').forEach((el, idx) => {
        el.className = (idx === 0) ? 'timeline-step active' : 'timeline-step';
    });

    // Reset storage
    elements.serverBadge.textContent = 'Empty';
    elements.serverBadge.className = 'status-badge';
    elements.serverMailbox.innerHTML = '<div class="empty-state">No email on server</div>';

    elements.clientBadge.textContent = 'Waiting';
    elements.clientBadge.className = 'status-badge';
    elements.clientMailbox.innerHTML = '<div class="empty-state">Inbox empty</div>';

    updateEnvelopePosition(0);
    clearLog();
}

// Read and validate form
function readMessageForm() {
    const from = elements.fromEmail.value.trim();
    const to = elements.toEmail.value.trim();
    const subject = elements.subject.value.trim();
    const body = elements.message.value.trim();
    const hasAttachment = elements.chkAttachment.checked;

    if (!from || !to || !subject || !body) {
        alert('Please fill in all email fields.');
        return false;
    }

    state.message = { from, to, subject, body, hasAttachment };
    return true;
}

// Pipeline Sequential Loop
async function runPipelineSequence() {
    while (state.isAnimating && !state.isPaused && state.currentStep < state.totalSteps) {
        updateVisualStage(state.currentStep);
        await executeStep(state.currentStep);

        if (state.currentStep < state.totalSteps - 1) {
            await sleep(state.stepDelay);
            if (!state.isPaused && state.isAnimating) {
                state.currentStep++;
            }
        } else {
            // Completed
            state.isAnimating = false;
            elements.startBtn.disabled = false;
            elements.pauseBtn.style.display = 'none';
            elements.nextBtn.disabled = false;
            elements.memberBadge.textContent = 'Completed';
            elements.actionText.textContent = 'Email delivery and retrieval simulation complete.';
            break;
        }
    }
}

// Update Visual Nodes, Timeline, and Centered Envelope Position
function updateVisualStage(stepIndex) {
    // Update narration
    const narration = narrationData[stepIndex];
    if (narration) {
        elements.memberBadge.textContent = narration.member;
        elements.actionText.textContent = narration.text;
    }

    // Highlight nodes with subtle active/completed states
    for (let i = 1; i <= state.totalSteps; i++) {
        const node = document.getElementById(`node-${i}`);
        if (!node) continue;
        node.className = 'node-wrapper';
        if (i - 1 === stepIndex) {
            node.classList.add('active');
        } else if (i - 1 < stepIndex) {
            node.classList.add('completed');
        }
    }

    // Update Timeline Stepper
    document.querySelectorAll('.timeline-step').forEach((el, idx) => {
        el.className = 'timeline-step';
        if (idx === stepIndex) {
            el.classList.add('active');
        } else if (idx < stepIndex) {
            el.classList.add('completed');
        }
    });

    // Move envelope smoothly to exact center of the active circle
    updateEnvelopePosition(stepIndex);
}

// Calculate exact center of the node circle relative to track
function updateEnvelopePosition(stepIndex) {
    const nodeWrapper = document.getElementById(`node-${stepIndex + 1}`);
    const track = elements.pipelineTrack;
    if (!nodeWrapper || !track) return;

    const nodeCircle = nodeWrapper.querySelector('.node-circle');
    const trackRect = track.getBoundingClientRect();
    const circleRect = nodeCircle.getBoundingClientRect();

    const centerX = circleRect.left - trackRect.left + (circleRect.width / 2);
    elements.envelope.style.left = `${centerX}px`;
}

// Execute Protocol Events by Step
async function executeStep(stepIndex) {
    switch (stepIndex) {
        case 0:
            await executeStep1();
            break;
        case 1:
            await executeStep2();
            break;
        case 2:
            await executeStep3();
            break;
        case 3:
            await executeStep4();
            break;
        case 4:
            await executeStep5();
            break;
    }
}

// Step 1: Sender / User Agent (Member 1)
async function executeStep1() {
    log('Connecting to Outgoing SMTP Server on port 587 (Submission)...', 'info');
    await sleep(250);
    log('220 smtp.example.com ESMTP Postfix Ready');
    await sleep(250);
    log('EHLO client.example.com', 'command');
    await sleep(200);
    log('250-smtp.example.com Hello client.example.com');
    log('250-SIZE 35882577');
    log('250-STARTTLS');
    log('250 OK');
}

// Step 2: Outgoing SMTP Server (Member 2)
async function executeStep2() {
    log(`AUTH PLAIN ${btoa('\0alice\0password')}`, 'command');
    await sleep(200);
    log('235 2.7.0 Authentication successful');
    await sleep(200);

    log(`MAIL FROM:<${state.message.from}>`, 'command');
    await sleep(150);
    log('250 2.1.0 Sender OK');

    log(`RCPT TO:<${state.message.to}>`, 'command');
    await sleep(150);
    log('250 2.1.5 Recipient OK');

    log('DATA', 'command');
    await sleep(150);
    log('354 Enter mail, end with "." on a line by itself');
    log(`From: ${state.message.from}`);
    log(`To: ${state.message.to}`);
    log(`Subject: ${state.message.subject}`);
    if (state.message.hasAttachment) {
        log('Content-Type: multipart/mixed; boundary="----=_NextPart"');
        log('Content-Type: application/pdf; name="document.pdf"');
        log('[Base64 PDF Attachment Stream]');
    } else {
        log(`Body: ${state.message.body}`);
    }
    log('.', 'command');
    await sleep(200);
    log('250 2.0.0 OK: queued as 4XpQzL5mBmz2 (Stored in Spool Queue)');

    const domain = state.message.to.split('@')[1] || 'example.com';
    await sleep(250);
    log(`[DNS] Resolving MX records for domain '${domain}'...`, 'net');
    await sleep(200);
    log(`[DNS] Answer: ${domain} IN MX 10 mail.${domain} (IP: 198.51.100.25)`, 'net');
}

// Step 3: Internet & Network (Member 3)
async function executeStep3() {
    const domain = state.message.to.split('@')[1] || 'example.com';
    log(`[TCP] Initiating 3-way handshake from smtp.example.com to mail.${domain}:25`, 'net');
    await sleep(250);
    log('[TCP] SYN -> SYN-ACK -> ACK [ESTABLISHED]', 'net');
    await sleep(200);
    log(`[IP] Packets routed across autonomous routers to mail.${domain}`, 'net');
    await sleep(200);

    log(`220 mail.${domain} ESMTP Incoming Relay Ready`);
    log('EHLO smtp.example.com', 'command');
    log(`250 mail.${domain} greets smtp.example.com`);
    log(`MAIL FROM:<${state.message.from}>`, 'command');
    log('250 2.1.0 OK');
    log(`RCPT TO:<${state.message.to}>`, 'command');
    log('250 2.1.5 OK');
    log('DATA', 'command');
    log('354 Go ahead');
    log('.', 'command');
    log('250 2.0.0 Message accepted for local spool');
}

// Step 4: Recipient Server (Member 4)
async function executeStep4() {
    log(`[MTA] Validating recipient mailbox '${state.message.to}'... OK`, 'info');
    await sleep(200);
    log('[MTA] Anti-spam & antivirus checks passed (Score: 0.0/5.0)', 'info');
    await sleep(200);
    log('[Delivery Agent] Depositing RFC 5322 message into /var/mail/bob', 'info');
    log('250 Delivered to mailbox storage');

    // Update Server Mailbox UI
    elements.serverBadge.textContent = 'Stored (1)';
    elements.serverBadge.className = 'status-badge active';
    elements.serverMailbox.innerHTML = `
        <div class="message-box">
            <div class="msg-subject">${escapeHtml(state.message.subject)}</div>
            <div class="msg-meta">From: ${escapeHtml(state.message.from)}</div>
            ${state.message.hasAttachment ? '<div style="font-size: 0.74rem; color: #2563eb; margin-top: 3px;">📎 Attachment (PDF)</div>' : ''}
        </div>
    `;
}

// Step 5: Receiver Client (Member 5: IMAP vs POP3)
async function executeStep5() {
    if (state.protocol === 'imap') {
        await executeIMAP();
    } else {
        await executePOP3();
    }
}

// IMAP Protocol Execution
async function executeIMAP() {
    log('[IMAP] Connecting to mail.example.com on port 993 (IMAPS)...', 'info');
    await sleep(200);
    log('* OK IMAP4rev1 Server Ready');
    await sleep(150);
    log('A1 LOGIN bob password', 'command');
    await sleep(150);
    log('A1 OK Logged in');
    log('A2 SELECT INBOX', 'command');
    log('A2 OK [READ-WRITE] INBOX selected (1 message)');
    await sleep(150);
    log('A3 FETCH 1 (FLAGS BODY[])', 'command');
    log('A3 OK Fetch completed');
    log('A4 STORE 1 +FLAGS (\\Seen)', 'command');
    log('A4 OK Flag updated (\\Seen)');
    log('A5 LOGOUT', 'command');
    log('* BYE IMAP Server signing off');
    log('[IMAP] Message synchronized to client & safely retained on server.', 'info');

    // Update Client UI
    elements.clientBadge.textContent = 'Synced (IMAP)';
    elements.clientBadge.className = 'status-badge active';
    elements.clientMailbox.innerHTML = `
        <div class="message-box">
            <div class="msg-subject">${escapeHtml(state.message.subject)}</div>
            <div class="msg-meta">From: ${escapeHtml(state.message.from)} • Flags: \\Seen</div>
            <div class="msg-snippet">${escapeHtml(state.message.body)}</div>
        </div>
    `;

    // Server mailbox still holds the message
    elements.serverBadge.textContent = 'Stored (\\Seen)';
    elements.serverBadge.className = 'status-badge active';
}

// POP3 Protocol Execution
async function executePOP3() {
    log('[POP3] Connecting to mail.example.com on port 995 (POP3S)...', 'info');
    await sleep(200);
    log('+OK POP3 Server Ready');
    await sleep(150);
    log('USER bob', 'command');
    log('+OK Password required');
    await sleep(150);
    log('PASS password', 'command');
    log('+OK Logged in (1 message)');
    log('STAT', 'command');
    log('+OK 1 14592');
    log('RETR 1', 'command');
    log('+OK 14592 octets follow...');

    // Update Client UI
    elements.clientBadge.textContent = 'Downloaded (POP3)';
    elements.clientBadge.className = 'status-badge active';
    elements.clientMailbox.innerHTML = `
        <div class="message-box">
            <div class="msg-subject">${escapeHtml(state.message.subject)}</div>
            <div class="msg-meta">From: ${escapeHtml(state.message.from)} • Local copy</div>
            <div class="msg-snippet">${escapeHtml(state.message.body)}</div>
        </div>
    `;

    if (state.pop3Delete) {
        await sleep(200);
        log('DELE 1', 'command');
        log('+OK Message marked for deletion');
        await sleep(150);
        log('QUIT', 'command');
        log('+OK Goodbye (1 message removed from server)');
        log('[POP3] Message downloaded to device & purged from server storage.', 'info');

        // Server mailbox marked deleted
        elements.serverBadge.textContent = 'Deleted';
        elements.serverBadge.className = 'status-badge deleted';
        elements.serverMailbox.innerHTML = `
            <div class="message-box" style="text-decoration: line-through; opacity: 0.5;">
                <div class="msg-subject">${escapeHtml(state.message.subject)}</div>
                <div class="msg-meta">Removed from server spool (DELE)</div>
            </div>
        `;
    } else {
        await sleep(150);
        log('QUIT', 'command');
        log('+OK Goodbye (Message preserved on server)');
        log('[POP3] Message downloaded to device & copy preserved on server.', 'info');
        elements.serverBadge.textContent = 'Kept copy';
    }
}

// Terminal Logging Helper
function log(text, type = 'response') {
    const entry = document.createElement('div');
    entry.className = type;
    entry.textContent = text;
    elements.smtpLog.appendChild(entry);
    elements.smtpLog.scrollTop = elements.smtpLog.scrollHeight;
}

function clearLog() {
    elements.smtpLog.innerHTML = '<div class="info"># Terminal ready. Log begins on transmission...</div>';
}

function sleep(ms) {
    return new Promise(resolve => {
        state.timer = setTimeout(resolve, ms);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
