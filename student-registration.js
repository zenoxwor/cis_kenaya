/**
 * Student Registration Form Wizard
 * Complete multi-step form with validation, state management, and export options
 */

class StudentRegistrationWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 6;
    this.formData = {};
    this.isValid = {};
    
    this.form = document.getElementById('studentRegistrationForm');
    this.steps = document.querySelectorAll('.form-step');
    this.indicators = document.querySelectorAll('.step-indicator');
    this.nextBtn = document.getElementById('nextBtn');
    this.prevBtn = document.getElementById('prevBtn');
    this.submitBtn = document.getElementById('submitBtn');
    this.progressBar = document.getElementById('progressBar');
    
    this.modal = document.getElementById('summaryModal');
    this.summaryContent = document.getElementById('summaryContent');
    this.printBtn = document.getElementById('printBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportPdfBtn = document.getElementById('exportPdfBtn');
    this.closeModalBtn = document.getElementById('closeModal');
    
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadSavedData();
    this.updateUI();
  }

  attachEventListeners() {
    this.nextBtn.addEventListener('click', (e) => this.nextStep(e));
    this.prevBtn.addEventListener('click', (e) => this.prevStep(e));
    this.submitBtn.addEventListener('click', (e) => this.handleSubmit(e));
    
    this.form.addEventListener('change', (e) => this.handleFieldChange(e));
    this.form.addEventListener('input', (e) => this.handleFieldChange(e));
    
    // Bus transport toggle
    const busTransport = document.getElementById('busTransport');
    if (busTransport) {
      busTransport.addEventListener('change', (e) => this.toggleBusDetails(e));
    }

    // File upload preview
    const studentPhoto = document.getElementById('studentPhoto');
    if (studentPhoto) {
      studentPhoto.addEventListener('change', (e) => this.previewPhoto(e));
    }

    // Modal actions
    this.printBtn.addEventListener('click', () => this.printProfile());
    this.exportJsonBtn.addEventListener('click', () => this.exportAsJson());
    this.exportPdfBtn.addEventListener('click', () => this.exportAsPdf());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    
    // Close modal on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // File upload click
    const fileUploadWrapper = document.querySelector('.file-upload-wrapper');
    if (fileUploadWrapper) {
      fileUploadWrapper.addEventListener('click', () => {
        document.getElementById('studentPhoto').click();
      });
    }
  }

  handleFieldChange(e) {
    const { name, value, type } = e.target;
    
    if (type === 'file') {
      this.formData[name] = e.target.files[0];
    } else if (type === 'checkbox') {
      this.formData[name] = e.target.checked;
    } else {
      this.formData[name] = value;
    }

    this.saveData();
    this.validateField(e.target);
  }

  toggleBusDetails(e) {
    const busDetailsGroup = document.getElementById('busDetailsGroup');
    if (e.target.value === 'yes') {
      busDetailsGroup.style.display = 'block';
    } else {
      busDetailsGroup.style.display = 'none';
    }
  }

  previewPhoto(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('photoPreview');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.innerHTML = `<img src="${event.target.result}" alt="Student photo preview">`;
      };
      reader.readAsDataURL(file);
    }
  }

  validateField(field) {
    if (!field) return true;

    const { name, value, type } = field;
    const group = field.closest('.form-group');
    
    let isValid = true;
    let errorMsg = '';

    // Required field validation
    if (field.hasAttribute('required') && !value.trim()) {
      isValid = false;
      errorMsg = 'This field is required';
    }

    // Email validation
    if (type === 'email' && value && !this.isValidEmail(value)) {
      isValid = false;
      errorMsg = 'Please enter a valid email address';
    }

    // Phone validation
    if (type === 'tel' && value && !this.isValidPhone(value)) {
      isValid = false;
      errorMsg = 'Please enter a valid phone number';
    }

    // ID validation (basic)
    if (name === 'nationalId' && value && value.length < 4) {
      isValid = false;
      errorMsg = 'ID must be at least 4 characters';
    }

    // Update UI
    if (group) {
      if (isValid) {
        group.classList.remove('error');
        const errorElement = group.querySelector('.error-message');
        if (errorElement) errorElement.textContent = '';
      } else {
        group.classList.add('error');
        let errorElement = group.querySelector('.error-message');
        if (!errorElement) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          group.appendChild(errorElement);
        }
        errorElement.textContent = errorMsg;
      }
    }

    return isValid;
  }

  validateStep(stepNum) {
    const stepElement = document.querySelector(`[data-step="${stepNum}"]`);
    const inputs = stepElement.querySelectorAll('input, select, textarea');
    let isValid = true;

    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    this.isValid[stepNum] = isValid;
    return isValid;
  }

  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  isValidPhone(phone) {
    // Basic phone validation: at least 7 digits
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 7;
  }

  nextStep(e) {
    e.preventDefault();

    if (!this.validateStep(this.currentStep)) {
      this.showErrorNotification('Please fix the errors before proceeding');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateUI();
      this.scrollToTop();
    }
  }

  prevStep(e) {
    e.preventDefault();

    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
      this.scrollToTop();
    }
  }

  updateUI() {
    // Show/hide form steps
    this.steps.forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.toggle('active', stepNum === this.currentStep);
    });

    // Update step indicators
    this.indicators.forEach((indicator, index) => {
      const stepNum = index + 1;
      indicator.classList.toggle('active', stepNum === this.currentStep);
      indicator.classList.toggle('completed', stepNum < this.currentStep);
    });

    // Update buttons
    this.prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
    this.nextBtn.style.display = this.currentStep < this.totalSteps ? 'inline-flex' : 'none';
    this.submitBtn.style.display = this.currentStep === this.totalSteps ? 'inline-flex' : 'none';

    // Update progress bar
    const progress = (this.currentStep / this.totalSteps) * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  handleSubmit(e) {
    e.preventDefault();

    if (!this.validateStep(this.currentStep)) {
      this.showErrorNotification('Please fix all errors before submitting');
      return;
    }

    this.collectAllData();
    this.showSummary();
  }

  collectAllData() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      const { name, value, type } = input;
      if (type === 'file') {
        this.formData[name] = input.files[0];
      } else {
        this.formData[name] = value;
      }
    });
  }

  showSummary() {
    const summary = this.generateSummaryHTML();
    this.summaryContent.innerHTML = summary;
    this.modal.classList.remove('hidden');
  }

  generateSummaryHTML() {
    const data = this.formData;
    const photoSrc = data.studentPhoto ? URL.createObjectURL(data.studentPhoto) : '';

    return `
      <div class="summary-header">
        <div class="summary-photo">
          ${photoSrc ? `<img src="${photoSrc}" alt="Student Photo">` : '<span>📷</span>'}
        </div>
        <div class="summary-basic">
          <div class="summary-name">${data.firstName} ${data.familyName}</div>
          <div class="summary-meta">
            <div class="summary-meta-item"><strong>ID:</strong> ${data.studentId || 'Auto-generated'}</div>
            <div class="summary-meta-item"><strong>Grade:</strong> ${data.gradeLevel || 'N/A'}</div>
            <div class="summary-meta-item"><strong>Status:</strong> ${this.formatValue(data.studentStatus)}</div>
          </div>
        </div>
      </div>

      <!-- Personal Details -->
      <div class="summary-section">
        <h3 class="summary-section-title">📋 Personal Details</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">First Name</div>
            <div class="summary-value">${data.firstName || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Father's Name</div>
            <div class="summary-value">${data.fatherName || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Date of Birth</div>
            <div class="summary-value">${this.formatDate(data.dateOfBirth)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Gender</div>
            <div class="summary-value">${this.formatValue(data.gender)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Nationality</div>
            <div class="summary-value">${data.nationality || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">National ID</div>
            <div class="summary-value">${data.nationalId || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Blood Type</div>
            <div class="summary-value">${(data.bloodType || '').toUpperCase() || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Native Language</div>
            <div class="summary-value">${data.nativeLanguage || '-'}</div>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="summary-section">
        <h3 class="summary-section-title">📱 Contact Information</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Student Email</div>
            <div class="summary-value">${data.studentEmail || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Student Phone</div>
            <div class="summary-value">${data.studentPhone || '-'}</div>
          </div>
          <div class="summary-item full-width">
            <div class="summary-label">Residential Address</div>
            <div class="summary-value">${data.fullAddress || '-'}</div>
          </div>
        </div>
      </div>

      <!-- Guardian Information -->
      <div class="summary-section">
        <h3 class="summary-section-title">👨‍👩‍👧 Guardian & Family</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Guardian Name</div>
            <div class="summary-value">${data.guardianName || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Relationship</div>
            <div class="summary-value">${this.formatValue(data.guardianRelationship)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Guardian Phone</div>
            <div class="summary-value">${data.guardianPhone || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Emergency Phone</div>
            <div class="summary-value">${data.emergencyPhone || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Mother's Name</div>
            <div class="summary-value">${data.motherName || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Marital Status</div>
            <div class="summary-value">${this.formatValue(data.parentalStatus)}</div>
          </div>
        </div>
      </div>

      <!-- Academic Information -->
      <div class="summary-section">
        <h3 class="summary-section-title">🎓 Academic Information</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Education Level</div>
            <div class="summary-value">${this.formatValue(data.educationLevel)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Grade Level</div>
            <div class="summary-value">${data.gradeLevel || '-'}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Section</div>
            <div class="summary-value">${this.formatValue(data.classSection)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Enrollment Date</div>
            <div class="summary-value">${this.formatDate(data.enrollmentDate)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Student Status</div>
            <div class="summary-value">${this.formatValue(data.studentStatus)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Graduation Year</div>
            <div class="summary-value">${data.graduationYear || '-'}</div>
          </div>
        </div>
      </div>

      <!-- Medical Information -->
      <div class="summary-section">
        <h3 class="summary-section-title">🏥 Medical Information</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Blood Type</div>
            <div class="summary-value">${(data.bloodType || '').toUpperCase() || '-'}</div>
          </div>
          <div class="summary-item full-width">
            <div class="summary-label">Allergies</div>
            <div class="summary-value">${data.allergies || 'None'}</div>
          </div>
          <div class="summary-item full-width">
            <div class="summary-label">Chronic Conditions</div>
            <div class="summary-value">${data.chronicConditions || 'None'}</div>
          </div>
          <div class="summary-item full-width">
            <div class="summary-label">Special Needs</div>
            <div class="summary-value">${data.specialNeeds || 'None'}</div>
          </div>
        </div>
      </div>

      <!-- Logistics -->
      <div class="summary-section">
        <h3 class="summary-section-title">🚌 Logistics & Services</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Bus Transport</div>
            <div class="summary-value">${this.formatValue(data.busTransport)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Meal Plan</div>
            <div class="summary-value">${this.formatValue(data.mealPlan)}</div>
          </div>
        </div>
      </div>
    `;
  }

  formatValue(val) {
    if (!val) return '-';
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  printProfile() {
    const printContent = this.summaryContent.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Profile - ${this.formData.firstName} ${this.formData.familyName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Montserrat', sans-serif;
              padding: 20px;
              line-height: 1.6;
              color: #111;
            }
            h1 { font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 20px; }
            h3 { font-family: 'Playfair Display', serif; font-size: 18px; margin-top: 20px; margin-bottom: 12px; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
            .summary-item { border: 1px solid #ddd; padding: 12px; border-radius: 8px; }
            .summary-label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
            .summary-value { margin-top: 4px; color: #111; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent}
          <p style="text-align: center; margin-top: 40px; color: #999; font-size: 12px;">
            Generated on ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  }

  exportAsJson() {
    const dataToExport = { ...this.formData };
    delete dataToExport.studentPhoto;
    
    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-${this.formData.firstName}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportAsPdf() {
    try {
      // Render the summary HTML to an image using html2canvas
      const el = this.summaryContent;
      const canvas = await html2canvas(el, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      // Load pdf-lib
      const { PDFDocument } = PDFLib;
      const pdfDoc = await PDFDocument.create();

      // Embed summary image and add as first page (fit to A4 width)
      const pngBytes = await (await fetch(imgData)).arrayBuffer();
      const pngImage = await pdfDoc.embedPng(pngBytes);
      const pngDims = pngImage.scale(1);

      const A4_WIDTH = 595.28; // points
      const scale = A4_WIDTH / pngDims.width;
      const pageHeight = pngDims.height * scale;
      const page = pdfDoc.addPage([A4_WIDTH, pageHeight]);
      page.drawImage(pngImage, { x: 0, y: 0, width: A4_WIDTH, height: pageHeight });

      // Attach other uploaded documents (PDFs or images)
      const attachIds = ['birthCert', 'idCopy', 'transcript', 'medicalRec'];
      for (const id of attachIds) {
        const input = document.getElementById(id);
        if (!input || !input.files || !input.files.length) continue;
        const file = input.files[0];
        const mime = file.type || '';

        // If PDF, copy pages from it
        if (mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const donorBytes = await file.arrayBuffer();
            const donorPdf = await PDFDocument.load(donorBytes);
            const donorPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
            donorPages.forEach((p) => pdfDoc.addPage(p));
          } catch (err) {
            console.warn('Failed to attach PDF:', file.name, err);
          }
        } else if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif)$/i.test(file.name)) {
          // Image: embed and add as its own page, scaling to A4 width
          try {
            const imgBytes = await file.arrayBuffer();
            let embeddedImg;
            if (mime === 'image/jpeg' || /\.(jpg|jpeg)$/i.test(file.name)) {
              embeddedImg = await pdfDoc.embedJpg(imgBytes);
            } else {
              embeddedImg = await pdfDoc.embedPng(imgBytes);
            }
            const imgDims = embeddedImg.scale(1);
            const imgScale = A4_WIDTH / imgDims.width;
            const imgPageHeight = imgDims.height * imgScale;
            const imgPage = pdfDoc.addPage([A4_WIDTH, imgPageHeight]);
            imgPage.drawImage(embeddedImg, { x: 0, y: 0, width: A4_WIDTH, height: imgPageHeight });
          } catch (err) {
            console.warn('Failed to attach image:', file.name, err);
          }
        } else {
          console.warn('Unsupported attachment type, skipping:', file.name || id);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-${this.formData.firstName || 'profile'}-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      this.showErrorNotification('Could not create PDF: ' + (err.message || err));
    }
  }

  closeModal() {
    this.modal.classList.add('hidden');
  }

  scrollToTop() {
    document.querySelector('.wizard-header').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  saveData() {
    localStorage.setItem('studentFormData', JSON.stringify(this.formData));
  }

  loadSavedData() {
    const saved = localStorage.getItem('studentFormData');
    if (saved) {
      this.formData = JSON.parse(saved);
      this.populateForm();
    }
  }

  populateForm() {
    Object.keys(this.formData).forEach((key) => {
      const input = document.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = this.formData[key];
        } else {
          input.value = this.formData[key];
        }
      }
    });
  }

  showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #E74C3C;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2000;
      animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new StudentRegistrationWizard();
});
