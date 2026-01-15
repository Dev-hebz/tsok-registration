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
const auth = firebase.auth();

let allRegistrations = [];
let currentEditId = null;
let currentDeleteId = null;
let isInitialized = false;

// ==================== ACTIVITY LOG ADDITIONS ====================
let currentUser = null;
let userLocation = null;

// Get GPS Location
async function getUserLocation() {
    return new Promise((resolve) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.log('Location access denied or unavailable');
                    resolve(null);
                }
            );
        } else {
            resolve(null);
        }
    });
}

// Get IP-based Location
async function getIPLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            city: data.city,
            region: data.region,
            country: data.country_name,
            ip: data.ip
        };
    } catch (error) {
        return { city: 'Unknown', country: 'Unknown', ip: 'Unknown' };
    }
}

// Log Activity
async function logActivity(action, details = {}) {
    if (!currentUser) return;
    
    const timestamp = Date.now();
    const ipLocation = await getIPLocation();
    
    const activityData = {
        action: action,
        adminEmail: currentUser.email,
        adminName: currentUser.displayName || currentUser.email.split('@')[0],
        timestamp: timestamp,
        date: new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        location: {
            gps: userLocation,
            ip: ipLocation
        },
        details: details,
        userAgent: navigator.userAgent,
        platform: navigator.platform
    };
    
    try {
        await database.ref('activityLogs').push(activityData);
        console.log('Activity logged:', action);
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}
// ==================== END ACTIVITY LOG ADDITIONS ====================

// Check authentication on page load
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // User not logged in, show login form
        if (!document.getElementById('loginOverlay')) {
            showLoginForm();
        }
    } else {
        // User logged in, show dashboard
        currentUser = user; // ACTIVITY LOG: Set current user
        userLocation = await getUserLocation(); // ACTIVITY LOG: Get location
        
        hideLoginForm();
        if (!isInitialized) {
            loadRegistrations();
            setupSearch();
            addLogoutButton();
            addActivityLogButton(); // ACTIVITY LOG: Add button
            
            // ACTIVITY LOG: Log login
            await logActivity('LOGIN', { message: 'Admin logged in' });
            
            isInitialized = true;
        }
    }
});

