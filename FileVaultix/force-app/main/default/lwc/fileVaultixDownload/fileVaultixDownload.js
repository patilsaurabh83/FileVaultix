import { LightningElement, track } from "lwc"
import fileVaultixLogo from "@salesforce/resourceUrl/FileValutixDownload"
import getWebRTCSession from "@salesforce/apex/FileUploadController.getWebRTCSession"
import updateSessionStatus from "@salesforce/apex/FileUploadController.updateSessionStatus"

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

export default class FileVaultixDownload extends LightningElement {
  fileVaultixLogo = fileVaultixLogo

  // Core state properties
  @track token = ""
  @track password = ""
  @track showPassword = false
  @track showTokenPopup = false
  @track showPasswordOnly = false
  @track showDownloadBtn = false
  @track downloaded = false
  @track isLoading = false
  @track loadingMessage = ""
  @track currentLoadingStep = ""

  // Error handling properties
  @track errorMessage = ""
  @track popupErrorMessage = ""
  @track errorTitle = "Connection Lost"
  @track errorHint = ""
  @track errorType = "connection"

  // Connection state properties
  @track connectionStatus = null
  @track connectionRetryCount = 0
  @track maxRetries = 3

  // Progress and download properties
  @track showProgressBar = false
  @track downloadProgress = 0
  @track downloadSpeed = ""
  @track estimatedTimeRemaining = ""
  @track totalBytesReceived = 0
  @track totalBytesExpected = 0

  // UI state properties
  @track showTooltip = ""
  @track showRefreshWarning = false
  @track showBlinkingArrow = false
  @track showBrowserWarning = false
  @track browserWarningText = ""

  // File management properties
  @track receivedFiles = []
  @track currentFileIndex = 0
  @track totalFiles = 0
  @track fileList = []
  @track isDownloadingAll = false
  @track currentDownloadingFile = null
  @track allFilesDownloaded = false

  // Session management properties
  @track sessionInfo = null
  @track sessionTimeRemaining = ""
  @track isValidating = false
  @track tokenValidationIcon = false
  @track isTokenValid = false
  @track downloadPeerPublicID = null

  // PeerJS related properties
  peer = null
  connection = null
  peerId = null
  fileChunks = []
  chunkSize = 8192 // Default 8KB chunks to match uploader
  totalChunks = 0
  receivedChunks = 0
  broadcast = null
  sessionData = null
  location = null

  // File transfer state
  currentFileData = {
    name: "",
    size: 0,
    type: "",
    chunks: [],
    receivedChunks: 0,
    totalChunks: 0,
    startTime: null,
  }

  // Timing and monitoring properties
  progressAnimationTimer = null
  progressInterval = null
  sessionTimer = null
  downloadStartTime = null
  lastProgressUpdate = null
  connectionTimeout = null
  heartbeatInterval = null

  // Performance monitoring
  transferStats = {
    startTime: null,
    bytesTransferred: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    connectionQuality: "unknown",
  }

  // Enhanced loading steps with detailed messaging
  loadingSteps = [
    "Loading initial resources...",
    "Initializing peer connection...",
    "Connecting to server...",
    "Validating session credentials...",
    "Establishing connection with peer...",
    "Setting up file transfer channel...",
    "Requesting file list...",
    "Connection ready - awaiting files...",
  ]

  loadingStepIndex = 0
  loadingInterval = null

  // FIXED: Transfer state flags
  isReceivingFile = false
  expectedFileInfo = null
  transferInProgress = false

  // ENHANCED: Chunk acknowledgment tracking
  lastAcknowledgedChunk = -1
  acknowledgmentQueue = new Set()
  duplicateChunkTracker = new Set()

  // Chunk tracking
  lastChunkMetadata = null

  iceServerList = [];
  offlineNotifyTimeout = null;
  slowNetworkToastCount = 0; //Show slow network toast only once per session

  async connectedCallback() {
    try {


      // Load PeerJS library
      await this.loadPeerJS()

      //Fetch current public IP
      this.downloadPeerPublicID = await this.fetchCurrentPublicIP()

      // Initialize performance monitoring
      this.initializePerformanceMonitoring()

      // Check browser compatibility first
      this.checkBrowserCompatibility()

      // Extract and validate token from URL
      await this.handleInitialTokenProcessing()

      // Set up page lifecycle handlers
      this.setupPageLifecycleHandlers()

      //set location
      this.location = await this.fetchLocationByIP();

      //Log Author Name with style
      this.logWithStyle('Designed and developed by Saurabh Patil');

      //fill the iceServerList with the configured TURN servers
      const list = this.getIceServerList();

      this.iceServerList = list;

    } catch (error) {

      this.showError(
        "Failed to initialize the download page. Please refresh and try again.",
        "generic",
        "Initialization Error",
        error.message || "A critical error occurred during startup.",
      )
    }
  }

  disconnectedCallback() {

    this.closeConnection()
    this.clearAllTimers()
    this.removeEventListeners()
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

  // Load PeerJS library
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

  // Initialize performance monitoring
  initializePerformanceMonitoring() {
    this.transferStats = {
      startTime: Date.now(),
      bytesTransferred: 0,
      averageSpeed: 0,
      peakSpeed: 0,
      connectionQuality: "unknown",
      packetLoss: 0,
      latency: 0,
    }
  }

  async fetchCurrentPublicIP() {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error("Failed to fetch IP");
      const data = await response.json();
      return data.ip || "";
    } catch (e) {
      return "";
    }
  }

  getIceServerList() {
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

  // Handle initial token processing from URL
  async handleInitialTokenProcessing() {
    if (localStorage.getItem("uploadingDevice") === "true") {
      this.showCustomToast(
        "Not Allowed",
        "Download blocked on upload device. Use another device.",
        "error"
      );
      this.showError(
        "To keep your files secure, download from a different device.",
        "generic",
        "Download Blocked",
        "This device uploaded the files. For security, downloads are blocked on the same device. Please use a different one."
      );
      return;
    }

    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get("token") || params.get("t")



    if (urlToken) {
      this.token = urlToken
      this.tokenValidationIcon = true

      if (this.validateTokenFormat(urlToken)) {
        this.isTokenValid = true
        this.isLoading = true
        this.loadingMessage = "Validating access token..."

        try {
          await this.fetchSessionDataFromSalesforce(urlToken)

          if (this.sessionData) {
            this.setupSessionInfo()

            const requiresPassword =
              this.sessionData.password !== null &&
              this.sessionData.password !== undefined &&
              this.sessionData.password !== ""

            this.isLoading = false

            if (requiresPassword) {

              this.showTokenPopup = true
              this.showPasswordOnly = true
            } else {

              await this.processToken(true)
            }
          } else {
            this.isLoading = false
            this.showError(
              "Invalid or expired access token.",
              "auth",
              "Invalid Token",
              "The token you provided is not valid or has expired. Please check with the sender for a new link.",
            )
          }
        } catch (error) {
          this.isLoading = false

          this.showError(
            "Failed to validate access token.",
            "auth",
            "Validation Error",
            "There was a problem validating your access. Please try again.",
          )
        }
      } else {
        this.isTokenValid = false
        this.showError(
          "Invalid token format.",
          "auth",
          "Invalid Token",
          "The token format is incorrect. Please check the link and try again.",
        )
      }
    } else {

      this.showTokenPopup = true
      this.showPasswordOnly = false
    }
  }

  // Set up page lifecycle handlers
  setupPageLifecycleHandlers() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
    window.addEventListener("beforeunload", this.handleBeforeUnload.bind(this))
    window.addEventListener("online", this.handleOnlineStatus.bind(this))
    window.addEventListener("offline", this.handleOfflineStatus.bind(this))
    window.addEventListener("unload", this.handleWindowUnload.bind(this));
  }

