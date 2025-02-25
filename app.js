document.addEventListener('DOMContentLoaded', () => {
    // Fonction pour afficher les notifications
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animation d'apparition
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // Disparition après 3 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Éléments DOM
    const loading = document.getElementById('loading');
    const questionsContainer = document.getElementById('questions');
    const submitBtn = document.getElementById('submit');
    const successCountEl = document.getElementById('successCount');
    const failureCountEl = document.getElementById('failureCount');
    const totalScoreEl = document.getElementById('totalScore');
    const aiNameInput = document.getElementById('ai-name');
    const resultsSection = document.getElementById('results');

    // Variables globales
    let currentBenchmarkType = 'code';
    let currentQuestions = [];

    // Configuration initiale
    loading.style.display = 'flex';
    submitBtn.disabled = true;
    resultsSection.classList.add('hidden');

    // Validation du nom de l'IA
    aiNameInput.addEventListener('input', validateForm);

    // Bouton de vérification de disponibilité du nom
    const checkNameBtn = document.createElement('button');
    checkNameBtn.id = 'check-name-btn';
    checkNameBtn.textContent = 'Vérifier disponibilité';
    checkNameBtn.className = 'check-name-btn';
    aiNameInput.parentNode.insertBefore(checkNameBtn, aiNameInput.nextSibling);

    // Gestion du clic sur le bouton de vérification
    checkNameBtn.addEventListener('click', async () => {
      const name = aiNameInput.value.trim();
      if (!name) {
        showNotification('Veuillez entrer un nom avant de vérifier', 'warning');
        return;
      }

      // Ajout d'un indicateur de chargement
      checkNameBtn.disabled = true;
      checkNameBtn.innerHTML = `
        <div class="spinner"></div>
        <span>Vérification en cours...</span>
      `;

      try {
        const response = await fetch(
          `http://localhost:3250/api/results/check-name?name=${encodeURIComponent(name)}`
        );
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Trop de requêtes, veuillez réessayer plus tard');
          }
          throw new Error(`Erreur serveur (${response.status})`);
        }
        
        const { exists } = await response.json();
        if (exists) {
          showNotification('⚠️ Ce nom existe déjà dans l\'historique !', 'error');
          submitBtn.disabled = true;
          aiNameInput.classList.add('invalid');
        } else {
          showNotification('✅ Nom disponible', 'success');
          submitBtn.disabled = false;
          aiNameInput.classList.remove('invalid');
        }

      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        showNotification(`Erreur : ${error.message}`, 'error');
        
        // Tentative de reconnexion après délai
        setTimeout(() => {
          showNotification('Tentative de reconnexion...', 'info');
          checkNameBtn.click();
        }, 5000);
      } finally {
        // Restauration du bouton
        checkNameBtn.disabled = false;
        checkNameBtn.innerHTML = 'Vérifier disponibilité';
      }
    });

    // Gestion des onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBenchmarkType = btn.dataset.type;
            loadQuestions(currentBenchmarkType);
        });
    });

    function validateForm() {
        submitBtn.disabled = !aiNameInput.value.trim();
    }

    // Chargement des questions
    async function loadQuestions(type) {
        loading.style.display = 'flex';
        questionsContainer.innerHTML = '';
        resultsSection.classList.add('hidden');

        try {
            const response = await fetch(`http://localhost:3250/api/questions/${type}`);
            if (!response.ok) throw new Error('Échec du chargement');
            
            const questions = await response.json();
            currentQuestions = questions;
            
            questions.forEach((question, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question-card';
                questionDiv.innerHTML = `
                    <div class="question-content">
                        <span class="question-number">Question ${index + 1}</span>
                        <p>${question.question}</p>
                        <small class="question-type">${question.type}</small>
                    </div>
                    <div class="question-options">
                        <label class="option success-option">
                            <input type="radio" name="q${index}" value="success" required>
                            <span>Réussite</span>
                        </label>
                        <label class="option failure-option">
                            <input type="radio" name="q${index}" value="failure" required>
                            <span>Échec</span>
                        </label>
                    </div>
                `;

                questionDiv.querySelectorAll('input[type="radio"]').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        const parent = e.target.closest('.question-card');
                        parent.classList.remove('selected-success', 'selected-failure');
                        if (e.target.value === 'success') {
                            parent.classList.add('selected-success');
                        } else {
                            parent.classList.add('selected-failure');
                        }
                    });
                });

                questionsContainer.appendChild(questionDiv);
            });
        } catch (error) {
            loading.innerHTML = `Erreur : ${error.message}`;
            console.error(error);
        } finally {
            loading.style.display = 'none';
        }
    }

    // Gestion du calcul et de l'enregistrement des scores
    submitBtn.addEventListener('click', async () => {
        const questions = document.querySelectorAll('.question-card');
        let successCount = 0;
        const totalQuestions = questions.length;

        questions.forEach(question => {
            const selected = question.querySelector('input:checked');
            if(selected && selected.value === 'success') successCount++;
        });

        const failureCount = totalQuestions - successCount;
        const successPercentage = totalQuestions > 0 
            ? ((successCount / totalQuestions) * 100).toFixed(2)
            : 0;

        // Mise à jour de l'interface
        successCountEl.textContent = successCount;
        failureCountEl.textContent = failureCount;
        totalScoreEl.textContent = `${successPercentage}%`;
        resultsSection.classList.remove('hidden');

        // Enregistrement des résultats
        try {
            const response = await fetch('http://localhost:3250/api/results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ai_name: aiNameInput.value.trim(),
                    benchmark_type: currentBenchmarkType,
                    score: parseFloat(successPercentage)
                })
            });

            if (!response.ok) throw new Error('Erreur lors de l\'enregistrement des résultats');
            
            // Mise à jour du graphique
            updateChart(successCount, failureCount);
            
            // Afficher une notification
            showNotification('Résultats enregistrés avec succès !', 'success');
            
            // Proposer la redirection après un délai
            setTimeout(() => {
                showNotification('Vous pouvez consulter l\'historique complet en cliquant sur le lien en haut à droite.', 'info');
            }, 2000);
            
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de l\'enregistrement des résultats');
        }
    });

    // Fonction de mise à jour du graphique
    function updateChart(success, failure) {
        const ctx = document.getElementById('successChart').getContext('2d');
        
        if(window.myChart) window.myChart.destroy();
        
        window.myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Réussites', 'Échecs'],
                datasets: [{
                    data: [success, failure],
                    backgroundColor: ['#00C853', '#D50000'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { enabled: true }
                }
            }
        });
    }

    // Chargement initial
    loadQuestions(currentBenchmarkType);

    // Fonction pour réinitialiser le benchmark
    function resetBenchmark() {
        // Réinitialiser les compteurs
        successCountEl.textContent = '0';
        failureCountEl.textContent = '0';
        totalScoreEl.textContent = '0%';

        // Cacher la section des résultats
        resultsSection.classList.add('hidden');

        // Vider les questions
        questionsContainer.innerHTML = '';

        // Réinitialiser les boutons radio (important pour éviter les bugs visuels)
        document.querySelectorAll('.question-card input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });

         document.querySelectorAll('.question-card').forEach(card => {
            card.classList.remove('selected-success', 'selected-failure');
        });

        // Désactiver le bouton de soumission
        submitBtn.disabled = true;

        // Réinitialiser le nom de l'IA
        aiNameInput.value = '';

        //Recharger les questions
        loadQuestions(currentBenchmarkType);

        // Détruire le graphique existant
        if(window.myChart) window.myChart.destroy();

        showNotification('Test réinitialisé !', 'info');
    }

    // Ajout de l'écouteur pour le bouton de réinitialisation
    document.getElementById('resetBtn').addEventListener('click', resetBenchmark);

});
