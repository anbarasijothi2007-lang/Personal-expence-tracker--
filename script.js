// PERSONAL EXPENSE TRACKER
// JavaScript (app.js)

const STORAGE_KEY = "expenseTrackerTransactions";
const CATEGORY_KEY = "expenseTrackerCategories";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let categories = JSON.parse(localStorage.getItem(CATEGORY_KEY)) || [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Education",
    "Health",
    "Entertainment",
    "Salary",
    "Other"
];

let editingId = null;
let expenseChart = null;

// Save data to Local Storage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

// Get HTML element
function getElement(id) {
    return document.getElementById(id);
}

// Format amount as Indian currency
function formatAmount(amount) {
    return Number(amount).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR"
    });
}

// Add a new transaction
function addTransaction(type, amount, date, category, description) {
    const transaction = {
        id: Date.now().toString(),
        type: type,
        amount: Number(amount),
        date: date,
        category: category,
        description: description
    };

    transactions.push(transaction);

    saveData();
    updateDashboard();
}

// Edit an existing transaction
function editTransaction(id, updatedData) {
    transactions = transactions.map(transaction => {
        if (transaction.id === id) {
            return {
                ...transaction,
                ...updatedData,
                amount: Number(updatedData.amount)
            };
        }

        return transaction;
    });

    saveData();
    updateDashboard();
}

// Delete a transaction
function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) {
        return;
    }

    transactions = transactions.filter(
        transaction => transaction.id !== id
    );

    saveData();
    updateDashboard();
}

// Calculate total income
function getTotalIncome() {
    return transactions
        .filter(transaction => transaction.type === "income")
        .reduce((total, transaction) => total + transaction.amount, 0);
}

// Calculate total expenses
function getTotalExpenses() {
    return transactions
        .filter(transaction => transaction.type === "expense")
        .reduce((total, transaction) => total + transaction.amount, 0);
}

// Calculate current balance
function getBalance() {
    return getTotalIncome() - getTotalExpenses();
}

// Get monthly summary
function getMonthlySummary(year, month) {
    const monthlyTransactions = transactions.filter(transaction => {
        const date = new Date(transaction.date + "T00:00:00");

        return (
            date.getFullYear() === year &&
            date.getMonth() === month
        );
    });

    const income = monthlyTransactions
        .filter(transaction => transaction.type === "income")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const expenses = monthlyTransactions
        .filter(transaction => transaction.type === "expense")
        .reduce((total, transaction) => total + transaction.amount, 0);

    return {
        income,
        expenses,
        balance: income - expenses
    };
}

// Search and filter transactions
function filterTransactions(options = {}) {
    const {
        search = "",
        category = "",
        type = "",
        startDate = "",
        endDate = ""
    } = options;

    return transactions.filter(transaction => {
        const matchesSearch =
            transaction.description.toLowerCase().includes(search.toLowerCase()) ||
            transaction.category.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
            !category || transaction.category === category;

        const matchesType =
            !type || transaction.type === type;

        const matchesStartDate =
            !startDate || transaction.date >= startDate;

        const matchesEndDate =
            !endDate || transaction.date <= endDate;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesType &&
            matchesStartDate &&
            matchesEndDate
        );
    });
}

