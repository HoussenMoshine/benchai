class HistoryManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 0;
        this.currentFilters = {
            search: '',
            type: 'all',
            sort: 'date-desc'
        };
        this.selectedId = null;
        this.selectedIds = new Set();

        this.initializeElements();
        this.attachEventListeners();
        this.loadData();
    }

    initializeElements() {
        // Filtres
        this.searchInput = document.getElementById('search-ai');
        this.typeFilter = document.getElementById('type-filter');
        this.sortBy = document.getElementById('sort-by');

        // Tableau
        this.tableBody = document.getElementById('benchmarks-body');

        // Pagination
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.pageNumbers = document.getElementById('page-numbers');

        // Modal
        this.deleteModal = document.getElementById('delete-modal');
        this.confirmDelete = document.getElementById('confirm-delete');
        this.cancelDelete = document.getElementById('cancel-delete');

        // Sélection
        this.selectAllCheckbox = document.getElementById('select-all');
        
        // Export & Delete
        this.exportCsv = document.getElementById('export-csv');
        this.exportPdf = document.getElementById('export-pdf');
        this.deleteSelected = document.getElementById('delete-selected');
    }

    attachEventListeners() {
        // Filtres
        this.searchInput.addEventListener('input', debounce(() => {
            this.currentFilters.search = this.searchInput.value;
            this.currentPage = 1;
            this.loadData();
        }, 300));

        this.typeFilter.addEventListener('change', () => {
            this.currentFilters.type = this.typeFilter.value;
            this.currentPage = 1;
            this.loadData();
        });

        this.sortBy.addEventListener('change', () => {
            this.currentFilters.sort = this.sortBy.value;
            this.currentPage = 1;
            this.loadData();
        });

        // Pagination
        this.prevButton.addEventListener('click', () => this.changePage(this.currentPage - 1));
        this.nextButton.addEventListener('click', () => this.changePage(this.currentPage + 1));

        // Modal
        this.confirmDelete.addEventListener('click', () => this.deleteBenchmark());
        this.cancelDelete.addEventListener('click', () => this.hideModal());

        // Export
        // Sélection
        this.selectAllCheckbox.addEventListener('change', () => {
            if (this.selectAllCheckbox.checked) {
                this.selectAll();
            } else {
                this.clearSelection();
            }
        });

        // Export & Delete
        this.exportCsv.addEventListener('click', () => this.exportData('csv'));
        this.exportPdf.addEventListener('click', () => this.exportData('pdf'));
        this.deleteSelected.addEventListener('click', () => this.deleteSelectedBenchmarks());
    }

    async loadData() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.currentFilters.search,
                type: this.currentFilters.type,
                sort: this.currentFilters.sort
            });

            const response = await fetch(`/api/results/filter?${queryParams}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.message);

            this.renderTable(data.results);
            this.updatePagination(data.totalPages);
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            this.showError('Impossible de charger les données. Veuillez réessayer plus tard.');
        }
    }

    renderTable(results) {
        this.tableBody.innerHTML = results.map(result => `
            <tr>
                <td>
                    <input type="checkbox"
                           class="benchmark-checkbox"
                           data-id="${result.id}"
                           ${this.selectedIds.has(result.id) ? 'checked' : ''}
                           onchange="historyManager.toggleSelection(${result.id})">
                </td>
                <td>${new Date(result.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</td>
                <td>${escapeHtml(result.ai_name)}</td>
                <td>${result.benchmark_type === 'code' ? 'Benchmark Code' : 'Benchmark Raisonnement'}</td>
                <td>${result.score.toFixed(1)}%</td>
                <td>
                    <button class="action-btn danger-btn" onclick="historyManager.showDeleteConfirmation(${result.id})">
                        Supprimer
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePagination(totalPages) {
        this.totalPages = totalPages;
        this.prevButton.disabled = this.currentPage === 1;
        this.nextButton.disabled = this.currentPage === totalPages;

        // Mise à jour des numéros de page
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || // Première page
                i === totalPages || // Dernière page
                (i >= this.currentPage - 1 && i <= this.currentPage + 1) // Pages autour de la page courante
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        this.pageNumbers.innerHTML = pages.map(page => {
            if (page === '...') {
                return '<span class="page-ellipsis">...</span>';
            }
            return `
                <button class="page-number ${page === this.currentPage ? 'active' : ''}"
                        onclick="historyManager.changePage(${page})">
                    ${page}
                </button>
            `;
        }).join('');
    }

    changePage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadData();
    }

    showDeleteConfirmation(id) {
        this.selectedId = id;
        this.deleteModal.classList.remove('hidden');
        setTimeout(() => {
            this.deleteModal.style.opacity = '1';
            this.deleteModal.style.transform = 'translateY(0)';
        }, 10);
    }

    hideModal() {
        this.deleteModal.style.opacity = '0';
        this.deleteModal.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            this.deleteModal.classList.add('hidden');
            this.selectedId = null;
        }, 300);
    }

    async deleteBenchmark() {
        if (!this.selectedId) return;

        try {
            const response = await fetch(`/api/results/${this.selectedId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            this.hideModal();
            this.loadData();
            this.showSuccess('Benchmark supprimé avec succès');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            this.showError('Impossible de supprimer le benchmark. Veuillez réessayer plus tard.');
        }
    }

    toggleSelection(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('.benchmark-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedIds.add(Number(checkbox.dataset.id));
        });
    }

    clearSelection() {
        const checkboxes = document.querySelectorAll('.benchmark-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedIds.clear();
    }

    async deleteSelectedBenchmarks() {
        try {
            const selectedIds = Array.from(this.selectedIds);
            
            if (selectedIds.length === 0) {
                return this.showError('Veuillez sélectionner au moins un benchmark à supprimer');
            }

            const response = await fetch('/api/results/delete-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de la suppression');
            }

            this.clearSelection();
            this.loadData();
            this.showSuccess('Benchmarks supprimés avec succès');
        } catch (error) {
            console.error('Erreur lors de la suppression multiple:', error);
            this.showError('Impossible de supprimer les benchmarks sélectionnés');
        }
    }

    async exportData(format) {
        try {
            if (this.selectedIds.size === 0) {
                return this.showError('Veuillez sélectionner au moins un benchmark à exporter');
            }

            this.showSuccess(`Export en ${format.toUpperCase()} en cours...`);
            
            const response = await fetch('/api/results/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    format,
                    ids: Array.from(this.selectedIds)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'export');
            }
            
            if (format === 'csv') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `benchmarks_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            } else if (format === 'pdf') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.showError(`Impossible d'exporter les données en ${format.toUpperCase()}`);
        }
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Utilitaires
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Initialisation
const historyManager = new HistoryManager();