  // Remove event listeners
  removeEventListeners() {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
    window.removeEventListener("beforeunload", this.handleBeforeUnload.bind(this))
    window.removeEventListener("online", this.handleOnlineStatus.bind(this))
    window.removeEventListener("offline", this.handleOfflineStatus.bind(this))
    window.removeEventListener("unload", this.handleWindowUnload.bind(this));
  }

  // Handle page visibility changes
  handleVisibilityChange() {
    if (document.hidden) {

      this.pauseNonEssentialOperations()
    } else {

      this.resumeOperations()
    }
  }

  // In handleOnlineStatus, clear the timeout if connection is restored
  handleOnlineStatus() {

    this.showCustomToast("Connection Restored", "Internet connection is back online", "success");

    // Clear the offline notification timeout
    if (this.offlineNotifyTimeout) {
      clearTimeout(this.offlineNotifyTimeout);
      this.offlineNotifyTimeout = null;
    }

    if (this.connectionStatus === "disconnected" && this.sessionData) {
      this.attemptReconnection();
    }
  }

  // Update handleOfflineStatus to start the timer
  handleOfflineStatus() {

    this.showCustomToast("Connection Lost", "Internet connection is offline", "warning");

    // Clear any existing timeout
    if (this.offlineNotifyTimeout) {
      clearTimeout(this.offlineNotifyTimeout);
      this.offlineNotifyTimeout = null;
    }

    // Start a 30-second timer to notify uploader if not reconnected
    this.offlineNotifyTimeout = setTimeout(() => {
      if (this.connection && this.connection.open) {
        try {
          this.connection.send({
            type: "downloader_lost_connection",
            message: "Downloader lost connection"
          });

        } catch (e) {
          // Ignore errors if connection is already closed
        }
      }
    }, 30000); // 30 seconds
  }

  // Pause non-essential operations
  pauseNonEssentialOperations() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Resume operations
  resumeOperations() {
    if (this.connectionStatus === "connected") {
      this.startHeartbeat()
    }
  }

  // Clear all timers and intervals
  clearAllTimers() {
    const timers = [
      "broadcast",
      "loadingInterval",
      "progressAnimationTimer",
      "progressInterval",
      "sessionTimer",
      "connectionTimeout",
      "heartbeatInterval",
    ]

    timers.forEach((timer) => {
      if (this[timer]) {
        if (timer === "broadcast") {
          this[timer].close()
        } else {
          clearInterval(this[timer])
          clearTimeout(this[timer])
        }
        this[timer] = null
      }
    })
  }

  // Enhanced browser compatibility check
  checkBrowserCompatibility() {
    const ua = navigator.userAgent.toLowerCase()
    const browserInfo = this.detectBrowser(ua)
    const warnings = []

    if (!window.RTCPeerConnection) {
      warnings.push(
        "Your browser doesn't support WebRTC. Please use Chrome, Firefox, Safari, or Edge for file transfers.",
      )
    }

    if (browserInfo.name === "safari" && browserInfo.version < 13) {
      warnings.push(
        "You're using an older version of Safari with limited WebRTC support. Please update to Safari 13+ for best results.",
      )
    } else if (browserInfo.name === "firefox" && browserInfo.version < 60) {
      warnings.push(
        "You're using an older version of Firefox with limited WebRTC support. Please update to Firefox 60+ for best results.",
      )
    } else if (browserInfo.name === "edge" && browserInfo.version < 79) {
      warnings.push(
        "You're using legacy Edge which has limited WebRTC support. Please use the new Chromium-based Edge for best results.",
      )
    }

    if (this.isMobileBrowser()) {
      this.showCustomToast(
        "Mobile Device Detected",
        "File transfers work on mobile, but desktop browsers provide better performance.",
        "info",
      )
    }

    if (warnings.length > 0) {
      this.showBrowserWarning = true
      this.browserWarningText = warnings.join(" ")
      this.showCustomToast("Browser Compatibility", warnings[0], "warning")
    }
  }

  // Detect browser and version
  detectBrowser(ua) {
    let name = "unknown"
    let version = 0

    if (ua.indexOf("chrome") > -1 && ua.indexOf("edg") === -1) {
      name = "chrome"
      const match = ua.match(/chrome\/(\d+)/)
      version = match ? Number.parseInt(match[1]) : 0
    } else if (ua.indexOf("firefox") > -1) {
      name = "firefox"
      const match = ua.match(/firefox\/(\d+)/)
      version = match ? Number.parseInt(match[1]) : 0
    } else if (ua.indexOf("safari") > -1 && ua.indexOf("chrome") === -1) {
      name = "safari"
      const match = ua.match(/version\/(\d+)/)
      version = match ? Number.parseInt(match[1]) : 0
    } else if (ua.indexOf("edg") > -1) {
      name = "edge"
      const match = ua.match(/edg\/(\d+)/)
      version = match ? Number.parseInt(match[1]) : 0
    }

    return { name, version }
  }

  // Check if mobile browser
  isMobileBrowser() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Validate token format with enhanced checks
  validateTokenFormat(token) {
    if (!token || typeof token !== "string") return false
    if (token.length < 6 || token.length > 128) return false
    if (!/^[a-zA-Z0-9\-_]+$/.test(token)) return false
    return true
  }

  // Setup session information and monitoring
  setupSessionInfo() {
    if (!this.sessionData) return

    this.sessionInfo = {
      singleUse: this.sessionData.singleDownload || false,
      expiresAt: this.sessionData.expiresAt,
      password: !!this.sessionData.password,
    }

    if (this.sessionData.expiresAt) {
      this.startSessionTimer()
    }
  }