// Display transactions
function displayTransactions(list = transactions) {
    const container = getElement("transaction-list");

    if (!container) return;

    if (list.length === 0) {
        container.innerHTML =
            '<tr><td colspan="7">No transactions found.</td></tr>';
        return;
    }

    container.innerHTML = list.map(transaction => `
        <tr>
            <td>${escapeHTML(transaction.date)}</td>
            <td>${escapeHTML(transaction.type)}</td>
            <td>${escapeHTML(transaction.category)}</td>
            <td>${escapeHTML(transaction.description)}</td>
            <td>${formatAmount(transaction.amount)}</td>
            <td>
                <button onclick="startEdit('${transaction.id}')">
                    Edit
                </button>

                <button onclick="deleteTransaction('${transaction.id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

// Protect HTML output from user-entered text
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Update income, expenses and balance
function updateSummary() {
    const incomeElement = getElement("total-income");
    const expensesElement = getElement("total-expenses");
    const balanceElement = getElement("balance");

    if (incomeElement) {
        incomeElement.textContent = formatAmount(getTotalIncome());
    }

    if (expensesElement) {
        expensesElement.textContent = formatAmount(getTotalExpenses());
    }

    if (balanceElement) {
        balanceElement.textContent = formatAmount(getBalance());
    }

    displayMonthlySummary();
}

// Display monthly financial summaries
function displayMonthlySummary() {
    const container = getElement("monthly-summary");

    if (!container) return;

    const months = {};

    transactions.forEach(transaction => {
        const month = transaction.date.slice(0, 7);

        if (!months[month]) {
            months[month] = {
                income: 0,
                expenses: 0
            };
        }

        if (transaction.type === "income") {
            months[month].income += transaction.amount;
        } else {
            months[month].expenses += transaction.amount;
        }
    });

    const sortedMonths = Object.keys(months).sort().reverse();

    container.innerHTML = sortedMonths.map(month => `
        <div class="monthly-summary-item">
            <h4>${escapeHTML(month)}</h4>

            <p>Income: ${formatAmount(months[month].income)}</p>

            <p>Expenses: ${formatAmount(months[month].expenses)}</p>

            <p>Balance: ${
                formatAmount(
                    months[month].income - months[month].expenses
                )
            }</p>
        </div>
    `).join("") || "<p>No monthly data available.</p>";
}

// Update expense chart by category
function updateExpenseChart() {
    const canvas = getElement("expense-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const categoryTotals = {};

    transactions
        .filter(transaction => transaction.type === "expense")
        .forEach(transaction => {
            categoryTotals[transaction.category] =
                (categoryTotals[transaction.category] || 0) +
                transaction.amount;
        });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    if (expenseChart) {
        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = values;
        expenseChart.update();
        return;
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: labels,
            datasets: [{
                label: "Expenses by Category",
                data: values
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Manage expense categories
function addCategory(category) {
    category = category.trim();

    if (!category) return;

    const exists = categories.some(
        item => item.toLowerCase() === category.toLowerCase()
    );

    if (exists) {
        alert("Category already exists.");
        return;
    }

    categories.push(category);

    saveData();
    displayCategories();
}

// Remove a category
function deleteCategory(category) {
    const isUsed = transactions.some(
        transaction => transaction.category === category
    );

    if (isUsed) {
        alert("This category is being used by a transaction.");
        return;
    }

    categories = categories.filter(item => item !== category);

    saveData();
    displayCategories();
}

// Display categories
function displayCategories() {
    const categoryList = getElement("category-list");

    if (categoryList) {
        categoryList.innerHTML = categories.map(category => `
            <li>
                ${escapeHTML(category)}

                <button
                    onclick="deleteCategory('${escapeHTML(category)}')">
                    Remove
                </button>
            </li>
        `).join("");
    }

    ["category", "filter-category"].forEach(id => {
        const select = getElement(id);

        if (!select) return;

        const previousValue = select.value;

        select.innerHTML = id === "filter-category"
            ? '<option value="">All Categories</option>'
            : "";

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;

            select.appendChild(option);
        });

        if (categories.includes(previousValue)) {
            select.value = previousValue;
        }
    });
}

// Load transaction into the form for editing
function startEdit(id) {
    const transaction = transactions.find(
        item => item.id === id
    );

    if (!transaction) return;

    editingId = id;

    const fields = {
        "transaction-type": transaction.type,
        "amount": transaction.amount,
        "date": transaction.date,
        "category": transaction.category,
        "description": transaction.description
    };

    Object.entries(fields).forEach(([id, value]) => {
        if (getElement(id)) {
            getElement(id).value = value;
        }
    });

    const submitButton = getElement("submit-button");

    if (submitButton) {
        submitButton.textContent = "Update Transaction";
    }

    const form = getElement("transaction-form");

    if (form) {
        form.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

// Handle transaction form submission
function handleFormSubmit(event) {
    event.preventDefault();

    const type = getElement("transaction-type")?.value;
    const amount = Number(getElement("amount")?.value);
    const date = getElement("date")?.value;
    const category = getElement("category")?.value;
    const description = getElement("description")?.value.trim() || "";

    if (!["income", "expense"].includes(type)) {
        alert("Please select a transaction type.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter an amount greater than zero.");
        return;
    }

    if (!date || !category) {
        alert("Please enter the date and category.");
        return;
    }

    const transactionData = {
        type,
        amount,
        date,
        category,
        description
    };

    if (editingId) {
        editTransaction(editingId, transactionData);
        editingId = null;
    } else {
        addTransaction(type, amount, date, category, description);
    }

    event.target.reset();

    const submitButton = getElement("submit-button");

    if (submitButton) {
        submitButton.textContent = "Add Transaction";
    }

    if (getElement("date")) {
        getElement("date").value = new Date().toISOString().slice(0, 10);
    }

    updateDashboard();
}

// Apply search and filters
function applyFilters() {
    const filtered = filterTransactions({
        search: getElement("search-input")?.value || "",
        category: getElement("filter-category")?.value || "",
        type: getElement("filter-type")?.value || "",
        startDate: getElement("start-date")?.value || "",
        endDate: getElement("end-date")?.value || ""
    });

    displayTransactions(filtered);
}

// Clear all filters
function clearFilters() {
    [
        "search-input",
        "filter-category",
        "filter-type",
        "start-date",
        "end-date"
    ].forEach(id => {
        if (getElement(id)) {
            getElement(id).value = "";
        }
    });

    displayTransactions();
}

// Refresh the dashboard after every change
function updateDashboard() {
    saveData();
    displayTransactions();
    updateSummary();
    updateExpenseChart();
    displayCategories();
}

// Set up the application
document.addEventListener("DOMContentLoaded", () => {
    const form = getElement("transaction-form");

    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }

    [
        "search-input",
        "filter-category",
        "filter-type",
        "start-date",
        "end-date"
    ].forEach(id => {
        const element = getElement(id);

        if (element) {
            element.addEventListener("input", applyFilters);
            element.addEventListener("change", applyFilters);
        }
    });

    const categoryForm = getElement("category-form");

    if (categoryForm) {
        categoryForm.addEventListener("submit", event => {
            event.preventDefault();

            const input = getElement("category-name");

            if (input) {
                addCategory(input.value);
                input.value = "";
            }
        });
    }

    const clearButton = getElement("clear-filters");

    if (clearButton) {
        clearButton.addEventListener("click", clearFilters);
    }

    const dateInput = getElement("date");

    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    updateDashboard();
});