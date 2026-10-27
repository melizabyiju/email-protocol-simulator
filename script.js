// ============================================================================
// EMAIL FLOW SIMULATOR - Clean Educational Script
// 5-Member Role Play Sequence: Sender, SMTP, Internet, Server, Receiver
// ============================================================================

const state = {
    isAnimating: false,
    isPaused: false,
    currentStep: 0,
    speed: 2,
    protocol: 'imap',
    tlsEnabled: false,
    rawLogEnabled: true,
    hasAttachment: false,
    pop3Delete: true,
    message: null
};

// DOM Elements
const elements = {
    sendBtn: document.getElementById('sendBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    stepBtn: document.getElementById('stepBtn'),
    resetBtn: document.getElementById('resetBtn'),
    protocolToggle: document.getElementById('protocolToggle'),
    rawLogToggle: document.getElementById('rawLogToggle'),
    tlsToggle: document.getElementById('tlsToggle'),
    pop3OptionGroup: document.getElementById('pop3OptionGroup'),
    pop3DeleteToggle: document.getElementById('pop3DeleteToggle'),
    speedSlider: document.getElementById('speedSlider'),
    speedValue: document.getElementById('speedValue'),
    emailForm: document.getElementById('emailForm'),
    envelope: document.getElementById('envelope'),
    smtpLog: document.getElementById('smtpLog'),
    serverMailbox: document.getElementById('serverMailbox'),
    clientMailbox: document.getElementById('clientMailbox'),
    serverStatusLabel: document.getElementById('serverStatusLabel'),
    protocolInfo: document.getElementById('protocolInfo'),
    protocolLabel: document.getElementById('protocolLabel'),
    syncIndicator: document.getElementById('syncIndicator'),
    memberBadge: document.getElementById('memberBadge'),
    actionText: document.getElementById('actionText')
};

// Node IDs for animation
const nodeIds = ['sender', 'mta-out', 'internet', 'mta-in', 'receiver'];

// Audience Narration Info per Step
const stepInfo = {
    0: {
        member: "Member 1: Sender (Alice)",
        text: "Composing email and submitting to Outgoing SMTP server via port 587 (Push protocol)."
    },
    1: {
        member: "Member 2: SMTP Server",
        text: "Verifying credentials, storing in outgoing queue spool, and querying DNS for recipient MX record."
    },
    2: {
        member: "Member 3: Internet & Network",
        text: "Routers forwarding TCP/IP packets across the Internet to destination mail server."
    },
    3: {
        member: "Member 4: Recipient Server",
        text: "Incoming server validates mailbox and stores message safely in recipient's server mailbox."
    },
    4: {
        member: "Member 5: Receiver (Bob)",
        text: "Client retrieves email using IMAP (message stays on server) or POP3 (downloads to local machine)."
    }
};

// Initialize Event Listeners
function initEventListeners() {
    elements.sendBtn.addEventListener('click', handleSend);
    elements.pauseBtn.addEventListener('click', handlePause);
    elements.stepBtn.addEventListener('click', handleStep);
    elements.resetBtn.addEventListener('click', handleReset);
    elements.protocolToggle.addEventListener('change', handleProtocolChange);
    elements.rawLogToggle.addEventListener('change', (e) => state.rawLogEnabled = e.target.checked);
    elements.tlsToggle.addEventListener('change', (e) => state.tlsEnabled = e.target.checked);
    elements.pop3DeleteToggle.addEventListener('change', (e) => state.pop3Delete = e.target.checked);
    elements.speedSlider.addEventListener('input', handleSpeedChange);

    elements.emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSend();
    });
}

