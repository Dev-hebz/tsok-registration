// ==================== FIREBASE CONFIGURATION ====================
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

// ==================== GLOBAL VARIABLES ====================
let allTransactions = [];
let currentUser = null;

// ==================== AUTHENTICATION CHECK ====================
auth.onAuthStateChanged((user) => {
    if (!user) {
        // Not logged in, redirect to admin login
        window.location.href = '/admin.html';
    } else {
        currentUser = user;
        initializePage();
    }
});

// ==================== INITIALIZE PAGE ====================
function initializePage() {
    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();
    
    // Load transactions
    loadTransactions();
    
    // Setup form submit
    document.getElementById('transactionForm').addEventListener('submit', handleAddTransaction);
    document.getElementById('editForm').addEventListener('submit', handleEditTransaction);
    
    // Setup filters
    document.getElementById('searchInput').addEventListener('input', filterTransactions);
    document.getElementById('typeFilter').addEventListener('change', filterTransactions);
    document.getElementById('dateFrom').addEventListener('change', filterTransactions);
    document.getElementById('dateTo').addEventListener('change', filterTransactions);
}

// ==================== LOAD TRANSACTIONS ====================
function loadTransactions() {
    database.ref('financial/transactions').orderByChild('timestamp').on('value', (snapshot) => {
        allTransactions = [];
        
        snapshot.forEach((child) => {
            allTransactions.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Sort by date (newest first)
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        // Recalculate balances
        calculateBalances();
        
        // Update display
        updateSummary();
        displayTransactions(allTransactions);
    });
}

// ==================== CALCULATE RUNNING BALANCES ====================
function calculateBalances() {
    // Sort by timestamp (oldest first) for balance calculation
    const sortedTransactions = [...allTransactions].sort((a, b) => a.timestamp - b.timestamp);
    
    let runningBalance = 0;
    sortedTransactions.forEach(transaction => {
        if (transaction.type === 'cash_in') {
            runningBalance += parseFloat(transaction.amount);
        } else {
            runningBalance -= parseFloat(transaction.amount);
        }
        transaction.balance = runningBalance;
    });
    
    // Update in Firebase (only if changed)
    sortedTransactions.forEach(transaction => {
        database.ref(`financial/transactions/${transaction.id}/balance`).set(transaction.balance);
    });
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    const cashIn = allTransactions
        .filter(t => t.type === 'cash_in')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const cashOut = allTransactions
        .filter(t => t.type === 'cash_out')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const balance = cashIn - cashOut;
    
    document.getElementById('totalCashIn').textContent = formatMoney(cashIn);
    document.getElementById('totalCashOut').textContent = formatMoney(cashOut);
    document.getElementById('currentBalance').textContent = formatMoney(balance);
}

// ==================== DISPLAY TRANSACTIONS ====================
function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>No transactions found</h3>
                    <p>Add your first transaction to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = transactions.map(transaction => {
        const date = new Date(transaction.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const typeClass = transaction.type === 'cash_in' ? 'cash-in' : 'cash-out';
        const typeLabel = transaction.type === 'cash_in' ? 'Cash IN' : 'Cash OUT';
        const amountClass = transaction.type === 'cash_in' ? 'amount-positive' : 'amount-negative';
        const amountPrefix = transaction.type === 'cash_in' ? '+' : '-';
        
        return `
            <tr>
                <td>${date}</td>
                <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                <td>${transaction.category}</td>
                <td>${transaction.description}</td>
                <td class="${amountClass}">${amountPrefix}${formatMoney(transaction.amount)}</td>
                <td><strong>${formatMoney(transaction.balance || 0)}</strong></td>
                <td>
                    <button class="btn-small btn-edit" onclick="openEditModal('${transaction.id}')">Edit</button>
                    <button class="btn-small btn-delete" onclick="deleteTransaction('${transaction.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== ADD TRANSACTION ====================
async function handleAddTransaction(e) {
    e.preventDefault();
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    const transaction = {
        type,
        date,
        category,
        description,
        amount,
        recordedBy: currentUser.email,
        timestamp: new Date(date).getTime(),
        createdAt: Date.now()
    };
    
    try {
        await database.ref('financial/transactions').push(transaction);
        
        // Show success message
        const msg = document.getElementById('formMessage');
        msg.textContent = '✅ Transaction added successfully!';
        msg.style.display = 'block';
        setTimeout(() => msg.style.display = 'none', 3000);
        
        // Reset form
        document.getElementById('transactionForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        
    } catch (error) {
        alert('Error adding transaction: ' + error.message);
    }
}

// ==================== EDIT TRANSACTION ====================
function openEditModal(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    document.getElementById('editId').value = transaction.id;
    document.querySelector(`input[name="editType"][value="${transaction.type}"]`).checked = true;
    document.getElementById('editDate').value = transaction.date;
    document.getElementById('editCategory').value = transaction.category;
    document.getElementById('editDescription').value = transaction.description;
    document.getElementById('editAmount').value = transaction.amount;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editForm').reset();
}

async function handleEditTransaction(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const type = document.querySelector('input[name="editType"]:checked').value;
    const date = document.getElementById('editDate').value;
    const category = document.getElementById('editCategory').value;
    const description = document.getElementById('editDescription').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    
    const updates = {
        type,
        date,
        category,
        description,
        amount,
        timestamp: new Date(date).getTime(),
        updatedAt: Date.now(),
        updatedBy: currentUser.email
    };
    
    try {
        await database.ref(`financial/transactions/${id}`).update(updates);
        closeEditModal();
        
        // Show success
        alert('✅ Transaction updated successfully!');
    } catch (error) {
        const msg = document.getElementById('editMessage');
        msg.textContent = '❌ Error: ' + error.message;
        msg.style.display = 'block';
    }
}

// ==================== DELETE TRANSACTION ====================
async function deleteTransaction(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const confirmMsg = `Delete this transaction?\n\nType: ${transaction.type}\nAmount: ₱${transaction.amount}\nDescription: ${transaction.description}`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        await database.ref(`financial/transactions/${transactionId}`).remove();
        alert('✅ Transaction deleted successfully!');
    } catch (error) {
        alert('❌ Error deleting transaction: ' + error.message);
    }
}

// ==================== FILTER TRANSACTIONS ====================
function filterTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    let filtered = allTransactions.filter(transaction => {
        // Search filter
        const matchesSearch = !searchTerm || 
            transaction.description.toLowerCase().includes(searchTerm) ||
            transaction.category.toLowerCase().includes(searchTerm);
        
        // Type filter
        const matchesType = !typeFilter || transaction.type === typeFilter;
        
        // Date range filter
        const matchesDateFrom = !dateFrom || transaction.date >= dateFrom;
        const matchesDateTo = !dateTo || transaction.date <= dateTo;
        
        return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
    });
    
    displayTransactions(filtered);
}

// ==================== EXPORT TO EXCEL ====================
function exportToExcel() {
    if (allTransactions.length === 0) {
        alert('No transactions to export!');
        return;
    }
    
    const data = allTransactions.map(transaction => ({
        'Date': transaction.date,
        'Type': transaction.type === 'cash_in' ? 'Cash IN' : 'Cash OUT',
        'Category': transaction.category,
        'Description': transaction.description,
        'Amount': transaction.amount,
        'Balance': transaction.balance || 0,
        'Recorded By': transaction.recordedBy,
        'Created': new Date(transaction.createdAt).toLocaleString()
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Column widths
    ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Type
        { wch: 20 }, // Category
        { wch: 40 }, // Description
        { wch: 12 }, // Amount
        { wch: 12 }, // Balance
        { wch: 30 }, // Recorded By
        { wch: 20 }  // Created
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    
    // Add summary sheet
    const summary = [
        { 'Item': 'Total Cash IN', 'Amount': allTransactions.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0) },
        { 'Item': 'Total Cash OUT', 'Amount': allTransactions.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0) },
        { 'Item': 'Current Balance', 'Amount': allTransactions.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0) - allTransactions.filter(t => t.type === 'cash_out').reduce((sum, t) => sum + t.amount, 0) }
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    const fileName = `TSOK-Financial-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ==================== UTILITY FUNCTIONS ====================
function formatMoney(amount) {
    return '₱' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}
