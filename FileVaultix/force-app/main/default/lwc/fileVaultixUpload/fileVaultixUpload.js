import { LightningElement, track } from "lwc"
import fileVaultixLogo from "@salesforce/resourceUrl/fileVaultixLogo"
import saveWebRTCSession from "@salesforce/apex/FileUploadController.saveWebRTCSession"
import checkAndGenerateUniqueToken from "@salesforce/apex/FileUploadController.generateUniqueToken"
import updateSessionStatus from "@salesforce/apex/FileUploadController.updateSessionStatus"
import updateFileAccessStatus from '@salesforce/apex/FileUploadController.updateFileAccessStatus';

import ExpressTurn1_Password from '@salesforce/label/c.ExpressTurn1';
import ExpressTurn2_Password from '@salesforce/label/c.ExpressTurn2_Password';
import ExpressTurn3_Password from '@salesforce/label/c.ExpressTurn3_Password';
import ExpressTurn4_Password from '@salesforce/label/c.ExpressTurn4_Password';
import ExpressTurn5_Password from '@salesforce/label/c.ExpressTurn5_Password';
import ExpressTurn6_Password from '@salesforce/label/c.ExpressTurn6_Password';
import ExpressTurn7_Password from '@salesforce/label/c.ExpressTurn7_Password';
import ExpressTurn8_Password from '@salesforce/label/c.ExpressTurn8_Password';
import ExpressTurn9_Password from '@salesforce/label/c.ExpressTurn9_Password';
import ExpressTurn10_Password from '@salesforce/label/c.ExpressTurn10_Password';

export default class FileVaultixUpload extends LightningElement {
  @track showPrivacy = false
  @track showPopup = false
  @track fileUrl = ""
  @track accessToken = ""
  @track qrCodeUrl = ""
  @track fileName = ""
  @track fileSize = ""
  @track showConfirm = false
  @track password = ""
  @track showPassword = false;
  @track fileType = ""
  @track isLoading = false
  @track loadingStep = 0
  @track isDragOver = false
  @track copiedField = ""
  @track showTooltip = ""
  @track uploadedFiles = []
  @track connectionStatus = "disconnected"
  @track peerInfo = null
  @track transferStatusOverride = ""
  @track fileAccessed = false
  @track fileAccessDetails = null
  @track singleUseOnly = false
  @track showMainUploadPage = true
  @track showStatusPage = false
  @track downloadComplete = false
  @track fileReadyToShare = false
  @track fileNameList = []
  @track currentFileIndex = 0
  @track transferProgress = 0
  @track showUploadSuccess = false
  @track showRefreshWarning = false
  @track showBrowserWarning = false
  @track browserWarningText = ""

  // PeerJS related properties
  peer = null
  peerId = null
  connection = null
  // Dynamic chunk size - will be set based on file size
  chunkSize = 8192 // Default 8KB chunks
  fileChunks = []
  currentChunk = 0
  totalChunks = 0
  broadcast = null // BroadcastChannel for signaling

  // Transfer control flags
  transferInProgress = false
  pendingAck = false // Flag to track if we're waiting for an acknowledgment
  lastAckedChunk = -1 // Track the last acknowledged chunk
  chunkRetryCount = 0 // Track retry attempts for current chunk
  maxChunkRetries = 3 // Maximum retries for a chunk
  chunkTimeout = null // Timeout for chunk acknowledgment

  // Updated loading steps for PeerJS
  loadingSteps = [
    "Initializing Process...",
    "Connecting to server...",
    "Generating unique peer ID...",
    "Setting up data connection...",
    "Preparing files for transfer...",
    "Generating access token...",
    "Ready to share files...",
    "Almost there! Just a moment...",
  ]

  maliciousExtensions = [
    ".exe",
    ".msi",
    ".bat",
    ".cmd",
    ".sh",
    ".dmg",
    ".elf",
    ".scr",
    ".pif",
    ".com",
    ".cpl",
    ".jar",
    ".vb",
    ".vbs",
  ]

  @track iceServerList = [];


  uploadTimeout = null
  loadingInterval = null
  @track loadingMessage = ""
  fileVaultixLogo = fileVaultixLogo

  // Track if user left and returned
  tabChangedWhileDownloading = false;