// Handle Protocol Switch
function handleProtocolChange(e) {
    state.protocol = e.target.value;
    elements.protocolLabel.textContent = state.protocol.toUpperCase();
    elements.pop3OptionGroup.style.display = state.protocol === 'pop3' ? 'flex' : 'none';

    if (state.protocol === 'imap') {
        elements.protocolInfo.innerHTML = `
            <h3>📚 IMAP (RFC 3501)</h3>
            <p><strong>Key Feature:</strong> Messages stay on the server. Multiple devices can access and synchronize status (e.g. read/unread).</p>
        `;
    } else {
        elements.protocolInfo.innerHTML = `
            <h3>📚 POP3 (RFC 1939)</h3>
            <p><strong>Key Feature:</strong> Downloads messages to local client device. Typically removes message from server after retrieval.</p>
        `;
    }
}

// Handle Speed Slider
function handleSpeedChange(e) {
    state.speed = parseInt(e.target.value, 10);
    elements.speedValue.textContent = state.speed + 'x';
}

// Handle Send
function handleSend() {
    if (state.isAnimating) return;

    state.message = {
        from: document.getElementById('fromEmail').value,
        to: document.getElementById('toEmail').value,
        subject: document.getElementById('subject').value,
        message: document.getElementById('message').value,
        hasAttachment: document.getElementById('hasAttachment').checked
    };

    if (!state.message.from || !state.message.to || !state.message.subject) {
        alert('Please fill in required email fields.');
        return;
    }

    state.isAnimating = true;
    state.isPaused = false;
    state.currentStep = 0;

    elements.sendBtn.disabled = true;
    elements.pauseBtn.style.display = 'inline-block';
    elements.pauseBtn.textContent = 'Pause';
    elements.stepBtn.style.display = 'inline-block';

    if (state.message.hasAttachment) {
        elements.envelope.classList.add('large');
    } else {
        elements.envelope.classList.remove('large');
    }

    clearLogs();
    runPipeline();
}

// Handle Pause / Resume
function handlePause() {
    state.isPaused = !state.isPaused;
    elements.pauseBtn.textContent = state.isPaused ? 'Resume' : 'Pause';
    if (!state.isPaused) {
        runPipeline();
    }
}

// Handle Step
function handleStep() {
    if (state.isPaused) {
        state.isPaused = false;
        runPipeline();
        setTimeout(() => {
            state.isPaused = true;
            elements.pauseBtn.textContent = 'Resume';
        }, 150);
    }
}

// Handle Reset
function handleReset() {
    state.isAnimating = false;
    state.isPaused = false;
    state.currentStep = 0;
    state.message = null;

    elements.sendBtn.disabled = false;
    elements.pauseBtn.style.display = 'none';
    elements.stepBtn.style.display = 'none';
    elements.pauseBtn.textContent = 'Pause';
    elements.syncIndicator.style.display = 'none';

    elements.memberBadge.textContent = "Ready";
    elements.actionText.textContent = "Click 'Send Email' to begin the demonstration.";

    resetVisuals();
    clearLogs();
}

function resetVisuals() {
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.status-bubble').forEach(b => {
        b.textContent = '';
        b.className = 'status-bubble';
    });
    document.querySelectorAll('.timeline-step').forEach(t => t.classList.remove('active'));

    elements.envelope.style.left = '4%';
    elements.serverMailbox.innerHTML = '<div class="empty-msg">No mail on server</div>';
    elements.clientMailbox.innerHTML = '<div class="empty-msg">Inbox empty</div>';
    elements.serverStatusLabel.textContent = 'Empty';
}

function clearLogs() {
    elements.smtpLog.innerHTML = '<div class="info"># Terminal ready...</div>';
}

