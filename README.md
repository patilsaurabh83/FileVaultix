# 📁 FileVaultix

**Secure, Fast & Private Peer-to-Peer File Sharing**

FileVaultix is a Salesforce-powered web application that enables secure, encrypted, and direct file transfers using **WebRTC** and **PeerJS**—no files are stored on any server and no accounts are needed. Perfect for privacy-conscious users, FileVaultix ensures your files reach the recipient **only** and **directly**.

<p align="center">
  <img src="https://img.shields.io/github/license/patilsaurabh83/FileVaultix" alt="License">
  <img src="https://img.shields.io/github/repo-size/patilsaurabh83/FileVaultix" alt="Repo Size">
  <img src="https://img.shields.io/github/languages/top/patilsaurabh83/FileVaultix" alt="Top Language">
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

## 🏗️ Project Architecture

```bash
FileVaultix/
├── force-app/
│   └── main/
│       └── default/
│           ├── lwc/
│           │   ├── fileVaultixHome/       # Project landing & intro UI
│           │   ├── fileVaultixUpload/     # Upload page (Sender view)
│           │   └── fileVaultixDownload/   # Download page (Receiver view)
│           └── classes/
│               └── FileUploadController.cls  # Apex logic for session/control
│
├── config/
│   └── project-scratch-def.json
├── manifest/
│   └── package.xml
├── README.md
└── ...
```

---

## 🧠 Key Salesforce Object

### `WebRTC_Session__c`

A custom Salesforce object used to temporarily store file-sharing session metadata:

| Field Name          | Type      | Description                            |
| ------------------- | --------- | -------------------------------------- |
| `Peer_ID__c`        | Text      | Unique PeerJS ID for sender/receiver   |
| `Token__c`          | Text      | Secure access token for the session    |
| `Password__c`       | Text      | (Optional) password for added security |
| `Session_Status__c` | Picklist  | Status (In Progress, Closed, etc.)     |
| `Session_Data__c`   | Long Text | Encrypted session metadata (no files)  |
| `CreatedDate`       | DateTime  | Auto-set when session is created       |
| `Expires_At__c`     | DateTime  | Timestamp after which session expires  |

**Privacy Notice:**
All session records are temporary and **never** used to store actual files or personal data.

---

### 🧹 Automated Cleanup: WebRTC Session Batch

FileVaultix includes a scheduled batch job to ensure data privacy and session cleanup:

**Class:** `WebRTCCleanupBatch.cls`
**Location:** `force-app/main/default/classes/WebRTCCleanupBatch.cls`

#### ✅ What it Does:

* Finds `WebRTC_Session__c` records with `Session_Status__c = 'Closed'` and older than 45 days.
* Deletes them in efficient batches.
* Sends a summary email to operations for transparency.

#### ⏳ How it Runs:

* Can be scheduled to run monthly or triggered manually.
* Keeps your Salesforce org tidy and privacy-compliant.

> ⚠️ **Note:** No user files are stored—only encrypted metadata is temporarily persisted and auto-purged.

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

## 📄 License

This project is licensed under the [MIT License](https://github.com/patilsaurabh83/FileVaultix/blob/main/LICENSE).

### ❗ MIT License Summary

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

However, you must include the original copyright and permission notice.

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