  // Format file size to human-readable format
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  async connectedCallback() {
    // Load PeerJS from static resource
    await this.loadPeerJS()

    // Generate a unique peer ID for this session
    this.peerId = this.generateUUID()

    // Clear any previous signaling data
    this.clearSignalingData()

    //fill the iceServerList with the configured TURN servers
    const list = this.getIceServerList();

    this.iceServerList = list;

    //Log the auhtor message with style
    this.logWithStyle('Designed and developed by Saurabh Patil');


    // Set up beforeunload event to warn user before refreshing
    window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this))

    window.addEventListener("unload", this.handleWindowUnload.bind(this));

    //Event listener for visibility change
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
  }

  disconnectedCallback() {
    // Clean up resources when component is removed
    this.closePeerConnection()
    if (this.broadcast) {
      this.broadcast.close()
    }
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval)
    }

    // Remove event listener
    this.updateSessionStatus('closed');
    window.removeEventListener("beforeunload", this.handleBeforeUnload.bind(this))
    window.removeEventListener("unload", this.handleWindowUnload.bind(this));
    document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
  }

  logWithStyle(message) {
    console.clear(); // Clear the console
    const currentYear = new Date().getFullYear();
    const style = `
            background: linear-gradient(to right, rgb(132, 173, 199) 0%, rgb(105, 135, 255) 100%);
            padding: 30px;
            color: white;
            font-weight: bold;
            font-size: 16px;
        `;
    console.log(`%c${message} © ${currentYear}`, style);
    localStorage.setItem('Developed By', 'Saurabh Patil');
  }

  // Load PeerJS library from static resource
  async loadPeerJS() {
    return new Promise((resolve, reject) => {
      if (window.Peer) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://unpkg.com/peerjs@1.5.0/dist/peerjs.min.js"
      script.onload = () => {

        resolve()
      }
      script.onerror = () => {
        reject(new Error("Failed to load PeerJS"))
      }
      document.head.appendChild(script)
    })
  }

  getIceServerList() {
    // List of ExpressTURN users with their credentials
    const expressTurnUsers = [
      { username: '000000002076852216', credential: ExpressTurn1_Password },
      { username: '000000002076850271', credential: ExpressTurn2_Password },
      { username: '000000002076852416', credential: ExpressTurn3_Password },
      { username: '000000002076852523', credential: ExpressTurn4_Password },
      { username: '000000002063742347', credential: ExpressTurn5_Password },
      { username: '000000002063742694', credential: ExpressTurn6_Password },
      { username: '000000002063743065', credential: ExpressTurn7_Password },
      { username: '000000002063743218', credential: ExpressTurn8_Password },
      { username: '000000002063743407', credential: ExpressTurn9_Password },
      { username: '000000002063743556', credential: ExpressTurn10_Password }
    ];

    const turnServers = [];
    for (const { username, credential } of expressTurnUsers) {
      turnServers.push({
        urls: 'turn:relay1.expressturn.com:3480?transport=udp',
        username,
        credential,
      });
      turnServers.push({
        urls: 'turn:relay1.expressturn.com:443?transport=tcp',
        username,
        credential,
      });
    }

    return [
      // Public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },

      // ExpressTURN servers (UDP and TCP)
      ...turnServers,

      // OpenRelay servers (UDP and TCP)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      }
    ];
  }


  // Handle beforeunload event
  handleBeforeUnload(event) {
    if (this.connectionStatus === "connected" || this.connectionStatus === "connecting") {
      this.showRefreshWarning = true
      event.preventDefault()
      event.returnValue = ""
      return ""
    }
  }

  handleWindowUnload() {
    // Notify downloader if connection is open
    if (this.connection && this.connection.open) {
      try {
        this.connection.send({ type: "uploader_left" });
      } catch (e) { }
      // Close the connection
      this.connection.close();
    }
  }

  handleVisibilityChange() {
    // Only care if download is in progress and connection is open
    if (this.isSendingChunks && this.connection && this.connection.open) {
      if (document.visibilityState === "hidden") {
        // User left the tab
        this.tabChangedWhileDownloading = true;
        // Notify downloader
        this.connection.send({ type: "uploader_tab_changed" });
      } else if (document.visibilityState === "visible" && this.tabChangedWhileDownloading) {
        // User returned to tab
        this.showCustomToast(
          "Stay on this tab",
          "For better download speed, please keep FileVaultix in the foreground.",
          "info"
        );
        this.tabChangedWhileDownloading = false;
      }
    }
  }

  // Cancel refresh
  cancelRefresh() {
    this.showRefreshWarning = false
  }

  // Confirm refresh
  confirmRefresh() {
    this.showRefreshWarning = false
    window.location.reload()
  }

  // Clear previous signaling data
  clearSignalingData() {
    const sessionData = {
      peerId: null,
      token: null,
      password: null,
      expiresAt: null,
    }
    sessionStorage.setItem("uploadSessionData", JSON.stringify(sessionData))
  }

  // Get session data
  getSessionData() {
    const data = sessionStorage.getItem("uploadSessionData")
    return data ? JSON.parse(data) : null
  }

  // Update session data
  updateSessionData(updates) {
    const currentData = this.getSessionData() || {}
    const updatedData = { ...currentData, ...updates }
    sessionStorage.setItem("uploadSessionData", JSON.stringify(updatedData))
  }

  async fetchPublicIPAndStoreInSession() {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error("Failed to fetch IP");

      const data = await response.json();
      const publicIP = data.ip;

      // ✅ Update session data with the public IP
      this.updateSessionData({ publicIP });

    } catch (error) {
    }
  }


  // Generate a UUID for peer identification
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Show privacy policy popup
  showPrivacyPopup() {
    this.showPrivacy = true
  }

  closePrivacy() {
    this.showPrivacy = false
  }

  // Show file details popup
  showAccessPopup() {
    if (this.fileUrl) {
      this.showPopup = true
    }
  }

  closePopup(clearFiles) {
    this.showPopup = false
    this.isLoading = false
    this.loadingStep = 0
    if (this.loadingInterval) clearInterval(this.loadingInterval)

    // Close PeerJS connections if active
    this.closePeerConnection()

    this.fileName = ""
    this.fileType = ""
    this.fileSize = ""
    this.password = ""
    this.copiedField = ""
    this.showConfirm = false
    this.showPrivacy = false
    this.loadingMessage = ""
    this.connectionStatus = "disconnected"
    this.peerInfo = null
    this.fileAccessed = false
    this.fileAccessDetails = null
    this.showUploadSuccess = false
    this.transferProgress = 0
    this.transferStatusOverride = ""
    this.showBrowserWarning = false
    this.browserWarningText = ""

    if (clearFiles) {
      this.fileUrl = ""
      this.accessToken = ""
      this.qrCodeUrl = ""
      this.uploadedFiles = []
      this.fileNameList = []
    }
  }

  // Trigger file input when button clicked
  handleFileUploadClick() {
    const fileInput = this.template.querySelector(".file-input")
    if (fileInput) {
      fileInput.click()
    }
  }

  // Drag and drop support with visual feedback
  handleDragOver(event) {
    event.preventDefault()
    this.isDragOver = true
  }

  handleDragLeave(event) {
    event.preventDefault()
    this.isDragOver = false
  }

  handleDrop(event) {
    event.preventDefault()
    this.isDragOver = false
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      this.processFiles(files)
    }
  }

  // Manual file selection - updated for multiple files
  handleFileChange(event) {
    const files = event.target.files
    if (files && files.length > 0) {
      this.processFiles(files)
      event.target.value = ""
    }
  }

  // Get total file size
  getTotalFileSize() {
    if (!this.uploadedFiles || this.uploadedFiles.length === 0) {
      return "0 Bytes"
    }
    const totalBytes = this.uploadedFiles.reduce((total, file) => total + file.size, 0)
    return this.formatFileSize(totalBytes)
  }

  // Determine file type icon
  getFileTypeIcon(file) {
    const type = file.type.toLowerCase()
    if (type.includes("image")) {
      return "isImage"
    } else if (
      type.includes("pdf") ||
      type.includes("document") ||
      type.includes("text") ||
      type.includes("msword") ||
      type.includes("officedocument")
    ) {
      return "isDocument"
    } else if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("compressed")) {
      return "isArchive"
    } else if (type.includes("audio")) {
      return "isAudio"
    } else if (type.includes("video")) {
      return "isVideo"
    } else {
      return "isDefault"
    }
  }


  getEnhancedFileTypeName(file) {
    const type = (file.type || file.fileType || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    const fileTypeMatchers = [
      // Media Types
      { label: "Image", match: () => type.startsWith("image/") },
      { label: "Video", match: () => type.startsWith("video/") },
      { label: "Audio", match: () => type.startsWith("audio/") },

      // Document Types
      { label: "PDF", match: () => type === "application/pdf" || name.endsWith(".pdf") },
      {
        label: "Document", match: () =>
          type.includes("msword") ||
          type.includes("officedocument.wordprocessingml") ||
          name.match(/\.(doc|docx)$/)
      },
      {
        label: "Spreadsheet", match: () =>
          type.includes("excel") ||
          type.includes("spreadsheetml") ||
          name.match(/\.(xls|xlsx|csv)$/)
      },
      {
        label: "Presentation", match: () =>
          type.includes("presentation") ||
          type.includes("powerpoint") ||
          name.match(/\.(ppt|pptx)$/)
      },

      // Archives
      {
        label: "Archive", match: () =>
          type.includes("zip") ||
          type.includes("rar") ||
          type.includes("7z") ||
          type.includes("tar") ||
          type.includes("gz") ||
          name.match(/\.(zip|rar|7z|tar|gz)$/)
      },

      // Plain Text & Logs
      {
        label: "Text", match: () =>
          type === "text/plain" ||
          name.match(/\.(txt|log|md)$/)
      },

      // Data Types
      {
        label: "JSON", match: () =>
          type === "application/json" ||
          name.endsWith(".json")
      },
      {
        label: "XML", match: () =>
          type === "application/xml" ||
          type === "text/xml" ||
          name.endsWith(".xml")
      },
      { label: "YAML", match: () => name.match(/\.(yaml|yml)$/) },

      // HTML specifically
      {
        label: "HTML", match: () =>
          type === "text/html" ||
          name.endsWith(".html") ||
          name.endsWith(".htm")
      },

      // Code files (JS, TS, etc.)
      {
        label: "Code", match: () =>
          name.match(/\.(js|ts|jsx|tsx|css|scss|less|java|c|cpp|py|sh|bat|rb|php|go|rs)$/)
      },

      // Font files
      { label: "Font", match: () => name.match(/\.(woff|woff2|ttf|otf|eot)$/) },

      // Binary fallback
      { label: "Binary", match: () => type === "application/octet-stream" },
    ];

    for (const matcher of fileTypeMatchers) {
      if (matcher.match()) return matcher.label;
    }

    return "Unknown Type";
  }


  // Process the selected files
  processFiles(files) {
    const safeFiles = [];
    const maliciousFiles = [];
    const excludedFiles = [];

    Array.from(files).forEach((file) => {
      const lowerName = file.name.toLowerCase();
      const isMaliciousExt = this.maliciousExtensions.some((ext) => lowerName.endsWith(ext));
      const fileSizeGB = file.size / (1024 * 1024 * 1024);

      if (isMaliciousExt) {
        maliciousFiles.push(file.name);
      } else if (file.size === 0) {
        excludedFiles.push({ name: file.name, reason: "File size is 0 bytes and cannot be uploaded." });
      } else if (fileSizeGB > 10) {
        excludedFiles.push({ name: file.name, reason: "File size exceeds 10 GB limit." });
      } else {
        safeFiles.push(file);
      }
    });

    if (maliciousFiles.length > 0) {
      this.showCustomToast(
        "Warning",
        "Malicious or unsafe files detected. These files are not allowed to upload.",
        "warning"
      );
    }

    // Show a toast for each excluded file
    excludedFiles.forEach(f =>
      this.showCustomToast(
        "File Not Accepted",
        `${f.name}: ${f.reason}`,
        "warning"
      )
    );

    if (safeFiles.length === 0) {
      return;
    }

    this.uploadedFiles = safeFiles;
    this.fileNameList = this.uploadedFiles.map((file, index) => {
      const fileTypeIcon = this.getFileTypeIcon(file);
      return {
        id: this.generateUUID() + "-" + index,
        name: file.name,
        type: file.type || "Unknown type",
        enhancedType: this.getEnhancedFileTypeName(file),
        size: this.formatFileSize(file.size),
        isImage: fileTypeIcon === "isImage",
        isDocument: fileTypeIcon === "isDocument",
        isArchive: fileTypeIcon === "isArchive",
        isAudio: fileTypeIcon === "isAudio",
        isVideo: fileTypeIcon === "isVideo",
        isDefault: fileTypeIcon === "isDefault",
        progress: 0
      };
    });

    if (this.uploadedFiles.length > 0) {
      const firstFile = this.uploadedFiles[0];
      this.fileName = firstFile.name;
      this.fileType = this.getEnhancedFileTypeName(firstFile);
      this.fileSize = this.formatFileSize(firstFile.size);
    }

    this.showConfirm = true;
    this.showCustomToast("Files Selected", `${this.uploadedFiles.length} files selected for upload`, "success");
  }

  handlePasswordChange(event) {
    this.password = event.target.value
  }

  handleSingleUseToggle(event) {
    this.singleUseOnly = event.target.checked
  }

  closeConfirm() {
    this.showConfirm = false
    this.password = ""
    this.uploadedFiles = []
    this.fileNameList = []
  }

  startUpload() {
    this.showConfirm = false
    this.isLoading = true
    this.loadingStep = 0
    this.transferStatusOverride = ""
    this.animateLoader()
  }

  animateLoader() {
    this.loadingInterval = setInterval(async () => {
      if (this.loadingStep === this.loadingSteps.length - 1) {
        clearInterval(this.loadingInterval)

        // Initialize PeerJS connection
        const peerJSInitialized = await this.initializePeerJS()

        if (peerJSInitialized) {
          // Generate access token and URL
          const accessInfoGenerated = await this.generateAccessInfo()

          if (accessInfoGenerated) {
            this.isLoading = false
            this.fileReadyToShare = true
            this.showUploadSuccess = true
            this.showCustomToast("Ready to Share", "Your files are ready to be shared", "success")

            setTimeout(() => {
              this.showUploadSuccess = false
            }, 5000)
          } else {
            this.isLoading = false
            this.showError("Failed to generate access information")
          }
        } else {
          this.isLoading = false
          this.showError("Failed to initialize connection")
        }
      } else {
        this.loadingStep++
        this.loadingMessage = this.loadingSteps[this.loadingStep]
      }
    }, 1000)
  }

  // Custom toast notification
  showCustomToast(title, message, variant) {
    const toastCmp = this.template.querySelector("c-custom-toast")
    if (toastCmp) {
      toastCmp.showNotification(title, message, variant)
    } else {

    }
  }

  // Show error message
  showError(message) {
    this.showCustomToast("Error", message, "error")

  }

  // Initialize PeerJS connection with enhanced configuration
  async initializePeerJS() {
    try {


      // Clear any previous signaling data
      this.clearSignalingData()

      // Enhanced PeerJS configuration with multiple TURN servers
      const peerConfig = {
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        config: {
          iceServers: this.iceServerList, // Use the property directly
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        },
        debug: 2,
      };


      // Create PeerJS instance
      this.peer = new Peer(this.peerId, peerConfig)


      // Set up PeerJS event handlers
      this.setupPeerJSHandlers()

      // Wait for peer to be ready
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {

          reject(new Error("PeerJS connection timeout"))
        }, 30000) // 30 second timeout

        this.peer.on("open", (id) => {
          clearTimeout(timeout)

          this.peerId = id
          this.connectionStatus = "connecting"

          // Store peer ID in session data
          this.updateSessionData({ peerId: id })

          // Set up broadcast channel for signaling
          this.setupBroadcastChannel()

          resolve(true)
        })

        this.peer.on("error", (error) => {
          clearTimeout(timeout)

          this.showCustomToast("Connection Error", `PeerJS error: ${error.message}`, "error")
          reject(error)
        })
      })
    } catch (error) {

      this.showCustomToast("Connection Error", "Failed to initialize PeerJS connection. Please try again.", "error")
      this.connectionStatus = "failed"
      return false
    }
  }

  // Set up PeerJS event handlers
  setupPeerJSHandlers() {
    // Handle incoming connections
    this.peer.on("connection", (conn) => {

      this.connection = conn
      this.setupConnectionHandlers()
    })

    // Handle disconnection
    this.peer.on("disconnected", () => {
      //console.warn("⚠️ PeerJS disconnected from server")
      this.stopSharing();
      this.connectionStatus = "disconnected"
      this.showCustomToast("Connection Lost", "Disconnected from PeerJS server", "warning")
    })

    // Handle close
    this.peer.on("close", () => {

      this.connectionStatus = "disconnected"
    })

    // Handle errors
    this.peer.on("error", (error) => {

      this.handlePeerJSError(error)
    })
  }

  // Handle PeerJS errors with specific error types
  handlePeerJSError(error) {
    let errorMessage = "An error occurred with the peer connection."
    let errorHint = "Please try again."

    switch (error.type) {
      case "peer-unavailable":
        errorMessage = "The peer you're trying to connect to is not available."
        errorHint = "Make sure the download page is open and try again."
        break
      case "network":
        errorMessage = "Network error occurred."
        errorHint = "Please check your internet connection and try again."
        break
      case "server-error":
        errorMessage = "PeerJS server error."
        errorHint = "The PeerJS server is experiencing issues. Please try again later."
        break
      case "socket-error":
        errorMessage = "Socket connection error."
        errorHint = "Please check your firewall settings and try again."
        break
      case "socket-closed":
        errorMessage = "Connection to PeerJS server was closed."
        errorHint = "Please refresh the page and try again."
        break
      default:
        errorMessage = `PeerJS error: ${error.message}`
    }

    this.showCustomToast("Connection Error", errorMessage, "error")
    this.connectionStatus = "disconnected"
  }

  // Set up connection handlers for data transfer
  setupConnectionHandlers() {
    if (!this.connection) return





    // Handle connection open
    this.connection.on("open", () => {

      this.connectionStatus = "connected"
      this.showCustomToast("Connected", "Peer connection established successfully", "success")

      setTimeout(() => {
        this.showPopup = false
        this.showMainUploadPage = false
        this.showStatusPage = true
      }, 1000)
    })

    // Handle connection close
    this.connection.on("close", () => {
      console.warn("⚠️ Data connection closed")
      this.connectionStatus = "disconnected"
      this.showCustomToast("Connection Closed", "Data connection has been closed", "info")
      this.updateSessionStatus('Closed');
    })

    // Handle connection errors
    this.connection.on("error", (error) => {

      this.connectionStatus = "disconnected"
      this.showCustomToast("Data Connection Error", "An error occurred with the data connection", "error")
    })

    // Handle incoming data/messages
    this.connection.on("data", (data) => {
      try {
        this.handleConnectionMessage(data)
      } catch (error) {

      }
    })
  }

  // Handle messages from the connection
  handleConnectionMessage(data) {


    switch (data.type) {
      case "file_request":
        // Peer is requesting the file
        this.sendFileViaPeer()
        break
      case "file_received":
        // Peer has successfully received the file
        this.handleFileAccessed(data.clientInfo)
        // Update status to "Files Accessed"
        this.updateFileAccessStatusSilently("Files Accessed");
        break
      case "chunk_received":
        // Peer has received a chunk, send the next one
        this.sendNextChunk()
        break
      case "transfer_progress":
        // Update transfer progress
        this.updateTransferProgress(data.progress)
        break
      case "download_complete":
        // Download is complete
        this.downloadComplete = true
        this.isSendingChunks = false; 
        // Update status to "Files Downloaded"
        this.updateFileAccessStatusSilently("Files Downloaded");
        this.showCustomToast("Download Complete", "Files have been downloaded successfully", "success")
        break
      case "request_next_file":
        // Peer is requesting the next file
        this.prepareNextFile()
        break
      case "requestFileList":

        this.sendFileList()
        break
      case "downloadAll":

        this.sendFileViaPeer()
        break
      case "downloadFile":

        this.currentFileIndex = data.fileIndex || 0
        this.sendFileViaPeer()
        break
      case "stop_sharing":

        this.stopSharing();
        break;
      case "chunk_ack":
        this.handleChunkAcknowledgment(data)
        break;
      case "download_started":

        this.isSendingChunks = true; // your flag set here
        this.updateFileAccessStatusSilently("File Downloading Started");
        break;
      case 'downloader_lost_connection':
        this.stopSharing();
        this.showCustomToast("Connection Lost", "The downloader has lost connection. Stopping file transfer.", "warning");
        break;
      case "downloader_left":
        this.showCustomToast("Downloader Left", "The downloader has closed their window. You can close this window if the download is done.", "warning");
        break;
      default:
        //console.warn("Unknown message type:", data.type)
    }
  }

  // Send file list to peer
  sendFileList() {
    if (this.connection && this.connection.open) {
      this.connection.send({
        type: "fileList",
        files: this.uploadedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        })),
      })
    }
  }

  // Prepare next file for transfer
  prepareNextFile() {
    this.currentFileIndex++
    if (this.currentFileIndex < this.uploadedFiles.length) {
      const currentFile = this.uploadedFiles[this.currentFileIndex]
      this.fileName = currentFile.name
      this.fileType = currentFile.type || "Unknown type"
      this.fileSize = this.formatFileSize(currentFile.size)
      this.sendFileViaPeer()
    } else {

      this.connection.send({
        type: "all_files_complete",
      })
    }
  }

  // Determine optimal chunk size based on file size
  determineChunkSize(fileSize) {
    const fileSizeMB = fileSize / (1024 * 1024);
    if (fileSizeMB < 1) {
      return 8 * 1024;
    } else if (fileSizeMB < 10) {
      return 16 * 1024;
    } else if (fileSizeMB < 100) {
      return 32 * 1024;
    } else {
      return 64 * 1024;
    }
  }

  // Send file via PeerJS data connection
  async sendFileViaPeer() {
    if (!this.connection || !this.connection.open) {

      return
    }

    // Prevent duplicate file sends
    if (this.transferInProgress) {

      return
    }

    try {
      const currentFile = this.uploadedFiles[this.currentFileIndex]
      if (!currentFile) {

        return
      }

      this.transferInProgress = true

      // Determine optimal chunk size based on file size
      this.chunkSize = this.determineChunkSize(currentFile.size);


      this.showCustomToast("Sending File", `Preparing to send ${currentFile.name}`, "info")

      // Calculate total chunks properly
      this.totalChunks = Math.ceil(currentFile.size / this.chunkSize)

      // Send file info first
      const fileInfo = {
        name: currentFile.name,
        size: currentFile.size,
        fileType: currentFile.type,
        totalChunks: this.totalChunks,
        fileIndex: this.currentFileIndex,
        totalFiles: this.uploadedFiles.length,
        chunkSize: this.chunkSize // Send chunk size to receiver
      }

      this.connection.send({
        type: "file_info",
        file: fileInfo,
      })



      // Reset chunk tracking
      this.currentChunk = 0
      this.lastAckedChunk = -1
      this.pendingAck = false
      this.transferProgress = 0

      // Start sending chunks
      this.readAndSendChunk()
    } catch (error) {

      this.transferInProgress = false
      this.showCustomToast("Error", `Error sending file: ${error.message}`, "error")
    }
  }

  // Read and send file chunk with proper partial chunk handling
  readAndSendChunk() {
    if (this.currentFileIndex >= this.uploadedFiles.length) {
      return
    }

    const file = this.uploadedFiles[this.currentFileIndex]
    if (!file || !this.connection || !this.connection.open) {
      return
    }

    // Don't send if we're waiting for an acknowledgment
    if (this.pendingAck) {

      return
    }

    const start = this.currentChunk * this.chunkSize
    const end = Math.min(start + this.chunkSize, file.size)
    const chunk = file.slice(start, end)

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result



        // Send chunk metadata first
        this.connection.send({
          type: "chunk_metadata",
          chunkIndex: this.currentChunk,
          totalChunks: this.totalChunks,
          fileIndex: this.currentFileIndex,
          fileName: this.uploadedFiles[this.currentFileIndex].name,
          chunkSize: arrayBuffer.byteLength,
          fileSize: file.size,
          isLastChunk: this.currentChunk === this.totalChunks - 1,
        })

        // Then send the actual chunk data
        this.connection.send(arrayBuffer);

        // Set pending acknowledgment flag
        this.pendingAck = true;

        // Set timeout for acknowledgment
        this.setAckTimeout();

      } catch (err) {

        this.showCustomToast("Error", `Error sending chunk: ${err.message}`, "error")
        this.pendingAck = false;
      }
    }

    reader.onerror = (e) => {

      this.showCustomToast("Error", `File read error: ${e.message}`, "error")
      this.pendingAck = false;
    }

    reader.readAsArrayBuffer(chunk)
  }

  // Set timeout for chunk acknowledgment
  setAckTimeout() {
    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
    }
    this.chunkTimeout = setTimeout(() => {
      if (this.pendingAck) {
        this.chunkRetryCount++;
        if (this.chunkRetryCount <= this.maxChunkRetries) {
          this.pendingAck = false;
          this.readAndSendChunk();
        } else {
          this.showCustomToast("Transfer Error", "Failed to receive acknowledgment for chunk, transfer may be incomplete", "error");
          this.pendingAck = false;
          this.chunkRetryCount = 0;

          // Try to continue with next chunk
          this.currentChunk++;
          if (this.currentChunk < this.totalChunks) {
            this.readAndSendChunk();
          } else {
            this.completeFileTransfer();
          }
        }
      }
    }, 5000); // 5 second timeout for acknowledgment
  }

  // Handle after chunk is sent
  afterChunkSent() {
    const file = this.uploadedFiles[this.currentFileIndex]
    const totalChunks = Math.ceil(file.size / this.chunkSize)
    this.transferProgress = Math.round((this.currentChunk / totalChunks) * 100)

    // Update progress for the current file in fileNameList
    if (this.fileNameList[this.currentFileIndex]) {
      this.fileNameList[this.currentFileIndex].progress = this.transferProgress
    }

    // Send progress update
    this.connection.send({
      type: "transfer_progress",
      progress: this.transferProgress,
      fileIndex: this.currentFileIndex,
      totalFiles: this.uploadedFiles.length,
      currentChunk: this.currentChunk,
      totalChunks: totalChunks,
    })

    if (this.currentChunk >= totalChunks) {
      this.completeFileTransfer();
    }
  }

  // Complete file transfer
  completeFileTransfer() {
    const file = this.uploadedFiles[this.currentFileIndex];

    // All chunks for current file sent

    this.transferInProgress = false
    this.pendingAck = false;

    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    // Send file completion signal
    this.connection.send({
      type: "file_complete",
      fileIndex: this.currentFileIndex,
      fileName: file.name,
      totalChunks: this.totalChunks,
      fileSize: file.size,
      totalFiles: this.uploadedFiles.length,
    })

    this.showCustomToast("File Sent", `${file.name} has been sent successfully`, "success")
  }

  // Send next chunk
  sendNextChunk() {
    if (this.currentChunk < this.totalChunks) {
      this.readAndSendChunk()
    }
  }

  // Update transfer progress
  updateTransferProgress(progress) {
    this.transferProgress = progress
  }

  // Handle file accessed event
  handleFileAccessed(clientInfo) {
    this.fileAccessed = true



    const now = new Date()
    this.fileAccessDetails = {
      browser: clientInfo.browser || "Unknown browser",
      location: clientInfo.location || "Unknown location",
      time: now.toLocaleTimeString() + ", " + now.toLocaleDateString(),
    }

    this.showCustomToast("File Accessed", "Your files are being accessed", "info")
  }

  // Set up BroadcastChannel for signaling
  setupBroadcastChannel() {
    try {
      this.broadcast = new BroadcastChannel("peerjs-signaling")


      this.broadcast.onmessage = async (event) => {
        const { type, data } = event.data || {}
        if (!type) return


      }

      this.broadcast.onerror = (error) => {

        this.showCustomToast("Communication Error", "Lost communication with uploader", "warning")
      }
    } catch (error) {

    }
  }

  // Handle delete file with improved transition
  handleDeleteFile() {
    const fileToken = this.accessToken ? this.accessToken : null

    if (fileToken) {
      this.showCustomToast("Files Deleted", "Sharing has been stopped. Upload again to share a new file.", "info")

      this.closePeerConnection()
      this.transferStatusOverride = "deleted"

      const sharingDetails = this.template.querySelector(".file-sharing-details")
      if (sharingDetails) {
        sharingDetails.classList.add("fade-out")

        setTimeout(() => {
          this.fileReadyToShare = false
          this.uploadedFiles = []
          this.fileNameList = []
          this.currentFileIndex = 0
          this.fileName = ""
          this.fileType = ""
          this.fileSize = ""
          this.accessToken = ""
          this.fileUrl = ""
          this.qrCodeUrl = ""
          this.showMainUploadPage = true
          this.fileAccessed = false
          this.fileAccessDetails = null
          this.transferInProgress = false;
          this.transferProgress = 0
          this.password = ""
          this.showStatusPage = false

          setTimeout(() => {
            const uploadBox = this.template.querySelector(".upload-box")
            if (uploadBox) {
              uploadBox.classList.add("fade-in")
              setTimeout(() => {
                uploadBox.classList.remove("fade-in")
              }, 500)
            }
          }, 100)
        }, 300)
      } else {
        this.fileReadyToShare = false
        this.showMainUploadPage = true
      }
    } else {

      this.showCustomToast("Error", "Access token is null or invalid.", "error")
    }
  }

  // Stop sharing with improved transition
  stopSharing() {
    this.closePeerConnection()

    this.showCustomToast("Sharing Stopped", "Sharing has been stopped. Upload again to share a new file.", "info")

    this.transferStatusOverride = "stopped"

    const currentView = this.showStatusPage
      ? this.template.querySelector(".vaultix-center")
      : this.template.querySelector(".file-sharing-details")

    if (currentView) {
      currentView.classList.add("fade-out")

      setTimeout(() => {
        this.connectionStatus = "disconnected"
        this.fileReadyToShare = false
        this.showStatusPage = false
        this.uploadedFiles = []
        this.fileNameList = []
        this.currentFileIndex = 0
        this.fileName = ""
        this.fileType = ""
        this.fileSize = ""
        this.accessToken = ""
        this.fileUrl = ""
        this.qrCodeUrl = ""
        this.showMainUploadPage = true
        this.fileAccessed = false
        this.fileAccessDetails = null
        this.transferInProgress = false;
        this.transferProgress = 0
        this.password = ""
        this.singleUseOnly = false
        this.isSendingChunks = false; // Reset sending chunks flag


        setTimeout(() => {
          const uploadBox = this.template.querySelector(".upload-box")
          if (uploadBox) {
            uploadBox.classList.add("fade-in")
            setTimeout(() => {
              uploadBox.classList.remove("fade-in")
            }, 500)
          }
        }, 100)
      }, 300)
    } else {
      this.connectionStatus = "disconnected"
      this.fileReadyToShare = false
      this.showStatusPage = false
      this.showMainUploadPage = true
    }
  }

  // Close peer connection with improved cleanup
  closePeerConnection() {
    // Clear any pending timeouts
    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }

    if (this.connection) {
      try {
        this.connection.close()
      } catch (e) {

      }
      this.connection = null
    }

    if (this.peer) {
      try {
        this.peer.destroy()
      } catch (e) {

      }
      this.peer = null
    }

    this.clearSignalingData()
    this.connectionStatus = "disconnected"
    localStorage.removeItem("uploadingDevice");
  }


  // Generate access token and URL
  async generateAccessInfo() {
    try {
      const result = await checkAndGenerateUniqueToken()


      let accessToken = null
      if (result && typeof result === "string" && result.length > 0) {
        accessToken = result

      } else {

        return false
      }

      const fileUrl = `https://innovativewizards-dev-ed.develop.my.site.com/download?t=${encodeURIComponent(accessToken)}`
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fileUrl)}&size=150x150`

      this.accessToken = accessToken
      this.fileUrl = fileUrl
      this.qrCodeUrl = qrCodeUrl

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 4)

      this.updateSessionData({
        peerId: this.peerId,
        token: accessToken,
        password: this.password,
        expiresAt: expiresAt.toISOString(),
        singleDownload: this.singleUseOnly,
      })

      await this.fetchPublicIPAndStoreInSession();  // In case if you rstrict the user with the IP address

      await this.saveSessionToSalesforce()
      return true
    } catch (error) {

      this.showCustomToast("Error", `Error generating access info: ${error.message}`, "error")
      return false
    }
  }

  // Save session to Salesforce
  async saveSessionToSalesforce() {
    try {
      const sessionData = sessionStorage.getItem("uploadSessionData")
      if (!sessionData) {
        this.showCustomToast("Error", "No session data found in sessionStorage.", "error")
        return
      }
      const parsed = JSON.parse(sessionData)
      const peerId = this.peerId || ""
      const token = parsed.token || ""
      const password = parsed.password || ""
      const sessionJson = sessionData

      // Build fileNames string: "filename1 (1.2 MB), filename2 (500 KB)"
      const fileNames = this.uploadedFiles
        .map(f => `${f.name} (${this.formatFileSize(f.size)})`)
        .join('\n');


      const fileAccessStatus = "Files Shared"; // Initial status

      const result = await saveWebRTCSession({
        peerId,
        token,
        password,
        sessionJson,
        fileNames,
        fileAccessStatus
      })

      sessionStorage.setItem("webrtcRecordId", result)
      localStorage.setItem("uploadingDevice", "true")
    } catch (error) {

      this.showCustomToast("Error", "Failed to save session to Salesforce.", "error")
    }
  }

  updateFileAccessStatusSilently(newStatus) {
    const recordId = sessionStorage.getItem("webrtcRecordId");
    if (!recordId) return;
    // Fire and forget, no await, no error handling
    updateFileAccessStatus({ recordId, newStatus });
  }

  // Get browser information
  getBrowserInfo() {
    const userAgent = navigator.userAgent
    let browserName = "Unknown"
    let browserVersion = ""

    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = "Chrome"
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = "Firefox"
    } else if (userAgent.match(/safari/i)) {
      browserName = "Safari"
    } else if (userAgent.match(/opr\//i)) {
      browserName = "Opera"
    } else if (userAgent.match(/edg/i)) {
      browserName = "Edge"
    }

    const match = userAgent.match(/(chrome|firefox|safari|opr|edg(?=\/))\/?\s*(\d+)/i)
    if (match && match[2]) {
      browserVersion = match[2]
    }

    return `${browserName} ${browserVersion}`
  }

  // Copy URL to clipboard with visual feedback
  copyUrl() {
    if (this.fileUrl) {
      navigator.clipboard
        .writeText(this.fileUrl)
        .then(() => {
          this.copiedField = "url"
          this.showCustomToast("Copied", "URL copied to clipboard", "success")
          setTimeout(() => {
            this.copiedField = ""
          }, 1500)
        })
        .catch((err) => {

          this.showCustomToast("Error", `Failed to copy: ${err.message}`, "error")
        })
    }
  }

  // Copy token to clipboard with visual feedback
  copyToken() {
    if (this.accessToken) {
      navigator.clipboard
        .writeText(this.accessToken)
        .then(() => {
          this.copiedField = "token"
          this.showCustomToast("Copied", "Token copied to clipboard", "success")
          setTimeout(() => {
            this.copiedField = ""
          }, 1500)
        })
        .catch((err) => {

          this.showCustomToast("Error", `Failed to copy: ${err.message}`, "error")
        })
    }
  }

  // Show tooltip for help icons
  showHelpTooltip(event) {
    const tooltipId = event.currentTarget.dataset.tooltip
    this.showTooltip = tooltipId
  }

  hideTooltip() {
    this.showTooltip = ""
  }

  // Return to main upload page
  returnToUpload() {
    this.stopSharing();
    this.fileAccessed = false
    this.fileAccessDetails = null
  }


  // Update session status
  async updateSessionStatus(status) {
    if (this.accessToken) {
      try {
        await updateSessionStatus({
          sessionToken: this.accessToken,
          status: status,
        })

      } catch (error) {

      }
    }
  }

  // Handle chunk acknowledgment from downloader with improved error handling
  handleChunkAcknowledgment(ackData) {
    // Clear the acknowledgment timeout
    if (this.chunkTimeout) {
      clearTimeout(this.chunkTimeout);
      this.chunkTimeout = null;
    }



    // Validate the acknowledgment
    if (ackData.chunkIndex === this.currentChunk) {
      // This is the expected acknowledgment
      this.lastAckedChunk = ackData.chunkIndex;
      this.pendingAck = false;
      this.chunkRetryCount = 0;

      // Increment chunk index after successful acknowledgment
      this.currentChunk++;

      // Process the chunk completion
      this.afterChunkSent();

      // Send next chunk if not at the end
      if (this.currentChunk < this.totalChunks) {
        // Add a small delay to prevent overwhelming the receiver
        setTimeout(() => {
          this.readAndSendChunk();
        }, 4); // 4ms delay between chunks
      }
    } else {
      console.warn(
        `⚠️ Chunk acknowledgment mismatch: received ${ackData.chunkIndex}, expected: ${this.currentChunk}`
      );

      // Handle the mismatch based on whether the ack is for a previous or future chunk
      if (ackData.chunkIndex < this.currentChunk) {
        // This is an acknowledgment for a chunk we've already processed

        // No need to resend, just ignore
      } else {
        // This is an acknowledgment for a future chunk (shouldn't happen)
        // Reset the state to the acknowledged chunk to maintain sync
        this.currentChunk = ackData.chunkIndex + 1;
        this.pendingAck = false;

        // Continue with the next chunk
        if (this.currentChunk < this.totalChunks) {
          this.readAndSendChunk();
        } else {
          this.completeFileTransfer();
        }
      }
    }
  }

  // Computed properties for UI state
  get isAccessDisabled() {
    return this.fileUrl === ""
  }

  get isUrlCopied() {
    return this.copiedField === "url"
  }

  get isTokenCopied() {
    return this.copiedField === "token"
  }

  get currentLoadingText() {
    return this.loadingSteps[this.loadingStep] || "Preparing file transfer..."
  }

  get uploadBoxClass() {
    return this.isDragOver ? "upload-box drag-over" : "upload-box"
  }

  get passwordTooltipClass() {
    return this.showTooltip === "password-help" ? "tooltip visible" : "tooltip"
  }

  get connectionStatusClass() {
    return `peer-status ${this.connectionStatus}`
  }

  get connectionStatusText() {
    switch (this.connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      default:
        return "Disconnected"
    }
  }

  get showAccessDetails() {
    return this.fileAccessed && this.fileAccessDetails
  }

  get downloadStatusText() {
    if (this.transferStatusOverride === "deleted") {
      return "Files have been deleted";
    } else if (this.transferStatusOverride === "stopped") {
      return "File transferring stopped";
    } else if (this.downloadComplete) {
      return "Files have been downloaded successfully";
    } else if (this.isSendingChunks) {
      return "Peer has started downloading. Stay on this page.";
    } else if (this.fileAccessed) {
      return "Files are being downloaded...";
    } else if (this.connectionStatus === "connected" && !this.isSendingChunks) {
      return "Connected, waiting for download to start...";
    } else {
      return "Waiting for connection...";
    }
  }

  get downloadStatusClass() {
    if (this.downloadComplete) {
      return "status-complete"
    } else if (this.fileAccessed || this.isSendingChunks) {
      return "status-downloading"
    } else if (this.connectionStatus === "connected") {
      return "status-connected"
    } else {
      return "status-waiting"
    }
  }

  get fileCountText() {
    const count = this.fileNameList.length
    return count === 1 ? "1 file selected" : `${count} files selected`
  }

  get progressStyle() {
    return `width: ${this.transferProgress}%`
  }

  get combinedFileSizeText() {
    return this.getTotalFileSize()
  }

  get hasFilesSelected() {
    return this.fileNameList && this.fileNameList.length > 0
  }

  get hasFilesInList() {
    return this.uploadedFiles && this.uploadedFiles.length > 0
  }

  get passwordInputType() {
    return this.showPassword ? "text" : "password";
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  get passwordAriaLabel() {
    return this.showPassword ? "Hide password" : "Show password";
  }

  get passwordPlaceholder() {
    return window.innerWidth < 768
      ? 'Enter a passkey for files'
      : 'Enter a password to protect your files';
  }

}