// Main Step-by-Step Flow
async function runPipeline() {
    const steps = [
        { name: 'sender', action: step1Sender },
        { name: 'mta-out', action: step2SMTP },
        { name: 'internet', action: step3Internet },
        { name: 'mta-in', action: step4RecipientServer },
        { name: 'receiver', action: step5Receiver }
    ];

    while (state.isAnimating && !state.isPaused && state.currentStep < steps.length) {
        const stepIndex = state.currentStep;
        const step = steps[stepIndex];

        // Update Audience Banner
        elements.memberBadge.textContent = stepInfo[stepIndex].member;
        elements.actionText.textContent = stepInfo[stepIndex].text;

        // Update Timeline
        updateTimeline(stepIndex + 1);

        // Highlight Active Node
        highlightNode(step.name);

        // Move Envelope
        moveEnvelope(stepIndex, steps.length);

        // Execute Protocol Events for this step
        await step.action();

        if (state.isPaused) break;

        // Pause slightly between steps
        await wait(1000 / state.speed);

        state.currentStep++;
    }

    if (state.currentStep >= steps.length) {
        state.isAnimating = false;
        elements.sendBtn.disabled = false;
        elements.pauseBtn.style.display = 'none';
        elements.stepBtn.style.display = 'none';
        elements.memberBadge.textContent = "Completed";
        elements.actionText.textContent = "Simulation finished! Email delivered and retrieved successfully.";
    }
}

// Move Envelope smoothly across the nodes
function moveEnvelope(stepIndex, totalSteps) {
    const percentages = ['4%', '27%', '50%', '73%', '96%'];
    elements.envelope.style.left = percentages[stepIndex] || '4%';
}

// Highlight Active Node
function highlightNode(nodeName) {
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
    const active = document.getElementById(`node-${nodeName}`);
    if (active) active.classList.add('active');
}

