class RankingManager {
    constructor() {
        this.tableBody = document.getElementById('ranking-body');
        this.chartCanvas = document.getElementById('ranking-chart');
        this.chart = null;
        
        this.loadStats();
        
        // Ajout de l'écouteur sur le sélecteur
        const typeFilter = document.getElementById('benchmark-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.loadData());
        }
        
        this.loadData();
    }

    async loadData() {
        try {
            const typeFilter = document.getElementById('benchmark-type-filter');
            const type = typeFilter ? typeFilter.value : 'all';
            
            const response = await fetch(`/api/results/ranking${type !== 'all' ? `?type=${type}` : ''}`);
            if (!response.ok) throw new Error('Erreur lors du chargement du classement');
            
            const results = await response.json();
            this.renderTable(results);
        } catch (error) {
            console.error('Erreur:', error);
            this.showError('Impossible de charger le classement. Veuillez réessayer plus tard.');
        }
    }

    renderTable(results) {
        // Limiter aux 10 premiers résultats pour le graphique
        const topResults = results.slice(0, 10);
        
        // Mettre à jour le tableau
        const rows = [];
        for (let index = 0; index < results.length; index++) {
            const result = results[index];
            let badge = '';
            if (index === 0) badge = '<span class="badge gold">Or</span>';
            if (index === 1) badge = '<span class="badge silver">Argent</span>';
            if (index === 2) badge = '<span class="badge bronze">Bronze</span>';
            const scorePercentage = (result.score / totalPossibleScore) * 100;
            
            if (scorePercentage >= 90) {
                badge = '<span class="badge grand-maitre">Grand Maître</span>';
            } else if (scorePercentage >= 70) {
                badge = '<span class="badge challenger">Bon Challenger</span>';
            } else if (scorePercentage >= 50) {
                badge = '<span class="badge deception">Quelle déception !</span>';
            } else if (scorePercentage >= 30) {
                badge = '<span class="badge loin-compte">Loin du compte</span>';
            } else if (scorePercentage >= 10) {
                badge = '<span class="badge mediocre">Médiocre (et c\'est un compliment)</span>';
            } else {
                badge = '<span class="badge a-chier">Vraiment à chier</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML =
                '<td>' + (index + 1) + '</td>' +
                '<td>' + badge + '</td>' +
                '<td>' + result.ai_name + '</td>' +
                '<td>' + (result.benchmark_type === 'code' ? 'Benchmark Code' : 'Benchmark Raisonnement') + '</td>' +
                '<td>' + result.score.toFixed(1) + '%</td>' +
                '<td>' + new Date(result.created_at).toLocaleString('fr-FR') + '</td>';
            rows.push(row.outerHTML);
        }
        this.tableBody.innerHTML = rows.join('');
        
        // Créer le graphique si Chart.js est disponible
        if (typeof Chart !== 'undefined' && this.chartCanvas) {
            if (this.chart) {
                this.chart.destroy();
            }
            
            const labels = topResults.map(result => result.ai_name);
            const data = topResults.map(result => result.score);
            
            this.chart = new Chart(this.chartCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Score (%)',
                        data: data,
                        backgroundColor: '#2962FF',
                        borderColor: '#1B48B3',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Score (%)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Nom de l\'IA'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const result = topResults[context.dataIndex];
                                    return `Type: ${result.benchmark_type}\nDate: ${new Date(result.created_at).toLocaleString('fr-FR')}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Erreur lors du chargement des stats');
            
            const stats = await response.json();
            document.getElementById('total-benchmarks').textContent = stats.total;
            document.getElementById('average-score').textContent = `${stats.average.toFixed(1)}%`;
            document.getElementById('top-score').textContent = `${stats.topScore.toFixed(1)}%`;
        } catch (error) {
            console.error('Erreur:', error);
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
}

// Initialisation
const rankingManager = new RankingManager();