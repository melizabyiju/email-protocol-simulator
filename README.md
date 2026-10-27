# 📧 Email Flow Simulator: SMTP, POP3, and IMAP

<div align="center">

![Course](https://img.shields.io/badge/Computer%20Networks-Assignment-blue?style=for-the-badge)
![Standards](https://img.shields.io/badge/RFC%20Standards-SMTP%20%7C%20POP3%20%7C%20IMAP-green?style=for-the-badge)
![Live](https://img.shields.io/badge/Deploy-GitHub%20Pages-purple?style=for-the-badge)

**Interactive, visual presentation tool for our 5-member Computer Networks role play.**  
*Demonstrating how email travels from sender to receiver across servers, routers, and protocols.*

---

</div>

## 🎯 5-Member Role Play Overview

| Member | Role | Responsibility & Demonstration |
|---|---|---|
| **Member 1** | **Sender (User Agent)** | Composes email, packages headers & attachments, pushes to SMTP server. |
| **Member 2** | **SMTP Server** | Authenticates sender, buffers in outgoing queue, performs DNS MX lookup. |
| **Member 3** | **Internet & Routers** | Establishes TCP 3-way handshake, forwards IP packets across network hops. |
| **Member 4** | **Recipient Mail Server** | Validates recipient mailbox, checks spam, stores email in `/var/mail/bob`. |
| **Member 5** | **Receiver Client** | Retrieves email using **IMAP** (kept on server) or **POP3** (downloaded to device). |

---

## 🚀 How to Run

### 1. Locally (Offline)
Simply double-click **`index.html`** in any web browser. No installation or backend required.

### 2. Live GitHub Pages
Visit: **[https://melizabyiju.github.io/email-protocol-simulator/](https://melizabyiju.github.io/email-protocol-simulator/)**

---

## 🎮 Interface & Features

- **Visual Pipeline:** 5 distinct nodes representing each role-play member with an animated moving envelope.
- **Audience Narration Strip:** Displays the active member and a 1-line plain English explanation of what is happening.
- **Live Terminal:** Shows exact protocol commands (`EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, `RETR`, `FETCH`, etc.).
- **Dual Retrieval Modes:**
  - **IMAP:** Message stays safely stored in the server mailbox.
  - **POP3:** Message downloads to local client and is removed from the server.
- **Controls:** Start, Pause, Step-by-Step, Reset, Speed Slider, and TLS toggle.
