import { LightningElement, track } from "lwc"
import videoBackground from "@salesforce/resourceUrl/FileVaultixBackgroundVideo"
import fileVaultixHomeLogo from "@salesforce/resourceUrl/fileVaultixHomeLogo"

export default class FileVaultixHome extends LightningElement {
  videoBackground = videoBackground
  logoUrl = fileVaultixHomeLogo

  @track activeAccordion = null
  @track isDarkMode = false
  @track isMenuOpen = false
  @track isScrolled = false
  @track isLoading = true
  @track loadingPercentage = 0
  @track loadingMessage = "Initializing secure environment..."
  @track currentYear = new Date().getFullYear();

  // Loading messages to display during different stages
  loadingMessages = [
    "Initializing secure environment...",
    "Preparing encryption protocols...",
    "Setting up peer-to-peer connections...",
    "Loading secure file transfer system...",
    "Almost ready..."
  ]

  // FAQ items
  faqItems = [
    {
      id: "faq1",
      question: "How does peer-to-peer file sharing work?",
      answer:
        "Our P2P technology creates a direct connection between the sender and recipient's browsers. Files are transferred directly without storing them on any server, ensuring maximum privacy and speed.",
    },
    {
      id: "faq2",
      question: "Is there a file size limit?",
      answer:
        "You can share files up to 10GB in size. For optimal performance, we recommend using a stable internet connection when transferring very large files.",
    },
    {
      id: "faq3",
      question: "How secure is the file transfer?",
      answer:
        "All transfers are secured with end-to-end encryption. We generate unique encryption keys for each transfer, and these keys never leave your device. We cannot access your files even if we wanted to.",
    },
    {
      id: "faq4",
      question: "Do I need to create an account?",
      answer:
        "No! Our service is completely account-free. Just visit the site, upload your file, and share the generated link with your recipient.",
    },
    {
      id: "faq5",
      question: "How long are files available?",
      answer:
        "Files are not stored on our servers. They are only available during the active transfer session between peers. Once the transfer is complete, no copies remain on our infrastructure.",
    },
  ]

  // Features data
  features = [
    {
      id: "feature1",
      icon: "lock",
      title: "End-to-End Encryption",
      description: "Your files are encrypted before leaving your device and can only be decrypted by the recipient.",
    },
    {
      id: "feature2",
      icon: "zap",
      title: "Fast Transfer Speeds",
      description: "Direct peer-to-peer connections mean faster transfers without server bottlenecks.",
    },
    {
      id: "feature3",
      icon: "users",
      title: "No Middleman",
      description: "Files transfer directly between devices without being stored on any servers.",
    },
    {
      id: "feature4",
      icon: "file",
      title: "Large File Support",
      description: "Share files up to 10GB in size without compression or quality loss.",
    },
    {
      id: "feature5",
      icon: "user-x",
      title: "No Signup Required",
      description: "Start sharing immediately without creating accounts or providing personal information.",
    },
    {
      id: "feature6",
      icon: "shield",
      title: "Privacy Focused",
      description: "We don't track your activity, store your files, or collect unnecessary data.",
    },
  ]

  // How it works steps
  steps = [
    {
      id: "step1",
      number: "01",
      title: "Upload Your File",
      description: "Drag & drop or select the file you want to share from your device.",
    },
    {
      id: "step2",
      number: "02",
      title: "Generate Secure Link",
      description: "We create a secure, encrypted link that you can share with your recipient.",
    },
    {
      id: "step3",
      number: "03",
      title: "Recipient Downloads",
      description: "When they open the link, a direct peer-to-peer connection is established for the transfer.",
    },
    {
      id: "step4",
      number: "04",
      title: "Transfer Complete",
      description: "Once the download is complete, no copies of your file remain on any servers.",
    },
  ]

  connectedCallback() {

    // Add scroll event listener
    window.addEventListener("scroll", this.handleScroll.bind(this))

    // Check user's preferred color scheme
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.isDarkMode = true
    }

    // Start the loading animation
    this.startLoadingAnimation()

    //Log the auhtor message with style
    this.logWithStyle('Designed and developed by Saurabh Patil');

