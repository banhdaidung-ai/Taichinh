import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDJWkTU7QSDGV1T_I6NNrSJ8m4GKHnf1m8",
    authDomain: "taichinhbdd.firebaseapp.com",
    projectId: "taichinhbdd",
    storageBucket: "taichinhbdd.firebasestorage.app",
    messagingSenderId: "210668152817",
    appId: "1:210668152817:web:4aa1dbec581ecf7daa0650",
    measurementId: "G-LKEEXHHSRC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// State Management
let transactions = [];
let tasks = [];
let notes = [];
let myChart = null;

// DOM Elements
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const recentTransactionsList = document.getElementById('recent-transactions-list');
const fullTransactionsList = document.getElementById('full-transactions-list');
const budgetListEl = document.getElementById('budget-list');
const filterTypeEl = document.getElementById('filter-type');

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
}

function formatDateDisplay(isoString) {
    const d = new Date(isoString);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    if (isToday) return `${time} - Hôm nay`;

    const isYesterday = new Date(today.setDate(today.getDate() - 1)).getDate() === d.getDate();
    if (isYesterday) return `${time} - Hôm qua`;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${time} - ${day}/${month}/${year}`;
}

// Category Mapping
const categoryData = {
    'Mua sắm': { icon: '<i class="ph ph-shopping-cart"></i>', class: 'cat-shopping' },
    'Lương': { icon: '<i class="ph ph-money"></i>', class: 'cat-salary' },
    'Di chuyển': { icon: '<i class="ph ph-car-profile"></i>', class: 'cat-transport' },
    'Tiện ích': { icon: '<i class="ph ph-lightning"></i>', class: 'cat-utility' },
    'Giải trí': { icon: '<i class="ph ph-game-controller"></i>', class: 'cat-entertainment' },
    'Ăn uống': { icon: '<i class="ph ph-fork-knife"></i>', class: 'cat-food' },
    'Khác': { icon: '<i class="ph ph-dots-three-circle"></i>', class: 'cat-other' }
};

function getCategoryInfo(category) {
    return categoryData[category] || categoryData['Khác'];
}

// Render Single Transaction HTML
function createTransactionHTML(transaction) {
    const isIncome = transaction.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';
    const catInfo = getCategoryInfo(transaction.category);

    const displayName = transaction.note ? transaction.note : transaction.category;
    const displayDate = formatDateDisplay(transaction.date);

    return `
        <div class="transaction-item">
            <div class="t-left">
                <div class="t-icon-box ${catInfo.class}">
                    ${catInfo.icon}
                </div>
                <div class="t-info">
                    <h4>${displayName}</h4>
                    <p>${displayDate}</p>
                </div>
            </div>
            <div class="t-right">
                <span class="t-amount ${amountClass}">${sign}${formatCurrency(transaction.amount)}</span>
                <span class="t-category">${transaction.category}</span>
                <button class="btn btn-delete" data-id="${transaction.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;margin-top:4px;font-size:1.1rem">
                    <i class="ph ph-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Update DOM and state
function updateUI() {
    // Calculate Totals
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const balance = amounts.reduce((acc, item) => acc + item, 0);

    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    // Update Header Cards
    if (totalBalanceEl) totalBalanceEl.innerText = formatCurrency(balance);
    if (totalIncomeEl) totalIncomeEl.innerText = formatCurrency(income);
    if (totalExpenseEl) totalExpenseEl.innerText = formatCurrency(expense);

    // Render Lists
    renderRecentTransactions();
    renderFullTransactions(filterTypeEl ? filterTypeEl.value : 'all');
    renderBudgets();

    // Update Chart
    updateChart(income, expense);
    attachDeleteListeners();
}

function renderRecentTransactions() {
    if (!recentTransactionsList) return;
    recentTransactionsList.innerHTML = '';
    const recent = [...transactions].slice(0, 4);

    if (recent.length === 0) {
        recentTransactionsList.innerHTML = '<div class="empty-state"><p>Chưa có giao dịch nào</p></div>';
        return;
    }

    recent.forEach(t => {
        recentTransactionsList.innerHTML += createTransactionHTML(t);
    });
}

function renderFullTransactions(filterType = 'all') {
    if (!fullTransactionsList) return;
    fullTransactionsList.innerHTML = '';
    let filtered = [...transactions];

    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    if (filtered.length === 0) {
        fullTransactionsList.innerHTML = '<div class="empty-state"><p>Không có dữ liệu</p></div>';
        return;
    }

    filtered.forEach(t => {
        fullTransactionsList.innerHTML += createTransactionHTML(t);
    });
}

function attachDeleteListeners() {
    const deleteBtns = document.querySelectorAll('.btn-delete');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
                try {
                    await deleteDoc(doc(db, "transactions", id));
                } catch (error) {
                    console.error("Error removing document: ", error);
                    alert("Lỗi khi xóa giao dịch!");
                }
            }
        });
    });
}


