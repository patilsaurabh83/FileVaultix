# 📁 FileVaultix

**Secure, Fast & Private Peer-to-Peer File Sharing**

FileVaultix is a Salesforce-powered web application that enables secure, encrypted, and direct file transfers using **WebRTC** and **PeerJS**—no files are stored on any server and no accounts are needed. Perfect for privacy-conscious users, FileVaultix ensures your files reach the recipient **only** and **directly**.

<p align="center">
  <img src="https://img.shields.io/github/license/patilsaurabh83/FileVaultix" alt="License" />
  <img src="https://img.shields.io/github/repo-size/patilsaurabh83/FileVaultix" alt="Repo Size" />
  <img src="https://img.shields.io/github/languages/top/patilsaurabh83/FileVaultix" alt="Top Language" />
  <img src="https://img.shields.io/github/issues-closed/patilsaurabh83/FileVaultix" alt="Closed Issues" />
  <img src="https://img.shields.io/github/issues-pr-closed/patilsaurabh83/FileVaultix" alt="Closed PRs" />
  <img src="https://img.shields.io/github/stars/patilsaurabh83/FileVaultix?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/patilsaurabh83/FileVaultix" alt="GitHub forks" />
  <img src="https://img.shields.io/github/last-commit/patilsaurabh83/FileVaultix" alt="Last Commit" />
  <img src="https://img.shields.io/github/contributors/patilsaurabh83/FileVaultix" alt="Contributors" />
</p>


---

## 🚀 Features

✨ **Peer-to-Peer Transfers** – Direct and secure file delivery via WebRTC.  
🔐 **End-to-End Encryption** – Military-grade encryption via WebRTC DTLS/SRTP.  
📄️ **No Server Storage** – Files never touch any backend server.  
🧑‍🚀 **Zero Signup Hassle** – Start instantly with no authentication.  
📁 **Large File Support** – Share files up to **10GB** (browser/network limits apply).  
📱 **Responsive UI** – Built using Lightning Web Components, mobile-ready.  
💣 **Session-based Sharing** – Files are destroyed once the session ends.  
📌 **QR Code & Link Sharing** – Share peer links easily via QR or URL.  
🌐 **Modern Architecture** – Real-time communication with zero intermediary.


---

## 🏠 Home Screenshot:

<p align="center">
  <img src="/File Vaultix Home.png" alt="FileVaultix Home Screenshot"/>
</p>

---

## 🏗️ Project Architecture

```bash

FileVaultix/
├── force-app/
│   └── main/
│       └── default/
│           ├── lwc/
│           │   ├── fileVaultixHome/          # Project landing & intro UI
│           │   ├── fileVaultixUpload/        # Upload page (Sender view)
│           │   └── fileVaultixDownload/      # Download page (Receiver view)
│           └── classes/
│               ├── FileUploadController.cls              # Apex logic for session/control
│               ├── WebRTCSessionAutoCloseBatch.cls       # Batch: Closes stale sessions
│               ├── WebRTCSessionAutoCloseScheduler.cls   # Scheduler: Runs every 4 hours
│               ├── WebRTCCleanupBatch.cls                # Batch: Deletes old closed sessions
│               └── WebRTCCleanupScheduler.cls            # Scheduler: Runs end of each month
│
├── config/
│   └── project-scratch-def.json
├── manifest/
│   └── package.xml
├── README.md
└── ...

```

---

## 🏠 Live Demo