// Show login form
function showLoginForm() {
    // Prevent duplicate login forms
    if (document.getElementById('loginOverlay')) {
        return;
    }
    
    const loginHTML = `
        <div id="loginOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); max-width: 400px; width: 90%;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="/images/tsok-logo.png" alt="TSOK Logo" style="height: 80px; margin-bottom: 15px;">
                    <h2 style="color: #2E4C96; margin: 0;">Admin Login</h2>
                    <p style="color: #666; font-size: 14px; margin-top: 5px;">TSOK Registration System</p>
                </div>
                <form id="loginForm" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 500;">Email</label>
                        <input type="email" id="loginEmail" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;" placeholder="admin@tsok.org">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; color: #333; font-weight: 500;">Password</label>
                        <input type="password" id="loginPassword" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;" placeholder="••••••••">
                    </div>
                    <button type="submit" style="background: #2E4C96; color: white; padding: 12px; border: none; border-radius: 5px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px;">Login</button>
                    <div id="loginError" style="color: #dc3545; font-size: 14px; text-align: center; display: none; margin-top: 10px;"></div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loginHTML);
    
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // Login successful, overlay will be removed by onAuthStateChanged
        } catch (error) {
            errorDiv.textContent = 'Invalid email or password';
            errorDiv.style.display = 'block';
        }
    });
}

// Hide login form
function hideLoginForm() {
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.remove();
}

// Logout function
function logout() {
    // ACTIVITY LOG: Log logout before signing out
    logActivity('LOGOUT', { message: 'Admin logged out' }).then(() => {
        isInitialized = false;
        auth.signOut();
    });
}

// Add logout button
function addLogoutButton() {
    const header = document.querySelector('header');
    if (header && !document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.innerHTML = '🚪 Logout';
        logoutBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;';
        logoutBtn.onclick = logout;
        header.style.position = 'relative';
        header.appendChild(logoutBtn);
    }
}

// ==================== ACTIVITY LOG: Add Activity Log Button ====================
function addActivityLogButton() {
    const header = document.querySelector('header');
    if (header && !document.getElementById('activityLogBtn')) {
        const logBtn = document.createElement('button');
        logBtn.id = 'activityLogBtn';
        logBtn.innerHTML = '📋 Activity Log';
        logBtn.style.cssText = 'position: absolute; top: 20px; right: 150px; background: #10B981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;';
        logBtn.onclick = showActivityLog;
        header.appendChild(logBtn);
    }
}
// ==================== END ACTIVITY LOG BUTTON ====================

// Load all registrations from Firebase
async function loadRegistrations() {
    try {
        const snapshot = await database.ref('registrations').once('value');
        allRegistrations = [];

        snapshot.forEach((child) => {
            allRegistrations.push({
                id: child.key,
                ...child.val()
            });
        });

        // Sort by submitted date (newest first)
        allRegistrations.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

        updateStats();
        displayRegistrations(allRegistrations);
    } catch (error) {
        console.error('Error loading registrations:', error);
        showErrorMessage('Failed to load registrations');
    }
}

// Update statistics
function updateStats() {
    const total = allRegistrations.length;
    const members = allRegistrations.filter(r => r.type === 'Member').length;
    const associates = allRegistrations.filter(r => r.type === 'Associate Member').length;
    
    // Examinee Status Stats
    const firstTimer = allRegistrations.filter(r => r.examineeStatus === 'First-Timer' || !r.examineeStatus).length;
    const retaker = allRegistrations.filter(r => r.examineeStatus === 'Re-Taker').length;
    
    // Payment Status Stats
    const pending = allRegistrations.filter(r => r.paymentStatus === 'Pending' || !r.paymentStatus).length;
    const paid = allRegistrations.filter(r => r.paymentStatus === 'Paid').length;
    const partial = allRegistrations.filter(r => r.paymentStatus === 'Partial').length;
    const unpaid = allRegistrations.filter(r => r.paymentStatus === 'Unpaid').length;

    document.getElementById('totalRegistrations').textContent = total;
    document.getElementById('totalMembers').textContent = members;
    document.getElementById('totalAssociates').textContent = associates;
    document.getElementById('totalFirstTimer').textContent = firstTimer;
    document.getElementById('totalRetaker').textContent = retaker;
    document.getElementById('totalPending').textContent = pending;
    document.getElementById('totalPaid').textContent = paid;
    document.getElementById('totalPartial').textContent = partial;
    document.getElementById('totalUnpaid').textContent = unpaid;
}

// Display registrations in table
function displayRegistrations(registrations) {
    const tbody = document.getElementById('registrationsBody');

    if (registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="no-data">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>No registrations found</h3>
                    <p>There are no registrations to display</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = registrations.map(reg => {
        const fullName = `${reg.personalInfo?.surname || ''} ${reg.personalInfo?.firstName || ''} ${reg.personalInfo?.middleName || ''}`.trim();
        const email = reg.contactInfo?.email || 'N/A';
        const contact = reg.contactInfo?.contactNumber || 'N/A';
        const level = reg.educationalBackground?.level || 'N/A';
        const type = reg.type || 'Member';
        const status = reg.status || 'Pending';
        const paymentStatus = reg.paymentStatus || 'Pending';
        const examineeStatus = reg.examineeStatus || 'First-Timer';
        const membershipFee = reg.membershipFee || 'Unpaid';
        const incidentalFee = reg.incidentalFee || 'Unpaid';
        const remarks = reg.remarks || '-';
        const date = reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString() : 'N/A';

        return `
            <tr>
                <td>${reg.id.substring(0, 8)}...</td>
                <td><strong>${fullName}</strong></td>
                <td>${email}</td>
                <td>${contact}</td>
                <td>${level}</td>
                <td><span class="type-badge type-${type.toLowerCase().replace(' ', '-')}">${type}</span></td>
                <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                <td><span class="payment-badge payment-${paymentStatus.toLowerCase()}">${paymentStatus}</span></td>
                <td><span class="examinee-badge examinee-${examineeStatus.toLowerCase().replace('-', '')}">${examineeStatus}</span></td>
                <td><span class="fee-badge fee-${membershipFee.toLowerCase()}">${membershipFee}</span></td>
                <td><span class="fee-badge fee-${incidentalFee.toLowerCase()}">${incidentalFee}</span></td>
                <td><em style="color: #666;">${remarks}</em></td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="viewRegistration('${reg.id}')" class="btn-view">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            View
                        </button>
                        <button onclick="editRegistration('${reg.id}')" class="btn-edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </button>
                        <button onclick="openEmailModal('${reg.id}')" class="btn-email" title="Send Email">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                            Email
                        </button>
                        <button onclick="deleteRegistration('${reg.id}', '${fullName}')" class="btn-delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// View registration details
function viewRegistration(id) {
    const reg = allRegistrations.find(r => r.id === id);
    if (!reg) return;

    // ACTIVITY LOG: Log view action
    logActivity('VIEW', { 
        registrationId: id, 
        registrationName: `${reg.personalInfo?.surname || ''} ${reg.personalInfo?.firstName || ''}`.trim()
    });

    const content = `
        <div class="detail-section">
            <h3>Personal Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Surname</label>
                    <p>${reg.personalInfo?.surname || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>First Name</label>
                    <p>${reg.personalInfo?.firstName || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>Middle Name</label>
                    <p>${reg.personalInfo?.middleName || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Contact Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Contact Number</label>
                    <p>${reg.contactInfo?.contactNumber || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>WhatsApp Number</label>
                    <p>${reg.contactInfo?.whatsappNumber || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>Email Address</label>
                    <p>${reg.contactInfo?.email || 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Educational Background</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>University</label>
                    <p>${reg.educationalBackground?.university || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>Degree</label>
                    <p>${reg.educationalBackground?.degree || 'N/A'}</p>
                </div>
                <div class="detail-item">
                    <label>Level</label>
                    <p>${reg.educationalBackground?.level || 'N/A'}</p>
                </div>
                ${reg.educationalBackground?.major ? `
                    <div class="detail-item">
                        <label>Major</label>
                        <p>${reg.educationalBackground.major}</p>
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="detail-section">
            <h3>Documents</h3>
            <div class="documents-list">
                ${reg.documents?.map((doc, i) => {
                    const isPDF = doc.url.toLowerCase().endsWith('.pdf');
                    const isImage = doc.url.match(/\.(jpg|jpeg|png|gif)$/i);
                    
                    // Get file extension from URL or default
                    let extension = '';
                    if (isPDF) extension = '.pdf';
                    else if (isImage) {
                        const match = doc.url.match(/\.(jpg|jpeg|png|gif)$/i);
                        extension = match ? match[0] : '.jpg';
                    }
                    
                    // Create proper filename with extension
                    const fileName = doc.name || `Document-${i + 1}`;
                    const downloadName = fileName.includes('.') ? fileName : fileName + extension;
                    
                    return `
                    <a href="${doc.url}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       download="${downloadName}"
                       class="document-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        ${downloadName} ${isPDF ? '📄' : '🖼️'}
                    </a>
                    `;
                }).join('') || '<p>No documents uploaded</p>'}
            </div>
        </div>

        <div class="detail-section">
            <h3>Signature</h3>
            ${reg.signature ? `<img src="${reg.signature}" alt="Signature" class="signature-img">` : '<p>No signature</p>'}
        </div>

        <div class="detail-section">
            <h3>Administrative Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Type</label>
                    <p>${reg.type || 'Member'}</p>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <p>${reg.status || 'Pending'}</p>
                </div>
                <div class="detail-item">
                    <label>Payment Status</label>
                    <p>${reg.paymentStatus || 'Pending'}</p>
                </div>
                <div class="detail-item">
                    <label>Examinee Status</label>
                    <p>${reg.examineeStatus || 'First-Timer'}</p>
                </div>
                <div class="detail-item">
                    <label>Membership Fee</label>
                    <p>${reg.membershipFee || 'Unpaid'}</p>
                </div>
                <div class="detail-item">
                    <label>Incidental Fee</label>
                    <p>${reg.incidentalFee || 'Unpaid'}</p>
                </div>
                <div class="detail-item">
                    <label>Remarks</label>
                    <p>${reg.remarks || 'No remarks'}</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').style.display = 'flex';
}

// Edit registration
function editRegistration(id) {
    const reg = allRegistrations.find(r => r.id === id);
    if (!reg) return;

    currentEditId = id;

    const content = `
        <div class="detail-section">
            <h3>Personal Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Surname</label>
                    <input type="text" id="edit-surname" value="${reg.personalInfo?.surname || ''}">
                </div>
                <div class="detail-item">
                    <label>First Name</label>
                    <input type="text" id="edit-firstName" value="${reg.personalInfo?.firstName || ''}">
                </div>
                <div class="detail-item">
                    <label>Middle Name</label>
                    <input type="text" id="edit-middleName" value="${reg.personalInfo?.middleName || ''}">
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Contact Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Contact Number</label>
                    <input type="tel" id="edit-contactNumber" value="${reg.contactInfo?.contactNumber || ''}">
                </div>
                <div class="detail-item">
                    <label>WhatsApp Number</label>
                    <input type="tel" id="edit-whatsappNumber" value="${reg.contactInfo?.whatsappNumber || ''}">
                </div>
                <div class="detail-item">
                    <label>Email Address</label>
                    <input type="email" id="edit-email" value="${reg.contactInfo?.email || ''}">
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Educational Background</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>University</label>
                    <input type="text" id="edit-university" value="${reg.educationalBackground?.university || ''}">
                </div>
                <div class="detail-item">
                    <label>Degree</label>
                    <input type="text" id="edit-degree" value="${reg.educationalBackground?.degree || ''}">
                </div>
                <div class="detail-item">
                    <label>Level</label>
                    <select id="edit-level">
                        <option value="Elementary" ${reg.educationalBackground?.level === 'Elementary' ? 'selected' : ''}>Elementary</option>
                        <option value="Secondary" ${reg.educationalBackground?.level === 'Secondary' ? 'selected' : ''}>Secondary</option>
                        <option value="Others" ${reg.educationalBackground?.level === 'Others' ? 'selected' : ''}>Others</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Major</label>
                    <input type="text" id="edit-major" value="${reg.educationalBackground?.major || ''}">
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Documents</h3>
            <div style="margin-bottom: 15px;">
                <input type="file" id="edit-newDocuments" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                <button onclick="document.getElementById('edit-newDocuments').click()" type="button" style="background: #10B981; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    📎 Upload New Document
                </button>
            </div>
            <div id="edit-documents-list">
                ${reg.documents?.map((doc, i) => {
                    const fileName = doc.name || `Document ${i + 1}`;
                    return `
                    <div class="doc-item-${i}" style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #F3F4F6; border-radius: 5px; margin-bottom: 8px;">
                        <span style="flex: 1;">${fileName}</span>
                        <a href="${doc.url}" target="_blank" style="color: #3B82F6; text-decoration: none;">📥 View</a>
                        <button onclick="deleteEditDocument(${i})" type="button" style="background: #EF4444; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;">🗑️ Delete</button>
                    </div>
                    `;
                }).join('') || '<p style="color: #666;">No documents</p>'}
            </div>
        </div>

        <div class="detail-section">
            <h3>Administrative Details</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>T-Shirt Size</label>
                    <select id="edit-tshirtSize">
                        <option value="" ${!reg.tshirtSize ? 'selected' : ''}>-- Not Set --</option>
                        <option value="XS" ${reg.tshirtSize === 'XS' ? 'selected' : ''}>XS – Extra Small</option>
                        <option value="S" ${reg.tshirtSize === 'S' ? 'selected' : ''}>S – Small</option>
                        <option value="M" ${reg.tshirtSize === 'M' ? 'selected' : ''}>M – Medium</option>
                        <option value="L" ${reg.tshirtSize === 'L' ? 'selected' : ''}>L – Large</option>
                        <option value="XL" ${reg.tshirtSize === 'XL' ? 'selected' : ''}>XL – Extra Large</option>
                        <option value="2XL" ${reg.tshirtSize === '2XL' ? 'selected' : ''}>2XL – Double Extra Large</option>
                        <option value="3XL" ${reg.tshirtSize === '3XL' ? 'selected' : ''}>3XL – Triple Extra Large</option>
                        <option value="4XL" ${reg.tshirtSize === '4XL' ? 'selected' : ''}>4XL</option>
                        <option value="5XL" ${reg.tshirtSize === '5XL' ? 'selected' : ''}>5XL</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Type</label>
                    <select id="edit-type">
                        <option value="Member" ${reg.type === 'Member' ? 'selected' : ''}>Member</option>
                        <option value="Associate Member" ${reg.type === 'Associate Member' ? 'selected' : ''}>Associate Member</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <select id="edit-status">
                        <option value="Pending" ${reg.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Approved" ${reg.status === 'Approved' ? 'selected' : ''}>Approved</option>
                        <option value="Rejected" ${reg.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Payment Status</label>
                    <select id="edit-paymentStatus">
                        <option value="Pending" ${(reg.paymentStatus || 'Pending') === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Paid" ${reg.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
                        <option value="Unpaid" ${reg.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option value="Partial" ${reg.paymentStatus === 'Partial' ? 'selected' : ''}>Partial</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Examinee Status</label>
                    <select id="edit-examineeStatus">
                        <option value="First-Timer" ${(reg.examineeStatus || 'First-Timer') === 'First-Timer' ? 'selected' : ''}>First-Timer</option>
                        <option value="Re-Taker" ${reg.examineeStatus === 'Re-Taker' ? 'selected' : ''}>Re-Taker</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Membership Fee</label>
                    <select id="edit-membershipFee">
                        <option value="Unpaid" ${(reg.membershipFee || 'Unpaid') === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option value="Paid" ${reg.membershipFee === 'Paid' ? 'selected' : ''}>Paid</option>
                        <option value="Exempted" ${reg.membershipFee === 'Exempted' ? 'selected' : ''}>Exempted</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Membership Fee Date</label>
                    <input type="date" id="edit-membershipFeeDate" value="${reg.membershipFeeDate || ''}">
                </div>
                <div class="detail-item">
                    <label>Incidental Fee</label>
                    <select id="edit-incidentalFee">
                        <option value="Unpaid" ${(reg.incidentalFee || 'Unpaid') === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                        <option value="Paid" ${reg.incidentalFee === 'Paid' ? 'selected' : ''}>Paid</option>
                        <option value="Exempted" ${reg.incidentalFee === 'Exempted' ? 'selected' : ''}>Exempted</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>Incidental Fee Date</label>
                    <input type="date" id="edit-incidentalFeeDate" value="${reg.incidentalFeeDate || ''}">
                </div>
                <div class="detail-item">
                    <label>LERIS Application No.</label>
                    <input type="text" id="edit-lerisAppNo" value="${reg.lerisAppNo || ''}" placeholder="Enter LERIS App No.">
                </div>
                <div class="detail-item">
                    <label>Hard Copies Received by</label>
                    <input type="text" id="edit-hardCopiesReceivedBy" value="${reg.hardCopiesReceivedBy || ''}" placeholder="Enter name">
                </div>
                <div class="detail-item">
                    <label>Hard Copies Received Date</label>
                    <input type="date" id="edit-hardCopiesReceivedDate" value="${reg.hardCopiesReceivedDate || ''}">
                </div>
                <div class="detail-item">
                    <label>Payment Received by</label>
                    <input type="text" id="edit-paymentReceivedBy" value="${reg.paymentReceivedBy || ''}" placeholder="Enter name">
                </div>
                <div class="detail-item">
                    <label>LERIS Status</label>
                    <select id="edit-lerisStatus">
                        <option value="" ${!reg.lerisStatus ? 'selected' : ''}>-- Not Set --</option>
                        <option value="Pending" ${reg.lerisStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Cancelled" ${reg.lerisStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        <option value="Denied" ${reg.lerisStatus === 'Denied' ? 'selected' : ''}>Denied</option>
                        <option value="Approved" ${reg.lerisStatus === 'Approved' ? 'selected' : ''}>Approved</option>
                    </select>
                </div>
                <div class="detail-item">
                    <label>ID Issue Status</label>
                    <input type="text" id="edit-idIssueStatus" value="${reg.idIssueStatus || ''}" placeholder="Enter ID issue status">
                </div>
                <div class="detail-item">
                    <label>Mem Cert Issue Status</label>
                    <input type="text" id="edit-memCertIssueStatus" value="${reg.memCertIssueStatus || ''}" placeholder="Enter membership cert status">
                </div>
                <div class="detail-item">
                    <label>T-shirt Issue Status</label>
                    <input type="text" id="edit-tshirtIssueStatus" value="${reg.tshirtIssueStatus || ''}" placeholder="Enter t-shirt issue status">
                </div>
                <div class="detail-item">
                    <label>SPLE Status</label>
                    <input type="text" id="edit-spleStatus" value="${reg.spleStatus || ''}" placeholder="Enter SPLE status">
                </div>
                <div class="detail-item">
                    <label>SPIMS Status</label>
                    <input type="text" id="edit-spimsStatus" value="${reg.spimsStatus || ''}" placeholder="Enter SPIMS status">
                </div>
            </div>
            <div class="detail-item" style="margin-top: 20px;">
                <label>Remarks</label>
                <textarea id="edit-remarks" rows="4" placeholder="Enter remarks here...">${reg.remarks || ''}</textarea>
            </div>
        </div>

        <div class="modal-footer">
            <button onclick="closeDetailModal()" class="btn-secondary">Cancel</button>
            <button onclick="saveChanges()" class="btn-primary">Save Changes</button>
        </div>
    `;

    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').style.display = 'flex';
}

// Save changes
async function saveChanges() {
    if (!currentEditId) return;

    try {
        const reg = allRegistrations.find(r => r.id === currentEditId);
        
        const updateData = {
            personalInfo: {
                surname: document.getElementById('edit-surname').value,
                firstName: document.getElementById('edit-firstName').value,
                middleName: document.getElementById('edit-middleName').value
            },
            contactInfo: {
                contactNumber: document.getElementById('edit-contactNumber').value,
                whatsappNumber: document.getElementById('edit-whatsappNumber').value,
                email: document.getElementById('edit-email').value
            },
            educationalBackground: {
                university: document.getElementById('edit-university').value,
                degree: document.getElementById('edit-degree').value,
                level: document.getElementById('edit-level').value,
                major: document.getElementById('edit-major').value
            },
            tshirtSize: document.getElementById('edit-tshirtSize').value,
            type: document.getElementById('edit-type').value,
            status: document.getElementById('edit-status').value,
            paymentStatus: document.getElementById('edit-paymentStatus').value,
            examineeStatus: document.getElementById('edit-examineeStatus').value,
            membershipFee: document.getElementById('edit-membershipFee').value,
            membershipFeeDate: document.getElementById('edit-membershipFeeDate').value,
            incidentalFee: document.getElementById('edit-incidentalFee').value,
            incidentalFeeDate: document.getElementById('edit-incidentalFeeDate').value,
            lerisAppNo: document.getElementById('edit-lerisAppNo').value,
            hardCopiesReceivedBy: document.getElementById('edit-hardCopiesReceivedBy').value,
            hardCopiesReceivedDate: document.getElementById('edit-hardCopiesReceivedDate').value,
            paymentReceivedBy: document.getElementById('edit-paymentReceivedBy').value,
            lerisStatus: document.getElementById('edit-lerisStatus').value,
            idIssueStatus: document.getElementById('edit-idIssueStatus').value,
            memCertIssueStatus: document.getElementById('edit-memCertIssueStatus').value,
            tshirtIssueStatus: document.getElementById('edit-tshirtIssueStatus').value,
            spleStatus: document.getElementById('edit-spleStatus').value,
            spimsStatus: document.getElementById('edit-spimsStatus').value,
            remarks: document.getElementById('edit-remarks').value,
            documents: reg.documents || [],
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref(`registrations/${currentEditId}`).update(updateData);

        // ACTIVITY LOG: Log edit action
        const fullName = `${updateData.personalInfo.surname} ${updateData.personalInfo.firstName}`.trim();
        await logActivity('EDIT', { 
            registrationId: currentEditId, 
            registrationName: fullName 
        });

        closeDetailModal();
        loadRegistrations();
        showSuccessMessage('Registration updated successfully');
    } catch (error) {
        console.error('Error updating registration:', error);
        showErrorMessage('Failed to update registration');
    }
}

// Delete registration
function deleteRegistration(id, name) {
    currentDeleteId = id;
    document.getElementById('deleteName').textContent = name;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Confirm delete
async function confirmDelete() {
    if (!currentDeleteId) return;

    try {
        // Get registration name before deleting
        const reg = allRegistrations.find(r => r.id === currentDeleteId);
        const regName = reg ? `${reg.personalInfo?.surname || ''} ${reg.personalInfo?.firstName || ''}`.trim() : 'Unknown';
        
        await database.ref(`registrations/${currentDeleteId}`).remove();
        
        // ACTIVITY LOG: Log delete action
        await logActivity('DELETE', { 
            registrationId: currentDeleteId, 
            registrationName: regName 
        });
        
        closeDeleteModal();
        loadRegistrations();
        showSuccessMessage('Registration deleted successfully');
    } catch (error) {
        console.error('Error deleting registration:', error);
        showErrorMessage('Failed to delete registration');
    }
}

// Close modals
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
    currentEditId = null;
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    currentDeleteId = null;
}

// Export to Excel
async function exportToExcel() {
    try {
        // Prepare data for export
        const data = allRegistrations.map(reg => ({
            'Registration ID': reg.id,
            'Surname': reg.personalInfo?.surname || '',
            'First Name': reg.personalInfo?.firstName || '',
            'Middle Name': reg.personalInfo?.middleName || '',
            'Contact Number': reg.contactInfo?.contactNumber || '',
            'WhatsApp Number': reg.contactInfo?.whatsappNumber || '',
            'Email': reg.contactInfo?.email || '',
            'University': reg.educationalBackground?.university || '',
            'Degree': reg.educationalBackground?.degree || '',
            'Level': reg.educationalBackground?.level || '',
            'Major': reg.educationalBackground?.major || 'N/A',
            'T-Shirt Size': reg.tshirtSize || '',
            'Type': reg.type || 'Member',
            'Status': reg.status || 'Pending',
            'Payment Status': reg.paymentStatus || 'Pending',
            'Examinee Status': reg.examineeStatus || 'First-Timer',
            'Membership Fee': reg.membershipFee || 'Unpaid',
            'Membership Fee Date': reg.membershipFeeDate || '',
            'Incidental Fee': reg.incidentalFee || 'Unpaid',
            'Incidental Fee Date': reg.incidentalFeeDate || '',
            'LERIS App No.': reg.lerisAppNo || '',
            'Hard Copies Received by': reg.hardCopiesReceivedBy || '',
            'Hard Copies Received Date': reg.hardCopiesReceivedDate || '',
            'Payment Received by': reg.paymentReceivedBy || '',
            'LERIS Status': reg.lerisStatus || '',
            'ID Issue Status': reg.idIssueStatus || '',
            'Mem Cert Issue Status': reg.memCertIssueStatus || '',
            'T-shirt Issue Status': reg.tshirtIssueStatus || '',
            'SPLE Status': reg.spleStatus || '',
            'SPIMS Status': reg.spimsStatus || '',
            'Remarks': reg.remarks || '',
            'Submitted Date': reg.submittedAt ? new Date(reg.submittedAt).toLocaleString() : ''
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Registration ID
            { wch: 20 }, // Surname
            { wch: 20 }, // First Name
            { wch: 20 }, // Middle Name
            { wch: 20 }, // Contact Number
            { wch: 20 }, // WhatsApp Number
            { wch: 30 }, // Email
            { wch: 30 }, // University
            { wch: 35 }, // Degree
            { wch: 15 }, // Level
            { wch: 30 }, // Major
            { wch: 15 }, // T-Shirt Size
            { wch: 20 }, // Type
            { wch: 15 }, // Status
            { wch: 18 }, // Payment Status
            { wch: 18 }, // Examinee Status
            { wch: 18 }, // Membership Fee
            { wch: 18 }, // Membership Fee Date
            { wch: 18 }, // Incidental Fee
            { wch: 18 }, // Incidental Fee Date
            { wch: 20 }, // LERIS App No.
            { wch: 25 }, // Hard Copies Received by
            { wch: 22 }, // Hard Copies Received Date
            { wch: 22 }, // Payment Received by
            { wch: 18 }, // LERIS Status
            { wch: 20 }, // ID Issue Status
            { wch: 25 }, // Mem Cert Issue Status
            { wch: 22 }, // T-shirt Issue Status
            { wch: 18 }, // SPLE Status
            { wch: 18 }, // SPIMS Status
            { wch: 30 }, // Remarks
            { wch: 25 }  // Submitted Date
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'TSOK Registrations');

        // Generate Excel file and download
        XLSX.writeFile(wb, `TSOK-Registrations-${new Date().toISOString().split('T')[0]}.xlsx`);
        
        // ACTIVITY LOG: Log export action
        await logActivity('EXPORT', { 
            format: 'Excel', 
            recordCount: allRegistrations.length 
        });
        
        showSuccessMessage('Export completed successfully');
    } catch (error) {
        console.error('Export error:', error);
        showErrorMessage('Failed to export to Excel');
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allRegistrations.filter(reg => {
            const fullName = `${reg.personalInfo?.surname || ''} ${reg.personalInfo?.firstName || ''} ${reg.personalInfo?.middleName || ''}`.toLowerCase();
            const email = (reg.contactInfo?.email || '').toLowerCase();
            const contact = (reg.contactInfo?.contactNumber || '').toLowerCase();
            const level = (reg.educationalBackground?.level || '').toLowerCase();
            const type = (reg.type || '').toLowerCase();
            const status = (reg.status || '').toLowerCase();
            const payment = (reg.paymentStatus || '').toLowerCase();
            const examinee = (reg.examineeStatus || '').toLowerCase();
            
            return fullName.includes(searchTerm) || 
                   email.includes(searchTerm) || 
                   contact.includes(searchTerm) ||
                   level.includes(searchTerm) ||
                   type.includes(searchTerm) ||
                   status.includes(searchTerm) ||
                   payment.includes(searchTerm) ||
                   examinee.includes(searchTerm);
        });
        displayRegistrations(filtered);
    });
}

// ==================== ACTIVITY LOG MODAL FUNCTIONS ====================
// Show Activity Log Modal
async function showActivityLog() {
    const snapshot = await database.ref('activityLogs').orderByChild('timestamp').limitToLast(100).once('value');
    const logs = [];
    
    snapshot.forEach((child) => {
        logs.unshift({ id: child.key, ...child.val() });
    });
    
    const logsHTML = logs.map(log => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${log.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;"><strong>${log.adminName}</strong><br><small style="color: #666;">${log.adminEmail}</small></td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;"><span class="action-badge action-${log.action.toLowerCase()}">${log.action}</span></td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${log.details.registrationName || log.details.message || '-'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
                <strong>${log.location.ip.city}, ${log.location.ip.country}</strong><br>
                <small style="color: #666;">IP: ${log.location.ip.ip}</small>
                ${log.location.gps ? `<br><small style="color: #666;">GPS: ${log.location.gps.latitude.toFixed(4)}, ${log.location.gps.longitude.toFixed(4)}</small>` : ''}
            </td>
        </tr>
    `).join('');
    
    const modalHTML = `
        <div id="activityLogModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h2>📋 Activity Log</h2>
                    <button onclick="closeActivityLogModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <button onclick="exportActivityLog()" style="background: #10B981; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                            📥 Export to Excel
                        </button>
                        <button onclick="clearOldLogs()" style="background: #EF4444; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px; font-weight: 600;">
                            🗑️ Clear Old Logs (>30 days)
                        </button>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                        <thead>
                            <tr style="background: #2E4C96; color: white;">
                                <th style="padding: 12px; text-align: left;">Date & Time</th>
                                <th style="padding: 12px; text-align: left;">Admin</th>
                                <th style="padding: 12px; text-align: left;">Action</th>
                                <th style="padding: 12px; text-align: left;">Details</th>
                                <th style="padding: 12px; text-align: left;">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logsHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px;">No activity logs found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeActivityLogModal() {
    const modal = document.getElementById('activityLogModal');
    if (modal) modal.remove();
}

// Export Activity Log to Excel
async function exportActivityLog() {
    const snapshot = await database.ref('activityLogs').orderByChild('timestamp').once('value');
    const logs = [];
    
    snapshot.forEach((child) => {
        const log = child.val();
        logs.push({
            'Date & Time': log.date,
            'Admin Name': log.adminName,
            'Admin Email': log.adminEmail,
            'Action': log.action,
            'Details': log.details.registrationName || log.details.message || '-',
            'City': log.location.ip.city,
            'Country': log.location.ip.country,
            'IP Address': log.location.ip.ip,
            'GPS Latitude': log.location.gps ? log.location.gps.latitude : 'N/A',
            'GPS Longitude': log.location.gps ? log.location.gps.longitude : 'N/A',
            'Platform': log.platform,
            'User Agent': log.userAgent
        });
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(logs);
    
    ws['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 30 },
        { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 50 }
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
    XLSX.writeFile(wb, `TSOK-Activity-Log-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showSuccessMessage('Activity log exported successfully!');
}

// Clear old logs (>30 days)
async function clearOldLogs() {
    if (!confirm('Delete all activity logs older than 30 days?')) return;
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const snapshot = await database.ref('activityLogs').orderByChild('timestamp').endAt(thirtyDaysAgo).once('value');
    
    let count = 0;
    const updates = {};
    snapshot.forEach((child) => {
        updates[`activityLogs/${child.key}`] = null;
        count++;
    });
    
    if (count > 0) {
        await database.ref().update(updates);
        await logActivity('CLEAR_LOGS', { message: `Cleared ${count} old logs` });
        showSuccessMessage(`Deleted ${count} old activity logs`);
        closeActivityLogModal();
        showActivityLog();
    } else {
        showSuccessMessage('No old logs to delete');
    }
}
// ==================== END ACTIVITY LOG MODAL FUNCTIONS ====================

// ==================== FILE UPLOAD/DELETE FUNCTIONS ====================
// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'df17jssg2';
const CLOUDINARY_UPLOAD_PRESET = 'sple_uploads';

// Delete document from edit modal
function deleteEditDocument(index) {
    if (!currentEditId) return;
    if (!confirm('Delete this document?')) return;
    
    const reg = allRegistrations.find(r => r.id === currentEditId);
    if (!reg || !reg.documents) return;
    
    reg.documents.splice(index, 1);
    
    // Re-render documents list
    const docsList = reg.documents.map((doc, i) => {
        const fileName = doc.name || `Document ${i + 1}`;
        return `
        <div class="doc-item-${i}" style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #F3F4F6; border-radius: 5px; margin-bottom: 8px;">
            <span style="flex: 1;">${fileName}</span>
            <a href="${doc.url}" target="_blank" style="color: #3B82F6; text-decoration: none;">📥 View</a>
            <button onclick="deleteEditDocument(${i})" type="button" style="background: #EF4444; color: white; padding: 5px 10px; border: none; border-radius: 5px; cursor: pointer;">🗑️ Delete</button>
        </div>
        `;
    }).join('') || '<p style="color: #666;">No documents</p>';
    
    document.getElementById('edit-documents-list').innerHTML = docsList;
}

// File to base64 helper
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Upload to Cloudinary helper
async function uploadToCloudinary(base64Data, folder, fileName) {
    const isPDF = base64Data.startsWith('data:application/pdf');
    const resourceType = isPDF ? 'raw' : 'image';
    
    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `tsok-registration/${folder}`);
    formData.append('public_id', fileName);
    
    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    const data = await response.json();
    return data.secure_url;
}

// Setup file upload listener
document.addEventListener('DOMContentLoaded', () => {
    // This will be set up dynamically when edit modal opens
});

// Setup file input handler when edit modal opens
function setupFileUploadHandler() {
    const fileInput = document.getElementById('edit-newDocuments');
    if (fileInput) {
        // Remove old listeners
        const newFileInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        
        newFileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            const reg = allRegistrations.find(r => r.id === currentEditId);
            if (!reg) return;
            
            try {
                showSuccessMessage('Uploading files...');
                
                // Get current year
                const currentYear = new Date().getFullYear();
                
                // Create clean filename: Surname-FirstName-MiddleName-Year
                const surname = reg.personalInfo?.surname || 'unknown';
                const firstName = reg.personalInfo?.firstName || '';
                const middleName = reg.personalInfo?.middleName || '';
                
                const cleanSurname = surname.replace(/\s+/g, '');
                const cleanFirstName = firstName.replace(/\s+/g, '');
                const cleanMiddleName = middleName.replace(/\s+/g, '');
                const baseFileName = `${cleanSurname}-${cleanFirstName}-${cleanMiddleName}-${currentYear}`;
                
                const folderName = surname.toLowerCase().replace(/\s+/g, '-');
                
                // Get current document count for numbering
                const currentCount = reg.documents ? reg.documents.length : 0;
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const base64 = await fileToBase64(file);
                    const fileExt = file.name.split('.').pop();
                    const fileName = files.length > 1 ? `${baseFileName}-${currentCount + i + 1}` : `${baseFileName}-${currentCount + 1}`;
                    
                    const url = await uploadToCloudinary(base64, folderName, fileName);
                    
                    if (!reg.documents) reg.documents = [];
                    reg.documents.push({
                        name: `${fileName}.${fileExt}`,
                        url: url
                    });
                }
                
                // Update display
                editRegistration(currentEditId);
                showSuccessMessage('Documents uploaded successfully!');
            } catch (error) {
                console.error('Upload error:', error);
                showErrorMessage('Failed to upload documents');
            }
            
            // Reset file input
            e.target.value = '';
        });
    }
}

// Call setupFileUploadHandler after editRegistration renders
const originalEditRegistration = editRegistration;
editRegistration = function(id) {
    originalEditRegistration(id);
    setTimeout(setupFileUploadHandler, 100);
};
// ==================== END FILE UPLOAD/DELETE FUNCTIONS ====================

// Show messages
function showSuccessMessage(message) {
    alert(message);
}

function showErrorMessage(message) {
    alert(message);
}

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') {
        closeDetailModal();
    }
    if (e.target.id === 'deleteModal') {
        closeDeleteModal();
    }
});

// Add CSS for action badges
const style = document.createElement('style');
style.textContent = `
    .action-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .action-login { background: #10B981; color: white; }
    .action-logout { background: #6B7280; color: white; }
    .action-edit { background: #3B82F6; color: white; }
    .action-delete { background: #EF4444; color: white; }
    .action-export { background: #8B5CF6; color: white; }
    .action-view { background: #F59E0B; color: white; }
    .action-clear_logs { background: #EC4899; color: white; }
    
    /* Payment Status Badges */
    .payment-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .payment-pending { background: #FCD34D; color: #78350F; }
    .payment-paid { background: #10B981; color: white; }
    .payment-unpaid { background: #EF4444; color: white; }
    .payment-partial { background: #F59E0B; color: white; }
    
    /* Examinee Status Badges */
    .examinee-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .examinee-firsttimer { background: #3B82F6; color: white; }
    .examinee-retaker { background: #8B5CF6; color: white; }
    
    /* Fee Badges */
    .fee-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .fee-paid { background: #10B981; color: white; }
    .fee-unpaid { background: #EF4444; color: white; }
    .fee-exempted { background: #6B7280; color: white; }
`;
document.head.appendChild(style);

// ==================== EMAIL MODAL FUNCTIONS ====================
// EmailJS Configuration (same as app.js)
const EMAILJS_PUBLIC_KEY = 'BOcx-o_GvJEVbp-dL';
const EMAILJS_SERVICE_ID = 'service_8lub6jr';
const EMAILJS_TEMPLATE_ID_ADMIN = 'template_jq2ksu9'; // You can use different template or same

// Initialize EmailJS if not already initialized
if (typeof emailjs !== 'undefined' && !emailjs.init) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

let currentEmailRecipient = null;

// Open Email Modal
function openEmailModal(registrationId) {
    const reg = allRegistrations.find(r => r.id === registrationId);
    if (!reg) return;
    
    const fullName = `${reg.personalInfo?.firstName || ''} ${reg.personalInfo?.lastName || reg.personalInfo?.surname || ''}`.trim();
    const email = reg.contactInfo?.email || '';
    
    if (!email) {
        alert('No email address found for this registration.');
        return;
    }
    
    currentEmailRecipient = {
        id: registrationId,
        name: fullName,
        email: email
    };
    
    // Create modal HTML
    const modalHTML = `
        <div id="emailModal" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 700px; width: 90%;">
                <div class="modal-header">
                    <h2>📧 Send Email</h2>
                    <span class="close" onclick="closeEmailModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #374151;"><strong>To:</strong> ${fullName}</p>
                        <p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">${email}</p>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Subject:</label>
                        <input type="text" id="emailSubject" 
                               style="width: 100%; padding: 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 15px;"
                               placeholder="Enter email subject"
                               value="TSOK Registration Update">
                    </div>
                    
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">Message:</label>
                        <textarea id="emailBody" rows="12" 
                                  style="width: 100%; padding: 12px; border: 1px solid #D1D5DB; border-radius: 8px; font-size: 15px; font-family: inherit; resize: vertical;"
                                  placeholder="Type your message here...">Dear ${fullName},

Greetings from TSOK!



For any questions, please contact us at tsokuwait@gmail.com.

Best regards,
TSOK Officers 2026</textarea>
                    </div>
                    
                    <div id="emailStatus" style="margin-top: 15px; padding: 10px; border-radius: 6px; display: none;"></div>
                </div>
                <div class="modal-footer">
                    <button onclick="closeEmailModal()" class="btn-secondary" style="padding: 12px 24px; background: #6B7280; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; margin-right: 10px;">Cancel</button>
                    <button onclick="sendEmailToUser()" class="btn-primary" style="padding: 12px 24px; background: #2E4C96; color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        Send Email
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('emailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus on subject field
    setTimeout(() => {
        document.getElementById('emailSubject').focus();
    }, 100);
}

// Close Email Modal
function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
        modal.remove();
    }
    currentEmailRecipient = null;
}

// Send Email to User
async function sendEmailToUser() {
    if (!currentEmailRecipient) return;
    
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    const statusDiv = document.getElementById('emailStatus');
    const sendButton = event.target;
    
    // Validation
    if (!subject) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#FEF2F2';
        statusDiv.style.color = '#DC2626';
        statusDiv.textContent = '⚠️ Please enter a subject';
        return;
    }
    
    if (!body) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#FEF2F2';
        statusDiv.style.color = '#DC2626';
        statusDiv.textContent = '⚠️ Please enter a message';
        return;
    }
    
    // Show sending status
    sendButton.disabled = true;
    sendButton.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Sending...';
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#FEF9C3';
    statusDiv.style.color = '#854D0E';
    statusDiv.textContent = '📤 Sending email...';
    
    try {
        // Prepare email parameters
        const templateParams = {
            to_email: currentEmailRecipient.email,
            to_name: currentEmailRecipient.name,
            subject: subject,
            message: body,
            from_name: 'TSOK Officers 2026',
            reply_to: 'tsokuwait@gmail.com'
        };
        
        // Send via EmailJS
        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_ADMIN,
            templateParams
        );
        
        console.log('Email sent successfully!', response);
        
        // Show success
        statusDiv.style.background = '#ECFDF5';
        statusDiv.style.color = '#065F46';
        statusDiv.textContent = '✅ Email sent successfully to ' + currentEmailRecipient.email;
        
        sendButton.innerHTML = '✅ Email Sent!';
        
        // Log activity
        await logActivity('email_sent', currentAdmin?.email || 'admin', {
            recipient: currentEmailRecipient.email,
            subject: subject
        });
        
        // Close modal after 2 seconds
        setTimeout(() => {
            closeEmailModal();
        }, 2000);
        
    } catch (error) {
        console.error('Email sending failed:', error);
        
        // Show error
        statusDiv.style.background = '#FEF2F2';
        statusDiv.style.color = '#DC2626';
        statusDiv.textContent = '❌ Failed to send email. Please try again.';
        
        sendButton.disabled = false;
        sendButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            Send Email
        `;
    }
}

// Add CSS for spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .btn-email {
        background: #8B5CF6;
        color: white;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.2s;
    }
    .btn-email:hover {
        background: #7C3AED;
    }
    .btn-email svg {
        flex-shrink: 0;
    }
`;
document.head.appendChild(spinStyle);

console.log('TSOK Admin Dashboard with Activity Log - Developed by TSOK 2026 Offices');