const MOCK_BUDGETS = {
    'Di chuyển': 3000000,
    'Giải trí': 5000000,
    'Ăn uống': 8000000
};

const BUDGET_COLORS = {
    'Di chuyển': '#FFB020',
    'Giải trí': '#5A8CFF',
    'Ăn uống': '#FF5A82'
};

function renderBudgets() {
    if (!budgetListEl) return;
    budgetListEl.innerHTML = '';

    const expensesByCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        if (!expensesByCategory[t.category]) expensesByCategory[t.category] = 0;
        expensesByCategory[t.category] += t.amount;
    });

    Object.keys(MOCK_BUDGETS).forEach(cat => {
        const spent = expensesByCategory[cat] || 0;
        const total = MOCK_BUDGETS[cat];
        let percent = (spent / total) * 100;
        if (percent > 100) percent = 100;

        const color = BUDGET_COLORS[cat] || 'var(--primary)';

        budgetListEl.innerHTML += `
            <div class="budget-item">
                <div class="b-header">
                    <span class="b-name">${cat}</span>
                    <span class="b-amount">${formatCurrency(spent)} / ${formatCurrency(total)}</span>
                </div>
                <div class="b-progress-bar">
                    <div class="b-progress" style="width: ${percent}%; background-color: ${color}"></div>
                </div>
            </div>
        `;
    });
}

// Chart Visualization
function updateChart(income, expense) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    const expenseData = [];
    for (let i = 6; i >= 0; i--) {
        expenseData.push(Math.floor(Math.random() * 500000) + 100000);
    }

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
            datasets: [{
                label: 'Chi tiêu',
                data: expenseData,
                backgroundColor: 'rgba(82, 208, 130, 0.4)',
                hoverBackgroundColor: 'rgba(82, 208, 130, 1)',
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#8B909A', font: { family: 'Inter' } }
                },
                y: {
                    display: false,
                    grid: { display: false, drawBorder: false }
                }
            }
        }
    });

    if (myChart.data.datasets[0].backgroundColor instanceof Array) {
        // already array
    } else {
        const bgColors = Array(7).fill('rgba(82, 208, 130, 0.4)');
        bgColors[6] = 'rgba(82, 208, 130, 1)';
        myChart.data.datasets[0].backgroundColor = bgColors;
    }
    myChart.update();
}

// REALTIME LISTENERS
function setupRealtimeListeners() {
    // Transactions
    const qT = query(collection(db, "transactions"), orderBy("date", "desc"));
    onSnapshot(qT, (querySnapshot) => {
        transactions = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() });
        });
        updateUI();
    });

    // Tasks
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    onSnapshot(qTasks, (querySnapshot) => {
        tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        renderTasks();
    });

    // Notes - Simplified query to avoid composite index requirement
    // We will sort by createdAt here and handle pinning visually or client-side
    const qNotes = query(collection(db, "notes"), orderBy("createdAt", "desc"));
    onSnapshot(qNotes, (querySnapshot) => {
        notes = [];
        querySnapshot.forEach((doc) => {
            notes.push({ id: doc.id, ...doc.data() });
        });
        // Sort client-side: pinned notes first
        notes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        renderNotes();
    });
}

// Initialization setup
function init() {
    // Start listening to database changes
    setupRealtimeListeners();

    // Form and Modal Elements
    const addBtn = document.getElementById('btn-add-transaction');
    const modal = document.getElementById('transaction-modal');
    const closeBtn = document.querySelector('.close-modal');
    const form = document.getElementById('transaction-form');

    // Modal controls
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            modal.classList.add('show');
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('date').value = now.toISOString().slice(0, 16);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            form.reset();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                form.reset();
            }
        });
    }

    // Form submission saving to FIRESTORE
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Đang lưu...';

            const type = document.querySelector('input[name="type"]:checked').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const note = document.getElementById('note').value;

            if (!amount || !category || !date) {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Lưu Giao Dịch';
                return;
            }

            try {
                await addDoc(collection(db, "transactions"), {
                    type,
                    amount,
                    category,
                    date: new Date(date).toISOString(),
                    note
                });

                modal.classList.remove('show');
                form.reset();
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("Đã xảy ra lỗi khi lưu vào Firebase!");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'Lưu Giao Dịch';
            }
        });
    }

    // Navigation and Routing
    const navItems = document.querySelectorAll('.nav-links li');
    const pages = document.querySelectorAll('.page');

    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(item => {
                if (item.getAttribute('data-page') === 'transactions') item.click();
            });
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.getAttribute('data-page');
            const pageTitleEl = document.getElementById('page-title');
            const titles = {
                'dashboard': 'Tổng quan',
                'budgets': 'Ngân sách',
                'transactions': 'Lịch sử giao dịch',
                'reports': 'Báo cáo',
                'tasks-notes': 'Ghi chú & Công việc'
            };

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `page-${targetPage}`) {
                    page.classList.add('active');
                }
            });

            if (pageTitleEl && titles[targetPage]) {
                pageTitleEl.innerText = titles[targetPage];
            }
        });
    });

    // Global Add button triggers transaction modal
    const globalAddBtn = document.getElementById('btn-add-global');
    if (globalAddBtn) {
        globalAddBtn.addEventListener('click', () => {
            const modal = document.getElementById('transaction-modal');
            if (modal) {
                modal.classList.add('show');
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                const dateInput = document.getElementById('date');
                if (dateInput) dateInput.value = now.toISOString().slice(0, 16);
            }
        });
    }

    if (filterTypeEl) {
        filterTypeEl.addEventListener('change', (e) => {
            renderFullTransactions(e.target.value);
        });
    }

    // Task & Notes Modal Controls
    setupTaskNotesControls();
}