Try FileVaultix live and experience secure peer-to-peer file sharing:  
🔗 [FileVaultix Live](https://innovativewizards-dev-ed.develop.my.site.com/)

---

## 🧠 Key Salesforce Object

### `WebRTC_Session__c`

A custom Salesforce object used to temporarily store file-sharing session metadata:

| Field Name              | Type       | Description                                      |
| ------------------------ | ---------- | ------------------------------------------------ |
| Peer_ID__c               | Text       | Unique PeerJS ID for sender/receiver             |
| Token__c                 | Text       | Secure access token for the session              |
| Password__c              | Text       | (Optional) password for added security           |
| Session_Status__c        | Picklist   | Status (In Progress, Closed, etc.)               |
| Session_Data__c          | Long Text  | Encrypted session metadata (no files)            |
| CreatedDate              | DateTime   | Auto-set when session is created                 |
| Expires_At__c            | DateTime   | Timestamp after which session expires            |
| Sender_s_Location__c       | Text(255)  | Geographical location or IP-based region of sender |
| Receiver_s_Location__c     | Text(255)  | Geographical location or IP-based region of receiver |


**Privacy Notice:**
All session records are temporary and **never** used to store actual files or personal data.

---

## 🔗 Branded Short URLs (Short.io Integration - 2026)

The **Upload Page** now features an enhanced sharing interface that presents both a **Branded Short URL** and the **Original Long URL**. This dual-link approach improves user trust by providing transparency while offering the convenience of a professional, shortened link.

### 🛠️ Implementation (Apex & Custom Labels)

To maintain security and clean code, we use **Salesforce Custom Labels** to store the domain name. This ensures that sensitive environment-specific URLs are not hardcoded in the Apex class.

```apex
// Secure implementation in FileUploadController.cls
Map<String, Object> body = new Map<String, Object>();
body.put('originalURL', longUrl);

// WITH: Secure System Label for privacy and flexibility
body.put('domain', System.Label.ShortIO_Domain); 

// Link remains active for 4 hours (User Security)
body.put('expiresAt', System.now().addHours(4).formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\''));

// Auto-delete from dashboard after 7 days (Quota Management)
body.put('ttl', System.now().addDays(7).formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\''));
```
---

## 🧹 Automated Cleanup: WebRTC Session Maintenance

FileVaultix includes scheduled Apex jobs to ensure session cleanup, security, and data hygiene:

---

### ✅ `WebRTCSessionAutoCloseBatch.cls`

**Purpose:**  
Automatically closes `WebRTC_Session__c` records that have been **In Progress** for more than **4 hours**—ideal for cleaning up stale or abandoned sharing sessions.

| Task   | Description                                                    |
|--------|----------------------------------------------------------------|
| 🎯 Target | Sessions with `Session_Status__c = 'In Progress'` older than 4 hours |
| 🔁 Action | Updates `Session_Status__c` to `Closed`                           |
| 🕐 Frequency | Every 4 hours via scheduler                                   |

---

### 📅 `WebRTCSessionAutoCloseScheduler.cls`

**Purpose:**  
Schedules the `WebRTCSessionAutoCloseBatch` to run automatically every **4 hours**.

| Task        | Description                                          |
|-------------|------------------------------------------------------|
| ⏱ Schedule | Cron-based execution every 4 hours                  |
| 🔄 Automation | Ensures abandoned sessions are closed automatically |

---

### 🗑️ `WebRTCCleanupBatch.cls`

**Purpose:**  
Deletes old `WebRTC_Session__c` records that have already been closed for **more than 45 days**.

| Task   | Description                                               |
|--------|-----------------------------------------------------------|
| 🗃️ Target | Records with `Session_Status__c = 'Closed'` and older than 45 days |
| ❌ Action | Deletes them in efficient batches                      |
| 📧 Email | Sends summary email upon completion                    |

---

### 📆 `WebRTCCleanupScheduler.cls`

**Purpose:**  
Schedules the `WebRTCCleanupBatch` to run at the **end of every month** automatically.

| Task       | Description                                                |
|------------|------------------------------------------------------------|
| 📅 Schedule | Monthly execution (customizable via cron expression)      |
| 🧹 Purpose  | Keeps Salesforce org tidy by regularly purging old sessions |

> ⚠️ **Note:** No user files are stored—only encrypted session metadata is temporarily persisted and auto-managed by these jobs.

---

## ⚡ Quick Start

1. **Clone the repository:**

   ```sh
   git clone https://github.com/patilsaurabh83/FileVaultix.git
   cd FileVaultix
   ```

2. **Install project dependencies:**

   ```sh
   npm install
   ```

3. **Deploy to Salesforce Scratch Org:**

   ```sh
   sfdx force:auth:web:login
   sfdx force:org:create -f config/project-scratch-def.json -a FileVaultixScratch
   sfdx force:source:push -u FileVaultixScratch
   sfdx force:user:permset:assign -n <YourPermSet>
   sfdx force:org:open -u FileVaultixScratch
   ```

4. **Run Unit Tests:**

   ```sh
   npm run test
   ```

---

## 📦 Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | Salesforce Lightning Web Components |
| Backend   | Apex (Salesforce Controller)        |
| Transport | WebRTC + PeerJS                     |
| QR Gen    | JavaScript-based QR code lib        |
| Testing   | Jest                                |
| Tooling   | Salesforce DX, Node.js              |

---

## 🌱 Future Roadmap

* ✅ WebRTC peer connection via PeerJS
* 🛡️ Integrate temporary password or OTP validation
* 📂 Drag & Drop multiple files
* 📱 Native mobile support (PWA)
* 🔔 Notification support (browser-level)
* 💾 IndexedDB fallback for offline support

---

## 🧑‍💻 Developer Notes

* **Single-use Sessions:** Sharing sessions are single-use and temporary.
* **No Backend File Store:** FileVaultix relies 100% on in-browser memory and WebRTC.
* **Browser Compatibility:** Best viewed on Chrome, Firefox, and Edge.
* **Privacy:** Neither files nor peer IDs are persisted longer than the session.

---

## 📝 License

This project is licensed under a **Dual License** model:

- **MIT License** – for open-source permissions
- **Creative Commons Attribution 4.0 (CC BY 4.0)** – for enforcing visible credit

You must provide visible credit to the author (Saurabh Patil) in any public-facing app or project using this code.  
Failure to do so may result in revocation of rights or legal action under CC BY 4.0.

[🔗 Full License Terms](./LICENSE)

---

## 🙏 Credits

Made with 💙 by [Saurabh Patil](https://saurabhpatil.netlify.app/)
GitHub: [@patilsaurabh83](https://github.com/patilsaurabh83)

---

## 📚 Learn More

* [Salesforce DX Guide](https://developer.salesforce.com/tools/vscode/)
* [WebRTC Overview](https://webrtc.org/)
* [PeerJS Docs](https://peerjs.com/)
* [LWC Dev Guide](https://developer.salesforce.com/docs/component-library/overview/components)

> 🗭️ **Disclaimer:** FileVaultix is built with privacy and security in mind, but ensure that you only upload and share files you have rights to. Respect digital laws and user confidentiality.