  // Start session expiry timer with enhanced monitoring
  startSessionTimer() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer)
    }

    this.sessionTimer = setInterval(() => {
      const now = new Date()
      const expiresAt = new Date(this.sessionData.expiresAt)
      const timeLeft = expiresAt - now

      if (timeLeft <= 0) {
        this.sessionTimeRemaining = "Expired"
        this.showError(
          "Session has expired.",
          "session",
          "Session Expired",
          "This sharing session has ended. Please request a new link from the sender.",
        )
        clearInterval(this.sessionTimer)
        this.updateSessionStatusOnExit();
        this.sessionTimer = null
      } else {
        this.sessionTimeRemaining = this.formatTimeRemaining(timeLeft)

        if (timeLeft < 300000 && !this.sessionWarningShown) {
          this.sessionWarningShown = true
          this.showCustomToast("Session Expiring Soon", "This session will expire in less than 5 minutes.", "warning")
        }
      }
    }, 1000)
  }

  // Format time remaining with enhanced precision
  formatTimeRemaining(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (days > 0) {
      return `${days}d ${hours}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Fetch session data from Salesforce with retry logic
  async fetchSessionDataFromSalesforce(token, retryCount = 0) {
    const maxRetries = 3

    try {


      const response = await getWebRTCSession({ token })

      if (response && response.success && response.data) {
        this.sessionData = JSON.parse(response.data)
        sessionStorage.setItem("uploadSessionData", response.data)

        return true
      } else {
        console.warn("⚠️ No session data found for token")
        this.sessionData = null
        return false
      }
    } catch (error) {


      if (retryCount < maxRetries) {

        await this.delay((retryCount + 1) * 1000)
        return this.fetchSessionDataFromSalesforce(token, retryCount + 1)
      }

      this.sessionData = null
      return false
    }
  }

  // Utility delay function
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Handle beforeunload event with enhanced logic
  handleBeforeUnload(event) {
    if (this.connectionStatus === "connected" || this.isDownloadingAll || this.showProgressBar) {
      this.showRefreshWarning = true
      const message = "Download will be cancelled if you leave this page."
      event.preventDefault()
      event.returnValue = message
      return message
    }
  }

  handleWindowUnload() {
    // Notify uploader if connection is open
    if (this.connection && this.connection.open) {
      try {
        this.connection.send({ type: "downloader_left" });
      } catch (e) { }
    }
  }

  // Cancel page refresh
  cancelRefresh() {
    this.showRefreshWarning = false
  }

  // Confirm page refresh
  confirmRefresh() {
    this.showRefreshWarning = false
    this.closeConnection()
    this.updateSessionStatusOnExit()

    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  // Update session status when exiting
  async updateSessionStatusOnExit() {
    if (this.sessionData && this.sessionData.token) {
      try {
        await updateSessionStatus({
          sessionToken: this.sessionData.token,
          status: "Closed",
        })
      } catch (error) {

      }
    }
  }

  // Get session data from sessionStorage with validation
  getSessionData() {
    try {
      const data = sessionStorage.getItem("uploadSessionData")
      if (!data) return null

      const parsed = JSON.parse(data)

      if (!parsed.token || !parsed.peerId) {
        //console.warn("⚠️ Invalid session data structure")
        return null
      }

      return parsed
    } catch (error) {

      return null
    }
  }

  // Handle token input with real-time validation
  handleTokenInput(event) {
    this.token = event.target.value.trim()
    this.tokenValidationIcon = this.token.length > 0
    this.isTokenValid = this.validateTokenFormat(this.token)
    this.popupErrorMessage = ""

    if (this.token.length > 0 && !this.isTokenValid) {
      this.popupErrorMessage = "Invalid token format"
    }
  }

  // Handle password input
  handlePasswordInput(event) {
    this.password = event.target.value
    this.popupErrorMessage = ""
  }

  // Handle token/password submission with enhanced validation
  async handleSubmitToken() {


    this.popupErrorMessage = ""
    this.isValidating = true

    try {
      await this.delay(300)

      if (this.showPasswordOnly) {
        if (!this.password) {
          this.popupErrorMessage = "Please enter a password"
          return
        }

        if (this.password.length < 1) {
          this.popupErrorMessage = "Password cannot be empty"
          return
        }


        await this.processToken(false)
      } else {
        if (!this.token) {
          this.popupErrorMessage = "Please enter a valid token"
          return
        }

        if (!this.validateTokenFormat(this.token)) {
          this.popupErrorMessage = "Invalid token format"
          return
        }


        await this.processToken(false)
      }
    } catch (error) {

      this.popupErrorMessage = "An error occurred. Please try again."
    } finally {
      this.isValidating = false
    }
  }

  // Enhanced token processing with comprehensive validation
  async processToken(isAutomatic) {


    this.errorMessage = ""
    this.popupErrorMessage = ""

    try {
      if (!isAutomatic && !this.sessionData) {
        this.isValidating = true
        const success = await this.fetchSessionDataFromSalesforce(this.token)

        if (!success) {
          this.showError(
            "Invalid access token. Please check and try again.",
            "auth",
            "Invalid Token",
            "The token you provided is not valid or has expired.",
          )
          return
        }
      }

      if (!this.sessionData || !this.sessionData.token || this.sessionData.token !== this.token) {
        this.showError(
          "Invalid access token. Please check and try again.",
          "auth",
          "Invalid Token",
          "The token you provided is not valid or has expired.",
        )
        return
      }

      if (this.sessionData.expiresAt) {
        const now = new Date()
        const expiresAt = new Date(this.sessionData.expiresAt)

        if (now >= expiresAt) {
          this.showError(
            "Session has expired.",
            "session",
            "Session Expired",
            "This sharing session has ended. Please request a new link.",
          )
          return
        }
      }

      if (
        this.sessionData.publicIP &&
        this.downloadPeerPublicID &&
        this.sessionData.publicIP === this.downloadPeerPublicID
      ) {
        this.showCustomToast(
          "Heads Up",
          "Your peer is working on your network or is nearby.👀",
          "info"
        );
      }

      const requiresPassword =
        this.sessionData.password !== null &&
        this.sessionData.password !== undefined &&
        this.sessionData.password !== ""

      if (requiresPassword) {
        if (!this.password) {
          this.showTokenPopup = true
          this.showPasswordOnly = true
          this.popupErrorMessage = "Password is required for this file"
          return
        }

        if (this.sessionData.password !== this.password) {
          this.showTokenPopup = true
          this.showPasswordOnly = true
          this.popupErrorMessage = "Incorrect password. Please try again."
          return
        }
      }

      this.isValidating = false
      this.showTokenPopup = false
      this.setupSessionInfo()

      // Start connection process with enhanced loading
      this.startEnhancedLoading(async () => {
        const success = await this.initializePeerJS()
        if (!success) {
          this.showError(
            "Failed to establish connection.",
            "connection",
            "Connection Failed",
            "Please try again or check your network connection.",
          )
        }
      })
    } catch (error) {

      this.isValidating = false
      this.showError(
        "An error occurred while processing your request.",
        "generic",
        "Processing Error",
        error.message || "Please try again.",
      )
    }
  }

  // Show error with enhanced categorization and custom toast
  showError(message, type = "generic", title = "", hint = "") {


    this.errorMessage = message
    this.errorType = type || "generic"

    if (title) {
      this.errorTitle = title
    } else {
      this.errorTitle = this.getErrorTitle(type)
    }

    this.errorHint = hint || this.getDefaultHint(type)
    this.isLoading = false
    this.isValidating = false

    this.showCustomToast(this.errorTitle, message, "error")

    if (this.showTokenPopup) {
      this.popupErrorMessage = message
    }

    if (!this.showTokenPopup) {
      this.showBlinkingArrow = true
    }

    this.logError(type, message, title)
  }

  // Get error title based on type
  getErrorTitle(type) {
    const titles = {
      connection: "Connection Lost",
      file: "File Error",
      auth: "Authentication Failed",
      session: "Session Error",
      network: "Network Error",
      browser: "Browser Error",
      generic: "Error Occurred",
    }

    return titles[type] || titles.generic
  }

  // Enhanced custom toast notification
  showCustomToast(title, message, variant, duration = 5000) {
    const toastCmp = this.template.querySelector("c-custom-toast")

    if (toastCmp) {
      toastCmp.showNotification(title, message, variant, duration)
    } else {
      const emoji = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
      }


    }
  }

  // Get default hint based on error type
  getDefaultHint(type) {
    const hints = {
      connection: "You can try refreshing the page or contact the sender for a new sharing link.",
      file: "The file may be corrupted or no longer available.",
      auth: "Please check your token and password and try again.",
      session: "The sharing session may have expired or been closed by the sender.",
      network: "Please check your internet connection and try again.",
      browser: "Try using a different browser or updating your current browser.",
      generic: "Please try again or contact support if the issue persists.",
    }

    return hints[type] || hints.generic
  }

  // Log error for analytics
  logError(type, message, title) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: type,
      message: message,
      title: title,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }


  }

  // Start enhanced loading with better step progression
  startEnhancedLoading(onComplete) {
    this.isLoading = true
    this.loadingStepIndex = 0
    this.loadingMessage = "Initializing connection..."
    this.currentLoadingStep = this.loadingSteps[this.loadingStepIndex]
    this.connectionStatus = "connecting"

    const totalSteps = this.loadingSteps.length
    const totalDuration = 8000 // 8 seconds for better UX
    const stepDuration = totalDuration / totalSteps

    if (this.loadingInterval) clearInterval(this.loadingInterval)

    this.loadingInterval = setInterval(() => {
      this.loadingStepIndex++
      if (this.loadingStepIndex < totalSteps) {
        this.currentLoadingStep = this.loadingSteps[this.loadingStepIndex]
        this.loadingMessage = 'Building connection... ';
      } else {
        clearInterval(this.loadingInterval)
        this.loadingInterval = null
      }
    }, stepDuration)

    // Start connection process after 2 seconds
    setTimeout(async () => {
      if (onComplete) {
        await onComplete()
      }
    }, 2000)
  }

  // Enhanced PeerJS initialization
  async initializePeerJS() {
    try {


      // Update loading step
      this.currentLoadingStep = "Connecting to PeerJS server..."

      // Generate unique peer ID for downloader
      this.peerId = this.generateUUID() + "-downloader"

      // Enhanced PeerJS configuration
      const peerConfig = {
        host: "0.peerjs.com",
        port: 443,
        path: "/",
        secure: true,
        config: {
          iceServers: this.iceServerList,
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        },
        debug: 2,
      };

      // Update loading step
      this.currentLoadingStep = "Creating peer connection..."

      try {
        this.peer = new Peer(this.peerId, peerConfig)

      } catch (e) {

        throw new Error("Failed to initialize PeerJS. Your browser may not support the required features.")
      }

      // Update loading step
      this.currentLoadingStep = "Setting up connection handlers..."

      this.setupPeerJSHandlers()

      // Wait for peer to be ready
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {

          this.isLoading = false
          this.connectionStatus = "disconnected"
          this.showError(
            "Unable to connect to the server. The servers may be offline or experiencing issues.",
            "connection",
            "Server Offline",
            "Please try again after some time."
          )

          if (this.connection && this.connection.open) {
            try {
              this.connection.send({ type: "stop_sharing", reason: "timeout" });
            } catch (e) {
            }
          }
          reject(new Error("PeerJS connection timeout"))
        }, 120000) // 2 minute timeout

        this.peer.on("open", (id) => {
          clearTimeout(timeout)

          this.peerId = id

          // Update loading step
          this.currentLoadingStep = "Setting up signaling..."

          this.setupBroadcastChannel()

          // Update loading step
          this.currentLoadingStep = "Connecting to uploader..."

          // Try to connect to uploader
          this.connectToUploader(this.sessionData.peerId);

          resolve(true)
        })

        this.peer.on("error", (error) => {
          clearTimeout(timeout)

          this.handlePeerJSError(error)
          reject(error)
        })
      })
    } catch (error) {

      this.isLoading = false
      this.connectionStatus = "disconnected"

      let errorMessage = "Failed to establish connection."
      let errorHint = "Please try again."

      if (error.message.includes("Network")) {
        errorMessage = "Network connectivity issues detected."
        errorHint = "Please check your internet connection and try again."
      } else if (error.message.includes("PeerJS")) {
        errorMessage = "Your browser doesn't support the required features."
        errorHint = "Please try using Chrome, Firefox, or Edge."
      }

      this.showError(errorMessage, "connection", "Connection Failed", errorHint)
      return false
    }
  }

  // Generate UUID for peer identification
  generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Set up PeerJS event handlers
  setupPeerJSHandlers() {
    // Handle disconnection
    this.peer.on("disconnected", () => {
      //console.warn("⚠️ PeerJS disconnected from server")
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
    let errorTitle = "Connection Error";
    let errorType = "connection";

    switch (error.type) {
      case "peer-unavailable":
        errorMessage = "The uploader is not available."
        errorHint = "Make sure the upload page is open and try again."
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

    this.showCustomToast("Connection Error", errorMessage, "error");
    this.showError(errorMessage, errorType, errorTitle, errorHint);
    this.connectionStatus = "disconnected"
  }

  // Set up BroadcastChannel for signaling
  setupBroadcastChannel() {
    try {
      this.broadcast = new BroadcastChannel("peerjs-signaling")


      this.broadcast.onmessage = async (event) => {
        const { type, data } = event.data


        try {
          switch (type) {
            case "uploaderReady":

              this.connectToUploader(data.peerId)
              break

            case "connectionClosed":

              this.handleConnectionClosed()
              break

            case "fileListUpdate":
              if (data && Array.isArray(data)) {
                this.updateFileList(data)
              }
              break

            case "error":
              this.handleBroadcastError(data)
              break

            default:

          }
        } catch (error) {

        }
      }

      this.broadcast.onerror = (error) => {

        this.showCustomToast("Communication Error", "Lost communication with uploader", "warning")
      }

      // Announce that downloader is connected
      setTimeout(() => {
        if (this.broadcast) {
          this.broadcast.postMessage({
            type: "downloaderConnected",
            data: {
              peerId: this.peerId,
              timestamp: Date.now(),
            },
          })
        }
      }, 1000)
    } catch (error) {

    }
  }

  // Connect to uploader
  connectToUploader(uploaderPeerId) {
    if (!this.peer) {

      return
    }

    // Get uploader peer ID from session data if not provided
    if (this.sessionData && this.sessionData.peerId) {
      uploaderPeerId = this.sessionData.peerId
    }

    if (!uploaderPeerId) {

      this.showError(
        "Cannot find uploader. Please make sure the upload page is open.",
        "connection",
        "Uploader Not Found",
        "The uploader may have closed the page or the session may have expired.",
      )
      return
    }



    try {
      this.connection = this.peer.connect(uploaderPeerId, {
        reliable: true,
        serialization: "binary", // Use binary for file transfers
      })

      this.setupConnectionHandlers()
    } catch (error) {

      this.showCustomToast("Connection Error", "Failed to connect to uploader", "error")
    }
  }

  // Set up connection handlers for data transfer
  setupConnectionHandlers() {
    if (!this.connection) return



    const openTimeout = setTimeout(() => {
      if (this.connectionStatus !== "connected") {
        this.showError(
          "Unable to establish a data connection. The servers may be busy or offline.",
          "connection",
          "Server Busy",
          "Please try again after some time."
        );
        // Optionally, close the connection
        if (this.connection && this.connection.open) {
          try {
            this.connection.send({ type: "stop_sharing", reason: "timeout" });
          } catch (e) {
          }
        }
      }
    }, 60000); // 1 minute timeout

    // Handle connection open
    this.connection.on("open", () => {
      clearTimeout(openTimeout);

      this.connectionStatus = "connected"
      this.showDownloadBtn = true
      this.showBlinkingArrow = false

      this.currentLoadingStep = "Data connection ready, requesting files..."

      // Request file list from uploader
      this.requestFileList()

      // Start heartbeat
      this.startHeartbeat()

      // Hide loading after a short delay to allow file list to load
      setTimeout(() => {
        this.isLoading = false
        this.currentLoadingStep = "Ready to download files!"
      }, 2000)
    })

    // Handle connection close
    this.connection.on("close", () => {
      clearTimeout(openTimeout);

      this.handleConnectionClosed()
    })

    // Handle connection errors
    this.connection.on("error", (error) => {
      clearTimeout(openTimeout);

      this.showError(
        "Data transfer error occurred.",
        "connection",
        "Transfer Error",
        "There was a problem with the data connection. Please try again.",
      )
    })

    // Handle incoming data/messages
    this.connection.on("data", (data) => {
      try {
        if (typeof data === "object" && data.type) {
          // Handle JSON message
          this.handleConnectionMessage(data)
        } else {
          // Handle binary data (file chunks)
          this.handleFileChunk(data)
        }
      } catch (error) {

      }
    })
  }

  // Request file list from uploader
  requestFileList() {
    if (this.connection && this.connection.open) {

      this.connection.send({
        type: "requestFileList",
        timestamp: Date.now(),
      })
    } else {
      //console.warn("⚠️ Cannot request file list - connection not ready")
      // Retry after a delay
      setTimeout(() => {
        this.requestFileList()
      }, 1000)
    }
  }

  // Handle connection messages with enhanced processing
  handleConnectionMessage(message) {


    switch (message.type) {
      case "fileList":
        this.updateFileList(message.files)
        break

      case "file_info":
        this.handleFileStart(message.file)
        break

      case "transfer_progress":
        this.handleTransferProgress(message)
        break

      case "transfer_complete":
        this.handleFileTransferComplete(message)
        break

      case "all_files_complete":
        this.handleAllFilesComplete()
        break

      case "error":
        this.handleTransferError(message)
        break

      case "chunk_metadata":
        this.handleChunkMetadata(message)
        break

      case "file_complete":

        // Verify we have all chunks before allowing completion
        if (this.receivedChunks >= message.totalChunks) {
          this.verifyAndCompleteFile()
        } else {
          // console.warn(
          //   `⚠️ File complete signal received but missing chunks: ${this.receivedChunks}/${message.totalChunks}`,
          // )
        }
        break

      case "uploader_left":
        this.showCustomToast("Uploader Left", "The uploader has closed their window. File transfer cannot continue.", "error");
        // Optionally, close the connection and show error UI
        if (this.connection) this.connection.close();
        break;

      case "uploader_tab_changed":
        this.showCustomToast(
          "Uploader Changed Tab",
          "The uploader has switched tabs. For better download speed, ask them to keep FileVaultix in the foreground.",
          "warning"
        );
        break;

      default:

    }
  }

  // Handle transfer error
  handleTransferError(message) {
    this.showError(
      message.message || "An error occurred during file transfer.",
      "file",
      "Transfer Error",
      message.hint || "Please try again or contact the sender.",
    )
  }

  // Update file list with enhanced metadata
  updateFileList(files) {


    if (!files || !Array.isArray(files)) {
      console.warn("⚠️ Invalid file list received")
      return
    }

    this.fileList = files.map((file, index) => ({
      id: index,
      name: file.name,
      size: this.formatFileSize(file.size),
      sizeBytes: file.size,
      type: file.type || "Unknown",
      enhancedType: this.getEnhancedFileTypeName(file),
      lastModified: file.lastModified ? new Date(file.lastModified).toLocaleDateString() : "",
      isImage: this.isImageFile(file.name),
      isDocument: this.isDocumentFile(file.name),
      isArchive: this.isArchiveFile(file.name),
      isAudio: this.isAudioFile(file.name),
      isVideo: this.isVideoFile(file.name),
      isDefault:
        !this.isImageFile(file.name) &&
        !this.isDocumentFile(file.name) &&
        !this.isArchiveFile(file.name) &&
        !this.isAudioFile(file.name) &&
        !this.isVideoFile(file.name),
      canDownload: true,
      isDownloading: false,
      isDownloaded: false,
      isSingleDownload: false,
      showProgress: false,
      progressText: "0%",
      progressStyle: "width: 0%",
    }))

    this.totalFiles = this.fileList.length


    // Show success message
    this.showCustomToast(
      "Files Available",
      `${this.totalFiles} file${this.totalFiles !== 1 ? "s" : ""} ready for download`,
      "success",
    )
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

  // Enhanced file type detection helpers
  isImageFile(filename) {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico", ".tiff"]
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  isDocumentFile(filename) {
    const docExtensions = [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".xls", ".xlsx", ".ppt", ".pptx"]
    return docExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  isArchiveFile(filename) {
    const archiveExtensions = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"]
    return archiveExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  isAudioFile(filename) {
    const audioExtensions = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"]
    return audioExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  isVideoFile(filename) {
    const videoExtensions = [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"]
    return videoExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
  }

  // Enhanced file size formatting
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // FIXED: Handle file start with proper buffering system
  handleFileStart(fileInfo) {


    // FIXED: Prevent duplicate file transfers more robustly
    if (this.isReceivingFile && this.expectedFileInfo) {
      if (this.expectedFileInfo.name === fileInfo.name && this.expectedFileInfo.size === fileInfo.size) {

        return
      } else {

        this.resetFileTransferState()
      }
    }

    // FIXED: Reset transfer state properly
    this.isReceivingFile = true
    this.expectedFileInfo = fileInfo
    this.transferInProgress = true

    // ENHANCED: Use the chunk size from the uploader
    this.chunkSize = fileInfo.chunkSize || 8192


    // Reset current file data with chunk buffer
    this.currentFileData = {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.fileType || fileInfo.type || "application/octet-stream",
      chunks: new Array(fileInfo.totalChunks || 0), // Pre-allocate array for chunks
      receivedChunks: 0,
      totalChunks: fileInfo.totalChunks || 0,
      startTime: Date.now(),
      chunkMetadata: new Map(), // Track chunk metadata
      isComplete: false,
    }

    this.currentFileIndex = fileInfo.fileIndex || 0
    this.totalChunks = fileInfo.totalChunks || 0
    this.receivedChunks = 0
    this.fileChunks = new Array(this.totalChunks) // Pre-allocate chunk array
    this.downloadStartTime = Date.now()
    this.lastProgressUpdate = Date.now()
    this.currentDownloadingFile = fileInfo.name

    // ENHANCED: Reset acknowledgment tracking
    this.lastAcknowledgedChunk = -1
    this.acknowledgmentQueue.clear()
    this.duplicateChunkTracker.clear()

    // Reset transfer stats for this file
    this.transferStats.bytesTransferred = 0
    this.transferStats.averageSpeed = 0
    this.transferStats.peakSpeed = 0

    this.showProgressBar = true
    this.downloadProgress = 0

    // Update file list item to show downloading state
    if (this.fileList[this.currentFileIndex]) {
      this.fileList[this.currentFileIndex].isDownloading = true
      this.fileList[this.currentFileIndex].showProgress = true
      this.fileList[this.currentFileIndex].canDownload = false
      this.fileList[this.currentFileIndex].progressText = "0%"
    }

    // Start progress monitoring
    this.startProgressMonitoring()

    // Show transfer start notification
    this.showCustomToast("Download Started", `Receiving ${fileInfo.name}...`, "info")

    // Send acknowledgment to uploader
    if (this.connection && this.connection.open) {
      this.connection.send({
        type: "file_request",
        fileIndex: this.currentFileIndex,
        timestamp: Date.now(),
      })
    }
  }

  // ENHANCED: File chunk handling with improved acknowledgment system
  handleFileChunk(chunk) {
    // Accept both ArrayBuffer and Uint8Array
    let arrayBuffer;
    if (chunk instanceof ArrayBuffer) {
      arrayBuffer = chunk;
    } else if (chunk instanceof Uint8Array) {
      arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    } else {
      return;
    }

    // ENHANCED: Get chunk index from metadata or use sequential numbering
    let chunkIndex = this.receivedChunks;
    if (this.lastChunkMetadata) {
      chunkIndex = this.lastChunkMetadata.chunkIndex;
      this.lastChunkMetadata = null;
    }



    // Validate chunk index
    if (chunkIndex >= this.totalChunks) {
      return;
    }

    // ENHANCED: Check for duplicate chunks
    if (this.duplicateChunkTracker.has(chunkIndex)) {

      this.sendChunkAcknowledgment(chunkIndex);
      return;
    }

    // Store the chunk in the correct position
    this.fileChunks[chunkIndex] = arrayBuffer;
    this.currentFileData.chunks[chunkIndex] = arrayBuffer;
    this.receivedChunks++;
    this.currentFileData.receivedChunks++;

    // ENHANCED: Track this chunk as received
    this.duplicateChunkTracker.add(chunkIndex);

    // ENHANCED: Send immediate acknowledgment with proper tracking
    this.sendChunkAcknowledgment(chunkIndex);

    // Update transfer stats
    this.transferStats.bytesTransferred += chunk.byteLength

    // Update progress
    if (this.totalChunks > 0) {
      this.downloadProgress = Math.round((this.receivedChunks / this.totalChunks) * 100)

      // Update file list item progress
      if (this.fileList[this.currentFileIndex]) {
        this.fileList[this.currentFileIndex].progressText = `${this.downloadProgress}%`
        this.fileList[this.currentFileIndex].progressStyle = `width: ${this.downloadProgress}%`
      }
    }

    // Update speed calculation
    this.updateDownloadSpeed()

    // Log progress periodically
    if (this.receivedChunks % 50 === 0 || this.receivedChunks === this.totalChunks) {

    }

    // ENHANCED: Only complete when ALL chunks are received and verified
    if (this.receivedChunks >= this.totalChunks && this.totalChunks > 0) {

      this.verifyAndCompleteFile()
    }
  }

  // ENHANCED: Send chunk acknowledgment with improved duplicate prevention
  sendChunkAcknowledgment(chunkIndex) {
    if (!this.connection || !this.connection.open) {
      //console.warn("⚠️ Cannot send acknowledgment - connection not ready")
      return
    }

    // ENHANCED: Prevent duplicate acknowledgments more efficiently
    if (this.acknowledgmentQueue.has(chunkIndex)) {
      return
    }

    try {
      const ackMessage = {
        type: "chunk_ack",
        chunkIndex: chunkIndex,
        timestamp: Date.now(),
        fileName: this.currentFileData.name
      }

      this.connection.send(ackMessage)
      this.acknowledgmentQueue.add(chunkIndex)
      this.lastAcknowledgedChunk = Math.max(this.lastAcknowledgedChunk, chunkIndex)



      // ENHANCED: Clean up old acknowledgments to prevent memory leaks
      if (this.acknowledgmentQueue.size > 1000) {
        const sortedAcks = Array.from(this.acknowledgmentQueue).sort((a, b) => a - b)
        const toRemove = sortedAcks.slice(0, 500)
        toRemove.forEach(ack => this.acknowledgmentQueue.delete(ack))
      }

    } catch (error) {

    }
  }

  // Handle chunk metadata for better tracking
  handleChunkMetadata(metadata) {
    console.log(
      `📋 Chunk metadata received: ${metadata.chunkIndex + 1}/${metadata.totalChunks} for ${metadata.fileName} (${metadata.chunkSize} bytes)`,
    )

    // Store metadata for the next chunk
    this.lastChunkMetadata = metadata

    // Store metadata for verification
    if (this.currentFileData && this.currentFileData.chunkMetadata) {
      this.currentFileData.chunkMetadata.set(metadata.chunkIndex, metadata)
    }
  }

  // ENHANCED: Verify all chunks received before completing file
  verifyAndCompleteFile() {


    // Check if all chunks are present and calculate total size
    let allChunksReceived = true
    let totalSize = 0
    const expectedSize = this.currentFileData.size

    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.fileChunks[i]) {
        //console.warn(`⚠️ Missing chunk ${i + 1}/${this.totalChunks}`)
        allChunksReceived = false
        break
      }
      totalSize += this.fileChunks[i].byteLength
    }

    if (!allChunksReceived) {

      this.showError(
        "File transfer incomplete. Some chunks are missing.",
        "file",
        "Transfer Error",
        "Please try downloading the file again.",
      )
      this.resetFileTransferState()
      return
    }

    // Verify file size matches expected size
    if (totalSize !== expectedSize) {


      // Log chunk details for debugging

      for (let i = 0; i < this.totalChunks; i++) {
        const chunk = this.fileChunks[i]
        const metadata = this.currentFileData.chunkMetadata.get(i)
        console.log(
          `  Chunk ${i + 1}: ${chunk ? chunk.byteLength : "missing"} bytes${metadata ? ` (expected: ${metadata.chunkSize})` : ""}`,
        )
      }

      this.showError(
        "File size mismatch detected.",
        "file",
        "Transfer Error",
        `Expected ${expectedSize} bytes but received ${totalSize} bytes. The file may be corrupted.`,
      )
      this.resetFileTransferState()
      return
    }


    this.completeFileDownload()
  }

  async fetchLocationByIP() {
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error("Failed to fetch location");

      const data = await response.json();
      const parts = [data.city, data.region, data.country_name].filter(Boolean);
      return parts.join(", ");
    } catch (e) {
      return "Unknown location";
    }
  }

  // ENHANCED: Complete file download with proper state reset and validation
  async completeFileDownload() {


    try {
      // Final verification before creating blob
      if (this.fileChunks.length !== this.totalChunks) {
        throw new Error(`Chunk count mismatch: expected ${this.totalChunks}, got ${this.fileChunks.length}`)
      }

      // Filter out any null/undefined chunks
      const validChunks = this.fileChunks.filter((chunk) => chunk instanceof ArrayBuffer)
      if (validChunks.length !== this.totalChunks) {
        throw new Error(`Invalid chunks detected: ${validChunks.length}/${this.totalChunks} valid`)
      }

      // Reconstruct file from chunks
      const safeMimeType = this.getSafeMimeType(this.currentFileData.type)
      const blob = new Blob(validChunks, { type: safeMimeType })

      // Verify blob size
      if (blob.size !== this.currentFileData.size) {
        throw new Error(`Blob size mismatch: expected ${this.currentFileData.size}, got ${blob.size}`)
      }

      // Create and trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = this.currentFileData.name
      a.style.display = "none"

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      // Update UI and stats
      this.showProgressBar = false
      this.downloadProgress = 100

      // Update file list item
      if (this.fileList[this.currentFileIndex]) {
        this.fileList[this.currentFileIndex].isDownloading = false
        this.fileList[this.currentFileIndex].isDownloaded = true
        this.fileList[this.currentFileIndex].showProgress = false
        this.fileList[this.currentFileIndex].progressText = "Complete"
        this.fileList[this.currentFileIndex].canDownload = false
      }

      this.receivedFiles.push({
        name: this.currentFileData.name,
        size: this.currentFileData.size,
        type: this.currentFileData.type,
        downloadTime: Date.now() - this.downloadStartTime,
        averageSpeed: this.transferStats.averageSpeed,
      })

      // Stop progress monitoring
      this.stopProgressMonitoring()

      // Calculate final transfer stats
      const transferTime = (Date.now() - this.downloadStartTime) / 1000
      const finalSpeed = this.formatSpeed(this.currentFileData.size / transferTime)

      // Show success message with stats
      this.showCustomToast(
        "Download Complete",
        `${this.currentFileData.name} downloaded successfully (${finalSpeed})`,
        "success",
      )

      // Send completion notification to uploader
      if (this.connection && this.connection.open) {
        this.connection.send({
          type: "file_received",
          fileIndex: this.currentFileData.fileIndex,
          fileName: this.currentFileData.name,
          fileSize: this.currentFileData.size,
          clientInfo: {
            browser: this.getBrowserInfo(),
            location: this.location,
            timestamp: Date.now(),
          },
        })
      }

      // If downloading all, request next file if available
      if (this.isDownloadingAll && this.currentFileIndex + 1 < this.fileList.length) {
        setTimeout(() => {
          if (this.connection && this.connection.open) {
            this.connection.send({
              type: "request_next_file",
              fileIndex: this.currentFileIndex + 1,
            })
          }
        }, 500)
      } else if (this.isDownloadingAll) {
        // All files done
        this.allFilesDownloaded = true
        this.isDownloadingAll = false
        this.showCustomToast("All Downloads Complete", "All files have been downloaded successfully", "success")
        if (this.connection && this.connection.open) {
          this.connection.send({
            type: "download_complete"
          })
        }
      }

      // ENHANCED: Reset transfer state properly
      this.resetFileTransferState()

    } catch (error) {

      this.showError(
        "Failed to complete file download.",
        "file",
        "Download Error",
        `Error: ${error.message}. Please try downloading again.`,
      )

      // Reset transfer state on error
      this.resetFileTransferState()
    }
  }

  getSafeMimeType(originalType) {
    // If no type provided or empty, use the safe default
    if (!originalType || originalType.trim() === "") {
      return "application/octet-stream"
    }

    // Normalize the MIME type to lowercase
    const mimeType = originalType.toLowerCase()

    // List of MIME types allowed by Salesforce Lightning Locker
    const allowedMimeTypes = [
      "application/json",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/zip",
      "application/x-bzip",
      "application/x-rar-compressed",
      "application/x-tar",
    ]

    // Check if the MIME type is directly allowed
    if (allowedMimeTypes.includes(mimeType)) {
      return mimeType
    }

    // Check if it's a wildcard allowed type (video/*, audio/*, image/*, font/*)
    if (
      mimeType.startsWith("video/") ||
      mimeType.startsWith("audio/") ||
      mimeType.startsWith("image/") ||
      mimeType.startsWith("font/")
    ) {
      return mimeType
    }

    // For Microsoft Office documents, map to application/octet-stream
    if (
      mimeType.includes("officedocument") ||
      mimeType.includes("msword") ||
      mimeType.includes("ms-excel") ||
      mimeType.includes("ms-powerpoint")
    ) {
      return "application/octet-stream"
    }

    // For any other type, use the safe default
    return "application/octet-stream"
  }

  // Handle file transfer complete message
  handleFileTransferComplete(message) {


    // If we haven't completed the file yet, complete it now
    if (this.receivedChunks < this.totalChunks || this.totalChunks === 0) {
      this.completeFileDownload()
    }
  }

  // Handle all files complete
  handleAllFilesComplete() {

    this.isDownloadingAll = false
    this.allFilesDownloaded = true;
    this.showCustomToast("All Downloads Complete", "All files have been downloaded successfully", "success")
  }

  // Reset file transfer state
  resetFileTransferState() {
    this.fileChunks = []
    this.receivedChunks = 0
    this.totalChunks = 0
    this.currentDownloadingFile = null
    this.downloadStartTime = null
    this.lastProgressUpdate = null
    this.currentFileData = {
      name: "",
      size: 0,
      type: "",
      chunks: [],
      receivedChunks: 0,
      totalChunks: 0,
      startTime: null,
    }
    this.isReceivingFile = false
    this.expectedFileInfo = null
    this.transferInProgress = false

    // ENHANCED: Clear acknowledgment tracking
    this.lastAcknowledgedChunk = -1
    this.acknowledgmentQueue.clear()
    this.duplicateChunkTracker.clear()
  }

  // Handle transfer progress updates
  handleTransferProgress(message) {
    if (message.progress !== undefined) {
      this.downloadProgress = message.progress

      // Update file list item progress
      if (this.fileList[this.currentFileIndex]) {
        this.fileList[this.currentFileIndex].progressText = `${message.progress}%`
        this.fileList[this.currentFileIndex].progressStyle = `width: ${message.progress}%`
      }
    }

    if (message.speed !== undefined) {
      this.downloadSpeed = this.formatSpeed(message.speed)
    }

    if (message.eta !== undefined) {
      this.estimatedTimeRemaining = this.formatTime(message.eta)
    }
  }

  // Start progress monitoring with enhanced metrics
  startProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
    }

    this.progressInterval = setInterval(() => {
      this.updateDownloadSpeed()
      this.updateEstimatedTime()
    }, 1000)
  }

  // Stop progress monitoring
  stopProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval)
      this.progressInterval = null
    }
  }

  // Update download speed with enhanced calculations
  updateDownloadSpeed() {
    const now = Date.now()
    const timeDiff = (now - this.downloadStartTime) / 1000

    if (timeDiff > 0) {
      const currentSpeed = this.transferStats.bytesTransferred / timeDiff

      if (this.transferStats.averageSpeed === 0) {
        this.transferStats.averageSpeed = currentSpeed
      } else {
        this.transferStats.averageSpeed = this.transferStats.averageSpeed * 0.8 + currentSpeed * 0.2
      }

      if (currentSpeed > this.transferStats.peakSpeed) {
        this.transferStats.peakSpeed = currentSpeed
      }

      this.downloadSpeed = this.formatSpeed(this.transferStats.averageSpeed)
      this.lastProgressUpdate = now

      if (this.transferStats.averageSpeed > 0 && this.transferStats.averageSpeed < 102400) {
        if (this.slowNetworkToastCount < 1) {
          this.showCustomToast(
            "Slow Network",
            "Your network speed is low. Try moving to a different place for better connectivity.",
            "warning",
            6000 // show for 5 seconds
          );
          this.slowNetworkToastCount++;
        }
      } else {
        // Reset the counter if speed improves
        this.slowNetworkToastCount = 0;
      }
    }
  }

  // Update estimated time remaining
  updateEstimatedTime() {
    if (this.transferStats.averageSpeed > 0 && this.totalChunks > 0) {
      const remainingChunks = this.totalChunks - this.receivedChunks
      const avgChunkSize = this.transferStats.bytesTransferred / this.receivedChunks
      const remainingBytes = remainingChunks * avgChunkSize
      const eta = remainingBytes / this.transferStats.averageSpeed

      this.estimatedTimeRemaining = this.formatTime(eta * 1000)
    }
  }

  // Format speed with appropriate units
  formatSpeed(bytesPerSecond) {
    const units = ["B/s", "KB/s", "MB/s", "GB/s"]
    let unitIndex = 0
    let speed = bytesPerSecond

    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024
      unitIndex++
    }

    return `${speed.toFixed(1)} ${units[unitIndex]}`
  }

  // Format time duration
  formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
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
      browserVersion = `V${match[2]}`;
    }

    return `${browserName} ${browserVersion}`
  }


  // Handle connection closed
  handleConnectionClosed() {
    this.connectionStatus = "disconnected"
    this.showDownloadBtn = false
    this.showProgressBar = false
    this.isDownloadingAll = false
    this.stopProgressMonitoring()

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    this.showError(
      "Connection closed by the sender.",
      "connection",
      "Connection Closed",
      "The file sharing session has ended. Please request a new link if you need to download more files.",
    )

    this.updateSessionStatus("Closed")
  }

  // Update session status
  async updateSessionStatus(status) {
    if (this.sessionData && this.sessionData.token) {
      try {
        await updateSessionStatus({
          sessionToken: this.sessionData.token,
          status: status,
        })

      } catch (error) {

      }
    }
  }

  // Handle download all click with enhanced validation
  handleDownloadAllClick() {
    this.resetAllFilesIfAlreadyDownloaded();
    if (this.fileList.length === 0) {
      this.showCustomToast("No Files", "No files are available for download", "warning")
      return
    }

    if (!this.connection || !this.connection.open) {
      this.showError(
        "Connection not ready. Please wait for the connection to be established.",
        "connection",
        "Connection Not Ready",
        "Please wait a moment and try again.",
      )
      return
    }

    if (this.isDownloadingAll) {
      this.showCustomToast("Download All In Progress", "Please wait for all files to finish downloading.", "info");
      return;
    }


    this.isDownloadingAll = true

    const totalSize = this.fileList.reduce((sum, file) => sum + (file.sizeBytes || 0), 0)


    this.connection.send({
      type: "downloadAll",
      timestamp: Date.now(),
    })

    this.connection.send({
      type: "download_started"
    });

    this.showCustomToast("Download Started", "Downloading all files...", "success")
  }

  resetAllFilesIfAlreadyDownloaded() {
    if (this.allFilesDownloaded) {
      this.fileList.forEach(file => {
        file.isDownloaded = false;
        file.isSingleDownload = false;
        file.isDownloading = false;
        file.showProgress = false;
        file.progressText = "0%";
        file.progressStyle = "width: 0%";
        file.canDownload = true;
      });
      this.allFilesDownloaded = false;
    }
  }

  // Handle single file download with enhanced validation
  handleSingleFileDownload(event) {
    if (this.isDownloadingAll) {
      this.showCustomToast("Download All In Progress", "Please wait for all files to finish downloading.", "info");
      return;
    }

    const fileId = Number.parseInt(event.currentTarget.dataset.id)
    const file = this.fileList[fileId]

    if (!file) {
      this.showCustomToast("File Not Found", "The selected file is not available", "error")
      return
    }

    if (file.isDownloading || this.isReceivingFile) {
      this.showCustomToast("Already Downloading", "This file is already being downloaded.", "info");
      return;
    }

    if (!this.connection || !this.connection.open) {
      this.showError(
        "Connection not ready. Please wait for the connection to be established.",
        "connection",
        "Connection Not Ready",
        "Please wait a moment and try again.",
      )
      return
    }



    this.connection.send({
      type: "downloadFile",
      fileIndex: fileId,
      fileName: file.name,
      timestamp: Date.now(),
    })

    this.connection.send({
      type: "download_started"
    });

    this.showCustomToast("Download Started", `Downloading ${file.name}...`, "success")
    file.isDownloaded = true;
    this.fileList[fileId].isSingleDownload = true;

    // Check if all files are downloaded
    const allManuallyDownloaded = this.fileList.every(f => f.isSingleDownload === true);
    if (allManuallyDownloaded) {

      this.allFilesDownloaded = true;

      this.handleAllFilesDownloaded()
    }
  }

  handleAllFilesDownloaded() {
    this.showCustomToast(
      "All Downloads Complete",
      "All files have been downloaded successfully.",
      "success"
    );
    // Optionally, notify the uploader:
    if (this.connection && this.connection.open) {
      this.connection.send({ type: "download_complete" });
    }
  }

  // Start heartbeat to maintain connection
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.connection && this.connection.open) {
        try {
          this.connection.send({
            type: "heartbeat",
            timestamp: Date.now(),
          })
        } catch (error) {
          //console.warn("⚠️ Heartbeat failed:", error)
        }
      }
    }, 30000)
  }

  // Handle retry connection
  handleRetryConnection() {

    this.connectionRetryCount = 0 // Reset retry count
    this.errorMessage = ""
    this.attemptReconnection()
  }

  // Attempt reconnection with exponential backoff
  async attemptReconnection() {
    if (this.connectionRetryCount >= this.maxRetries) {

      return
    }

    this.connectionRetryCount++
    const delay = Math.min(1000 * Math.pow(2, this.connectionRetryCount), 10000)



    await this.delay(delay)

    this.closeConnection()

    this.connectionStatus = "connecting"
    const success = await this.initializePeerJS()

    if (!success && this.connectionRetryCount < this.maxRetries) {
      this.attemptReconnection()
    }
  }

  // Handle new token
  handleNewToken() {

    this.showTokenPopup = true
    this.showPasswordOnly = false
    this.token = ""
    this.password = ""
    this.errorMessage = ""
    this.popupErrorMessage = ""
  }

  // Handle cancel popup
  handleCancelPopup() {
    this.showTokenPopup = false
    this.popupErrorMessage = ""
    this.token = ""
    this.password = ""
    this.showBlinkingArrow = true
    this.isValidating = false
  }

  // Toggle password visibility
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword
  }

  // Show help tooltip
  showHelpTooltip(event) {
    const tooltipType = event.currentTarget.dataset.tooltip
    this.showTooltip = tooltipType
  }

  // Hide tooltip
  hideTooltip() {
    this.showTooltip = ""
  }

  // Close connection and clean up resources
  closeConnection() {


    if (this.connection) {
      this.connection.close()
      this.connection = null
    }

    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }

    if (this.broadcast) {
      this.broadcast.close()
      this.broadcast = null
    }

    this.connectionStatus = "disconnected"
    this.showDownloadBtn = false
    this.isDownloadingAll = false
    this.connectionRetryCount = 0

    this.clearAllTimers()
  }

  // Computed properties for UI state management
  get showErrorState() {
    return !!this.errorMessage && !this.isLoading && !this.showTokenPopup
  }

  get showDownloadSection() {
    return this.connectionStatus === "connected" && !this.showErrorState && !this.isLoading
  }

  get connectionStatusClass() {
    return `connection-status ${this.connectionStatus}`
  }

  get connectionStatusText() {
    switch (this.connectionStatus) {
      case "connected":
        return "Connected - Ready to download"
      case "connecting":
        return "Connecting to peer..."
      case "disconnected":
      default:
        return "Disconnected"
    }
  }

  get isConnected() {
    return this.connectionStatus === "connected"
  }

  get isConnecting() {
    return this.connectionStatus === "connecting"
  }

  get isDisconnected() {
    return this.connectionStatus === "disconnected"
  }

  get downloadButtonText() {
    if (this.isDownloadingAll) {
      return "Downloading..."
    }

    const fileCount = this.fileList.length
    if (fileCount === 0) {
      return "No Files Available"
    } else if (fileCount === 1) {
      return "Download File"
    } else {
      return `Download All Files (${fileCount})`
    }
  }

  get isDownloadDisabled() {
    return (
      this.fileList.length === 0 ||
      this.isDownloadingAll ||
      this.connectionStatus !== "connected" ||
      (this.sessionInfo.singleUse === true && this.allFilesDownloaded === true)
    );
  }

  get progressStyle() {
    return `width: ${this.downloadProgress}%`
  }

  get progressText() {
    let text = `${this.downloadProgress}%`

    if (this.downloadSpeed) {
      text += ` - ${this.downloadSpeed}`
    }

    if (this.estimatedTimeRemaining) {
      text += ` - ETA: ${this.estimatedTimeRemaining}`
    }

    return text
  }

  get passwordInputType() {
    return this.showPassword ? "text" : "password"
  }

  get passwordPlaceholder() {
    return this.showPasswordOnly ? "Enter password" : "Enter password (if required)"
  }

  get passwordToggleAriaLabel() {
    return this.showPassword ? "Hide password" : "Show password"
  }

  get passwordTooltipClass() {
    return `tooltip ${this.showTooltip === "password-help" ? "visible" : ""}`
  }

  get tokenInputClass() {
    if (this.tokenValidationIcon) {
      return this.isTokenValid ? "valid" : "invalid"
    }
    return ""
  }

  get passwordInputClass() {
    return ""
  }

  get isSubmitDisabled() {
    if (this.showPasswordOnly) {
      return !this.password || this.isValidating
    }
    return !this.token || !this.isTokenValid || this.isValidating
  }

  get showRetryButton() {
    return this.errorType === "connection" || this.errorType === "network"
  }

  get showNewTokenButton() {
    return this.errorType === "auth" || this.errorType === "session"
  }

  get isConnectionError() {
    return this.errorType === "connection"
  }

  get isFileError() {
    return this.errorType === "file"
  }

  get isAuthError() {
    return this.errorType === "auth"
  }

  get isSessionError() {
    return this.errorType === "session"
  }

  get isGenericError() {
    return this.errorType === "generic" || !this.errorType
  }

  get fileListClass() {
    return this.fileList && this.fileList.length > 1
      ? "file-list horizontal-strip"
      : "file-list";
  }
}