    // Add window load event listener
    window.addEventListener('load', this.handlePageLoaded.bind(this))
  }

  disconnectedCallback() {
    // Remove scroll event listener
    window.removeEventListener("scroll", this.handleScroll.bind(this))
    // Remove window load event listener
    window.removeEventListener('load', this.handlePageLoaded.bind(this))
    // Clear any remaining intervals
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval)
    }
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

  // Add these new methods for the enhanced loader
  startLoadingAnimation() {
    // Start with 0%
    this.loadingPercentage = 0

    // Set up an interval to increment the percentage
    this.loadingInterval = setInterval(() => {
      // If video is loaded, accelerate to 100%
      const increment = this.videoLoaded ? 5 : 1;

      // Increment the percentage
      this.loadingPercentage += increment;

      // Update loading message based on percentage
      this.updateLoadingMessage();

      // If we've reached 100%, clear the interval and hide the loader
      if (this.loadingPercentage >= 100) {
        clearInterval(this.loadingInterval);
        this.loadingPercentage = 100;

        // Give a small delay before hiding the loader for a smooth transition
        setTimeout(() => {
          this.isLoading = false;
        }, 500);
      }
    }, 50);
  }

  updateLoadingMessage() {
    // Update the loading message based on the current percentage
    const messageIndex = Math.floor(this.loadingPercentage / 20);
    if (messageIndex < this.loadingMessages.length) {
      this.loadingMessage = this.loadingMessages[messageIndex];
    }
  }

  // Computed property for the progress bar style
  get progressBarStyle() {
    return `width: ${this.loadingPercentage}%`;
  }

  handlePageLoaded() {
    // Mark page as loaded
    this.pageLoaded = true;

    // If video has already loaded, accelerate the loading progress
    if (this.videoLoaded && this.loadingPercentage < 70) {
      this.loadingPercentage = 70;
    }
  }

  handleVideoLoaded() {
    // Mark video as loaded
    this.videoLoaded = true;

    // If page has already loaded, accelerate the loading progress
    if (this.pageLoaded && this.loadingPercentage < 70) {
      this.loadingPercentage = 70;
    }
  }

  handleScroll() {
    this.isScrolled = window.scrollY > 50
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
    // Add or remove a class to help with styling when menu is open
    if (this.isMenuOpen) {
      this.template.querySelector('.navbar').classList.add('isMenuOpen')
    } else {
      this.template.querySelector('.navbar').classList.remove('isMenuOpen')
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode
  }

  toggleAccordion(event) {
    const accordionId = event.currentTarget.dataset.id
    this.activeAccordion = this.activeAccordion === accordionId ? null : accordionId
  }

  handleUploadClick() {
    // In a real implementation, this would open the file upload dialog
    window.open("https://innovativewizards-dev-ed.develop.my.site.com/upload", "_blank")
  }

  scrollToSection(event) {
    const sectionId = event.currentTarget.dataset.section
    // Try to find by id first
    let section = this.template.querySelector(`#${sectionId}`)
    // If not found by id, try by class
    if (!section) {
      section = this.template.querySelector(`.${sectionId}`)
    }
    if (section) {
      requestAnimationFrame(() => {
        section.scrollIntoView({ behavior: "smooth" })
      })
    } else {
    }
    // Close mobile menu if open
    this.isMenuOpen = false
  }

  // Computed properties for dynamic classes
  get navbarClass() {
    return `navbar ${this.isScrolled ? "navbar-scrolled" : ""} ${this.isDarkMode ? "dark-navbar" : "light-navbar"}`
  }

  get themeClass() {
    return this.isDarkMode ? "dark-theme" : "light-theme"
  }

  // Add a new computed property for hero overlay class
  get overlayClass() {
    return this.isDarkMode ? "dark-overlay" : "light-overlay"
  }

  get menuClass() {
    return `nav-menu ${this.isMenuOpen ? "nav-menu-open" : ""}`
  }

  renderedCallback() {
    // Query all feature cards and inject SVGs
    const featureCards = this.template.querySelectorAll(".feature-card")
    this.features.forEach((feature, idx) => {
      const iconDiv = featureCards[idx]?.querySelector(".feature-icon")
      if (iconDiv && iconDiv.innerHTML.trim() === "") {
        iconDiv.innerHTML = this.getFeatureIconSvg(feature)
      }
    })
  }

  getFeatureIconSvg(feature) {
    switch (feature.icon) {
      case "lock":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
      case "zap":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
      case "users":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
      case "file":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
      case "user-x":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="8" x2="23" y2="13"></line><line x1="23" y1="8" x2="18" y2="13"></line></svg>`
      case "shield":
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
      default:
        return ""
    }
  }

  getAccordionHeaderClass(item) {
    return this.activeAccordion === item.id ? "accordion-header active" : "accordion-header"
  }

  getAccordionContentClass(item) {
    return this.activeAccordion === item.id ? "accordion-content active" : "accordion-content"
  }

  get faqItemsWithClasses() {
    return this.faqItems.map((item) => ({
      ...item,
      headerClass: this.activeAccordion === item.id ? "accordion-header active" : "accordion-header",
      contentClass: this.activeAccordion === item.id ? "accordion-content active" : "accordion-content",
    }))
  }
}