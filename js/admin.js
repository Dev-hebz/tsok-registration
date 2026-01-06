// Firebase Configuration
const firebaseConfig = {
   apiKey: "AIzaSyCXF-KDN99SD84SXNzMy-RJ2kUIMxwro0A",
    authDomain: "tsokregistration.firebaseapp.com",
    databaseURL: "https://tsokregistration-default-rtdb.firebaseio.com/",
    projectId: "tsokregistration",
    storageBucket: "tsokregistration.firebasestorage.app",
    messagingSenderId: "910893887334",
    appId: "1:910893887334:web:5eac10fe347a96cce462a7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allRegistrations = [];
let currentEditId = null;
let currentDeleteId = null;

// Load registrations on page load
document.addEventListener('DOMContentLoaded', () => {
    loadRegistrations();
    setupSearch();
});

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

    document.getElementById('totalRegistrations').textContent = total;
    document.getElementById('totalMembers').textContent = members;
    document.getElementById('totalAssociates').textContent = associates;
}

// Display registrations in table
function displayRegistrations(registrations) {
    const tbody = document.getElementById('registrationsBody');

    if (registrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">
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
                ${reg.documents?.map((doc, i) => `
                    <a href="${doc.url}" target="_blank" class="document-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        ${doc.name || `Document ${i + 1}`}
                    </a>
                `).join('') || '<p>No documents uploaded</p>'}
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
                    </select>
                </div>
                <div class="detail-item">
                    <label>Major</label>
                    <input type="text" id="edit-major" value="${reg.educationalBackground?.major || ''}">
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Administrative Details</h3>
            <div class="detail-grid">
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
            type: document.getElementById('edit-type').value,
            status: document.getElementById('edit-status').value,
            remarks: document.getElementById('edit-remarks').value,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        await database.ref(`registrations/${currentEditId}`).update(updateData);

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
        await database.ref(`registrations/${currentDeleteId}`).remove();
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
        const response = await fetch('/api/export/excel');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TSOK-Registrations-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
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
            
            return fullName.includes(searchTerm) || 
                   email.includes(searchTerm) || 
                   contact.includes(searchTerm);
        });
        displayRegistrations(filtered);
    });
}

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

console.log('TSOK Admin Dashboard - Developed by Godmisoft');
