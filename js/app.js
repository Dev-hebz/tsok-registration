// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXF-KDN99SD84SXNzMy-RJ2kUIMxwro0A",
    authDomain: "tsokregistration.firebaseapp.com",
    databaseURL: "https://tsokregistration-default-rtdb.firebaseio.com",
    projectId: "tsokregistration",
    storageBucket: "tsokregistration.firebasestorage.app",
    messagingSenderId: "910893887334",
    appId: "1:910893887334:web:5eac10fe347a96cce462a7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'df17jssg2';
const CLOUDINARY_UPLOAD_PRESET = 'sple_uploads';

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'DacF66ft39K859Y5s';
const EMAILJS_SERVICE_ID = 'service_6457cjo';
const EMAILJS_TEMPLATE_ID = 'template_9ygnhpn';

// Initialize EmailJS
if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Signature Pad
let signaturePad;
const canvas = document.getElementById('signaturePad');

function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    if (signaturePad) {
        signaturePad.clear();
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)',
    penColor: 'rgb(0, 0, 0)'
});

// Clear signature
document.getElementById('clearSignature').addEventListener('click', () => {
    signaturePad.clear();
});

// Level and Major field logic
const levelSelect = document.getElementById('level');
const majorGroup = document.getElementById('majorGroup');
const majorInput = document.getElementById('major');

levelSelect.addEventListener('change', (e) => {
    if (e.target.value === 'Secondary') {
        majorGroup.style.display = 'block';
        majorInput.required = true;
    } else {
        majorGroup.style.display = 'none';
        majorInput.required = false;
        majorInput.value = '';
    }
});

// Also handle input event for datalist
levelSelect.addEventListener('input', (e) => {
    if (e.target.value === 'Secondary') {
        majorGroup.style.display = 'block';
        majorInput.required = true;
    } else {
        majorGroup.style.display = 'none';
        majorInput.required = false;
        majorInput.value = '';
    }
});

// File upload handling
const documentsInput = document.getElementById('documents');
const fileList = document.getElementById('fileList');
let selectedFiles = [];

documentsInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    displayFileList();
});

function displayFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>📄 ${file.name} (${formatFileSize(file.size)})</span>
            <button type="button" onclick="removeFile(${index})">Remove</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    documentsInput.files = dt.files;
    displayFileList();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Upload to Cloudinary
async function uploadToCloudinary(base64Data, folder, fileName) {
    const isPDF = base64Data.startsWith('data:application/pdf');
    const resourceType = isPDF ? 'raw' : 'image';
    
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `tsok-registration/${folder}`);
    formData.append('public_id', fileName);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Cloudinary error:', data);
            throw new Error(data.error?.message || 'Upload failed');
        }
        
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// Form submission
const form = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const loadingOverlay = document.getElementById('loadingOverlay');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate signature
    if (signaturePad.isEmpty()) {
        showError('Please provide your signature');
        return;
    }

    // Validate files
    if (selectedFiles.length === 0) {
        showError('Please upload at least one document');
        return;
    }

    // Show loading
    loadingOverlay.style.display = 'flex';
    submitBtn.disabled = true;

    try {
        // Get form data
        const formData = new FormData(form);
        const surname = formData.get('surname');
        const firstName = formData.get('firstName');
        const middleName = formData.get('middleName');
        const contactNumber = formData.get('contactNumber');
        const whatsappNumber = formData.get('whatsappNumber');
        const email = formData.get('email');
        const university = formData.get('university');
        const degree = formData.get('degree');
        const level = formData.get('level');
        const major = formData.get('major');

        // Create folder name from surname
        const folderName = surname.toLowerCase().replace(/\s+/g, '-');
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);

        // Upload documents to Cloudinary
        const uploadedDocs = [];
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const base64 = await fileToBase64(file);
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${folderName}-${randomNum + i}`;
            
            const url = await uploadToCloudinary(base64, folderName, fileName);
            uploadedDocs.push({
                name: `${fileName}.${fileExt}`,
                url: url
            });
        }

        // Upload signature to Cloudinary
        const signatureBase64 = signaturePad.toDataURL();
        const signatureFileName = `${folderName}-signature`;
        
        const signatureUrl = await uploadToCloudinary(
            signatureBase64,
            folderName,
            signatureFileName
        );

        // Save to Firebase
        const registrationData = {
            personalInfo: {
                surname,
                firstName,
                middleName
            },
            contactInfo: {
                contactNumber,
                whatsappNumber,
                email
            },
            educationalBackground: {
                university,
                degree,
                level,
                major: level === 'Secondary' ? major : null
            },
            documents: uploadedDocs,
            signature: signatureUrl,
            status: 'Pending',
            type: 'Member',
            paymentStatus: 'Pending',
            examineeStatus: 'First-Timer',
            membershipFee: 'Unpaid',
            incidentalFee: 'Unpaid',
            remarks: '',
            submittedAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref('registrations').push(registrationData);

        // Send confirmation email
        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY') {
            try {
                await sendConfirmationEmail(email, firstName, surname);
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
            }
        }

        // Hide loading
        loadingOverlay.style.display = 'none';
        submitBtn.disabled = false;

        // Show success
        showSuccess();

    } catch (error) {
        console.error('Registration error:', error);
        loadingOverlay.style.display = 'none';
        submitBtn.disabled = false;
        showError(error.message || 'An error occurred during registration');
    }
});

// Show success modal
function showSuccess() {
    document.getElementById('successModal').style.display = 'flex';
}

// Show error modal
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Send confirmation email function
async function sendConfirmationEmail(toEmail, firstName, lastName) {
    const templateParams = {
        to_email: toEmail,
        to_name: `${firstName} ${lastName}`,
        applicant_name: `${firstName} ${lastName}`,
        registration_date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        from_name: 'TSOK Officers 2026',
        reply_to: 'tsokkuwait@gmail.com'
    };

    try {
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
        );
        console.log('Email sent successfully!', response.status, response.text);
        return response;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
}

console.log('TSOK Registration System - Developed by Tsok 2026 Offices');