// Update Timeline
function updateTimeline(stepNumber) {
    document.querySelectorAll('.timeline-step').forEach((el, index) => {
        if (index + 1 <= stepNumber) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

// Logging Helper
function addLog(text, type = 'response') {
    if (!state.rawLogEnabled && type !== 'command' && type !== 'response') return;
    const entry = document.createElement('div');
    entry.className = type;
    entry.textContent = text;
    elements.smtpLog.appendChild(entry);
    elements.smtpLog.scrollTop = elements.smtpLog.scrollHeight;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// STEP 1: Sender / User Agent (Member 1)
// ============================================================================
async function step1Sender() {
    addLog(`Connecting to Outgoing SMTP Server on port ${state.tlsEnabled ? '587 (TLS)' : '25'}...`, 'info');
    await wait(400 / state.speed);
    addLog('220 smtp.example.com ESMTP Postfix Ready');
    await wait(300 / state.speed);
    addLog('EHLO client.example.com', 'command');
    await wait(300 / state.speed);
    addLog('250-smtp.example.com Hello client.example.com');
    addLog('250-SIZE 35882577');
    if (state.tlsEnabled) {
        addLog('250-STARTTLS');
        await wait(250 / state.speed);
        addLog('STARTTLS', 'command');
        await wait(250 / state.speed);
        addLog('220 Ready to start TLS');
        addLog('[TLS Handshake: TLSv1.3 AES-256-GCM completed]', 'net');
    }
    addLog('250 OK');
}

// ============================================================================
// STEP 2: SMTP Outgoing Server (Member 2)
// ============================================================================
async function step2SMTP() {
    const bubble = document.getElementById('status-mta-out');
    bubble.textContent = 'Authenticating';
    bubble.classList.add('visible');

    await wait(300 / state.speed);
    addLog(`AUTH PLAIN ${btoa('\0alice\0password')}`, 'command');
    await wait(300 / state.speed);
    addLog('235 Authentication successful');

    await wait(250 / state.speed);
    addLog(`MAIL FROM:<${state.message.from}>`, 'command');
    await wait(250 / state.speed);
    addLog('250 2.1.0 OK');

    await wait(250 / state.speed);
    addLog(`RCPT TO:<${state.message.to}>`, 'command');
    await wait(250 / state.speed);
    addLog('250 2.1.5 OK');

    await wait(250 / state.speed);
    addLog('DATA', 'command');
    await wait(250 / state.speed);
    addLog('354 End data with <CR><LF>.<CR><LF>');
    addLog(`From: ${state.message.from}`);
    addLog(`To: ${state.message.to}`);
    addLog(`Subject: ${state.message.subject}`);
    if (state.message.hasAttachment) {
        addLog('Content-Type: multipart/mixed; boundary="boundary123"');
        addLog('--boundary123');
        addLog('Content-Type: text/plain');
        addLog(state.message.message);
        addLog('--boundary123');
        addLog('Content-Type: application/pdf; filename="document.pdf"');
        addLog('[Base64 Encoded Attachment Payload]');
        addLog('--boundary123--');
    } else {
        addLog(`Message: ${state.message.message}`);
    }
    addLog('.', 'command');

    await wait(350 / state.speed);
    addLog('250 Message accepted for delivery (Queued)');
    bubble.textContent = 'Queued';

    await wait(400 / state.speed);
    bubble.textContent = 'DNS MX Lookup';
    bubble.classList.add('processing');
    const recipientDomain = state.message.to.split('@')[1] || 'example.com';
    addLog(`[DNS] Querying MX record for domain '${recipientDomain}'...`, 'net');
    await wait(400 / state.speed);
    addLog(`[DNS] MX Found: mail.${recipientDomain} (Priority 10)`, 'net');
}

// ============================================================================
// STEP 3: Internet & Network (Member 3)
// ============================================================================
async function step3Internet() {
    const bubble = document.getElementById('status-internet');
    bubble.textContent = 'Routing';
    bubble.classList.add('visible', 'processing');

    addLog('[TCP] 3-Way Handshake SYN -> SYN-ACK -> ACK [ESTABLISHED]', 'net');
    await wait(400 / state.speed);
    addLog('[IP] Packets routed across network hops to recipient server', 'net');
    await wait(400 / state.speed);
    addLog('220 mail.example.com ESMTP Incoming Relay Ready');
    await wait(300 / state.speed);
    addLog('EHLO smtp.example.com', 'command');
    await wait(300 / state.speed);
    addLog('250 mail.example.com greets smtp.example.com');
    addLog(`MAIL FROM:<${state.message.from}>`, 'command');
    addLog('250 OK');
    addLog(`RCPT TO:<${state.message.to}>`, 'command');
    addLog('250 OK');
    addLog('DATA', 'command');
    addLog('354 Send data');
    addLog('.', 'command');
    addLog('250 Message accepted for local spool');
}

// ============================================================================
// STEP 4: Recipient Server (Member 4)
// ============================================================================
async function step4RecipientServer() {
    const bubble = document.getElementById('status-mta-in');
    bubble.textContent = 'Validating';
    bubble.classList.add('visible', 'processing');

    addLog('[MTA] Validating recipient mailbox address...', 'info');
    await wait(400 / state.speed);
    addLog('[MTA] Spam check passed (Score: 0.0/5.0)', 'info');
    await wait(400 / state.speed);
    addLog('[Delivery Agent] Writing email to /var/mail/bob', 'info');

    bubble.textContent = 'Delivered';
    bubble.classList.remove('processing');
    bubble.classList.add('delivered');

    // Add to Server Mailbox
    elements.serverMailbox.innerHTML = `
        <div class="message-item" id="serverMsgItem">
            <div class="subject">${escapeHtml(state.message.subject)}</div>
            <div class="from">From: ${escapeHtml(state.message.from)}</div>
            ${state.message.hasAttachment ? '<div style="font-size: 0.75em; color: #2563eb; margin-top: 3px;">📎 Attachment (document.pdf)</div>' : ''}
        </div>
    `;
    elements.serverStatusLabel.textContent = '1 Message';
    addLog('250 Delivered to recipient mailbox');
}

// ============================================================================
// STEP 5: Receiver Client (Member 5: IMAP vs POP3)
// ============================================================================
async function step5Receiver() {
    if (state.protocol === 'imap') {
        await runIMAP();
    } else {
        await runPOP3();
    }
}

// IMAP Protocol Execution
async function runIMAP() {
    elements.syncIndicator.style.display = 'inline-block';
    addLog(`[IMAP] Connecting to port ${state.tlsEnabled ? '993 (IMAPS)' : '143'}...`, 'info');
    await wait(300 / state.speed);
    addLog('* OK IMAP4rev1 Server Ready');
    await wait(250 / state.speed);
    addLog('A1 LOGIN bob password', 'command');
    await wait(250 / state.speed);
    addLog('A1 OK Logged in');
    await wait(250 / state.speed);
    addLog('A2 SELECT INBOX', 'command');
    await wait(250 / state.speed);
    addLog('A2 OK [READ-WRITE] INBOX selected (1 message)');
    await wait(250 / state.speed);
    addLog('A3 FETCH 1 (FLAGS BODY[])', 'command');
    await wait(350 / state.speed);
    addLog('A3 OK Fetch completed');
    addLog('A4 STORE 1 +FLAGS (\\Seen)', 'command');
    addLog('A4 OK Flag updated');

    // Display in Client View (Still on server!)
    elements.clientMailbox.innerHTML = `
        <div class="message-item">
            <div class="subject">${escapeHtml(state.message.subject)}</div>
            <div class="from">From: ${escapeHtml(state.message.from)}</div>
            <div class="body-preview">${escapeHtml(state.message.message)}</div>
            ${state.message.hasAttachment ? '<div style="font-size: 0.75em; color: #2563eb; margin-top: 3px;">📎 Attachment (document.pdf)</div>' : ''}
        </div>
    `;

    addLog('A5 LOGOUT', 'command');
    addLog('* BYE IMAP Server signing off');
    addLog('[IMAP] Message synchronized to client & PRESERVED on server.', 'info');
}

// POP3 Protocol Execution
async function runPOP3() {
    addLog(`[POP3] Connecting to port ${state.tlsEnabled ? '995 (POP3S)' : '110'}...`, 'info');
    await wait(300 / state.speed);
    addLog('+OK POP3 Server Ready');
    await wait(250 / state.speed);
    addLog('USER bob', 'command');
    await wait(200 / state.speed);
    addLog('+OK Password required');
    await wait(250 / state.speed);
    addLog('PASS password', 'command');
    await wait(250 / state.speed);
    addLog('+OK Logged in (1 message)');
    await wait(200 / state.speed);
    addLog('STAT', 'command');
    addLog('+OK 1 14592');
    await wait(200 / state.speed);
    addLog('RETR 1', 'command');
    await wait(350 / state.speed);
    addLog('+OK Message follows');

    // Download to client view
    elements.clientMailbox.innerHTML = `
        <div class="message-item">
            <div class="subject">${escapeHtml(state.message.subject)}</div>
            <div class="from">From: ${escapeHtml(state.message.from)}</div>
            <div class="body-preview">${escapeHtml(state.message.message)}</div>
            ${state.message.hasAttachment ? '<div style="font-size: 0.75em; color: #2563eb; margin-top: 3px;">📎 Attachment (document.pdf)</div>' : ''}
        </div>
    `;

    if (state.pop3Delete) {
        await wait(250 / state.speed);
        addLog('DELE 1', 'command');
        await wait(200 / state.speed);
        addLog('+OK Message marked for deletion');
        await wait(200 / state.speed);
        addLog('QUIT', 'command');
        addLog('+OK Goodbye (Message deleted from server)');

        // Clear or strike out server copy
        const srvItem = document.getElementById('serverMsgItem');
        if (srvItem) srvItem.classList.add('deleted');
        elements.serverStatusLabel.textContent = 'Deleted';
        addLog('[POP3] Message downloaded to local PC & deleted from server spool.', 'info');
    } else {
        await wait(200 / state.speed);
        addLog('QUIT', 'command');
        addLog('+OK Goodbye (Message preserved on server)');
        addLog('[POP3] Message downloaded & copy kept on server.', 'info');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Start app
initEventListeners();
