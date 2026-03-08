// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [
    { id: '1', type: 'income', amount: 35000000, category: 'Lương', date: new Date().toISOString(), note: 'Lương tháng 10' },
    { id: '2', type: 'expense', amount: 850000, category: 'Mua sắm', date: new Date().toISOString(), note: 'Siêu thị WinMart' },
    { id: '3', type: 'expense', amount: 125000, category: 'Di chuyển', date: new Date().toISOString(), note: 'Grab ride' },
    { id: '4', type: 'expense', amount: 2400000, category: 'Tiện ích', date: new Date().toISOString(), note: 'Tiền điện EVN' }
];

let myChart = null;

// DOM Elements
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const recentTransactionsList = document.getElementById('recent-transactions-list');
const fullTransactionsList = document.getElementById('full-transactions-list');
const budgetListEl = document.getElementById('budget-list');

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

function generateID() {
    return Math.floor(Math.random() * 100000000).toString();
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
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

    // Fallback logic cho hiển thị tên
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
                <button class="btn btn-delete" onclick="deleteTransaction('${transaction.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0;margin-top:4px;font-size:1.1rem">
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
    totalBalanceEl.innerText = formatCurrency(balance);
    totalIncomeEl.innerText = formatCurrency(income);
    totalExpenseEl.innerText = formatCurrency(expense);

    // Render Lists
    renderRecentTransactions();
    renderFullTransactions('all');
    renderBudgets();

    // Update Chart
    updateChart(income, expense);
}

function renderRecentTransactions() {
    recentTransactionsList.innerHTML = '';
    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

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
    let filtered = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

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

// Giả lập Mock budgets để giao diện giống reference
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

    // Lấy chi tiêu theo danh mục
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

// Delete Transaction
window.deleteTransaction = function (id) {
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateLocalStorage();
        updateUI();
    }
}

// Chart Visualization
function updateChart(income, expense) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    // Group expenses by day (Mock last 7 days chart)
    const last7Days = [];
    const expenseData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = `T${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`;
        last7Days.push(dateStr);

        // Random data for visual effect, normally we filter transactions here
        // Since we want to replicate the reference chart look
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
                backgroundColor: 'rgba(82, 208, 130, 0.4)', // light green
                hoverBackgroundColor: 'rgba(82, 208, 130, 1)', // solid green
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
                    display: false, // hide y axis like reference
                    grid: { display: false, drawBorder: false }
                }
            }
        }
    });

    // Make last bar active color like reference
    if (myChart.data.datasets[0].backgroundColor instanceof Array) {
        // already array
    } else {
        const bgColors = Array(7).fill('rgba(82, 208, 130, 0.4)');
        bgColors[6] = 'rgba(82, 208, 130, 1)'; // last one solid
        myChart.data.datasets[0].backgroundColor = bgColors;
    }
    myChart.update();
}


// Initialization setup
function init() {
    updateUI();

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

    // Form submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const type = document.querySelector('input[name="type"]:checked').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const note = document.getElementById('note').value;

            if (!amount || !category || !date) return;

            const newTransaction = {
                id: generateID(),
                type,
                amount,
                category,
                date: new Date(date).toISOString(),
                note
            };

            transactions.push(newTransaction);
            updateLocalStorage();
            updateUI();

            modal.classList.remove('show');
            form.reset();
        });
    }

    // Navigation and Routing
    const navItems = document.querySelectorAll('.nav-links li');
    const pages = document.querySelectorAll('.page');

    const viewAllBtn = document.getElementById('view-all-btn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Trigger click on 'Giao dịch' navigation item
            navItems.forEach(item => {
                if (item.getAttribute('data-page') === 'transactions') item.click();
            });
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active link
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show corresponding page
            const targetPage = item.getAttribute('data-page');
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `page-${targetPage}`) {
                    page.classList.add('active');
                }
            });
        });
    });

    // Filter changes
    const filterType = document.getElementById('filter-type');
    if (filterType) {
        filterType.addEventListener('change', (e) => {
            renderFullTransactions(e.target.value);
        });
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