function setupTaskNotesControls() {
    const taskModal = document.getElementById('task-modal');
    const noteModal = document.getElementById('note-modal');

    // Task controls
    document.querySelectorAll('#btn-add-task, #btn-add-task-empty').forEach(el => {
        el.addEventListener('click', () => taskModal.classList.add('show'));
    });

    // Note controls
    document.querySelectorAll('#btn-add-note, #btn-add-note-empty').forEach(el => {
        el.addEventListener('click', () => noteModal.classList.add('show'));
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            taskModal.classList.remove('show');
            noteModal.classList.remove('show');
        });
    });

    // Form Submissions
    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due').value;

        try {
            await addDoc(collection(db, "tasks"), {
                title, priority, dueDate,
                completed: false,
                createdAt: new Date().toISOString()
            });
            taskModal.classList.remove('show');
            e.target.reset();
        } catch (err) { console.error(err); }
    });

    document.getElementById('note-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('note-title').value;
        const content = document.getElementById('note-content').value;
        const color = document.getElementById('note-color').value;

        try {
            await addDoc(collection(db, "notes"), {
                title, content, color,
                pinned: false,
                createdAt: new Date().toISOString()
            });
            noteModal.classList.remove('show');
            e.target.reset();
        } catch (err) { console.error(err); }
    });
}

function renderTasks() {
    const container = document.getElementById('task-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (tasks.length > 0) {
        document.getElementById('btn-add-task-empty').style.display = 'none';
    } else {
        document.getElementById('btn-add-task-empty').style.display = 'flex';
    }

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="custom-checkbox" onclick="toggleTask('${task.id}', ${task.completed})">
                ${task.completed ? '<i class="ph ph-check"></i>' : ''}
            </div>
            <div class="task-content">
                <h4>${task.title}</h4>
                <div class="task-meta">
                    <span class="pill-tag priority-${task.priority}">${task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Trung bình' : 'Thấp'}</span>
                    ${task.dueDate ? `<span><i class="ph ph-calendar"></i> ${task.dueDate}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-task" onclick="deleteTask('${task.id}')"><i class="ph ph-trash"></i></button>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderNotes() {
    const container = document.getElementById('notes-grid-container');
    if (!container) return;

    // Keep the "Add" button
    const addButton = document.getElementById('btn-add-note-empty');
    container.innerHTML = '';
    container.appendChild(addButton);

    const colorMap = {
        'mint': '#E0F7EF',
        'blue': '#EEF3FF',
        'yellow': '#FFF8E6',
        'white': '#FFFFFF'
    };

    notes.forEach(note => {
        const item = document.createElement('div');
        item.className = `note-item ${note.pinned ? 'pinned' : ''}`;
        item.style.backgroundColor = colorMap[note.color] || '#FFFFFF';
        item.innerHTML = `
            <div class="note-header">
                <h4>${note.title || 'Ghi chú'}</h4>
                <div class="note-pin ${note.pinned ? 'active' : ''}" onclick="toggleNotePin('${note.id}', ${note.pinned})">
                    <i class="ph ph-push-pin${note.pinned ? '-fill' : ''}"></i>
                </div>
            </div>
            <div class="note-content">${note.content}</div>
            <div class="note-footer">
                <span>${new Date(note.createdAt).toLocaleDateString('vi-VN')}</span>
                <button class="btn-task" onclick="deleteNote('${note.id}')"><i class="ph ph-trash"></i></button>
            </div>
        `;
        container.insertBefore(item, addButton);
    });
}

// Global functions for inline onclick handlers
window.toggleTask = async (id, current) => {
    try { await updateDoc(doc(db, "tasks", id), { completed: !current }); } catch (err) { }
};
window.deleteTask = async (id) => {
    if (confirm('Xóa công việc này?')) await deleteDoc(doc(db, "tasks", id));
};
window.toggleNotePin = async (id, current) => {
    try { await updateDoc(doc(db, "notes", id), { pinned: !current }); } catch (err) { }
};
window.deleteNote = async (id) => {
    if (confirm('Xóa ghi chú này?')) await deleteDoc(doc(db, "notes", id));
};

// Start app
document.addEventListener('DOMContentLoaded', init);
