document.addEventListener('DOMContentLoaded', () => {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    fetch('questions.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            return response.text();
        })
        .then(data => {
            const questionsDiv = document.getElementById('questions');
            const questions = data.split('\n').filter(q => q.trim() !== '');
            questions.forEach((question, index) => {
                const div = document.createElement('div');
                div.className = 'question';
                div.innerHTML = `
                    <p>${question}</p>
                    <label class="option" for="q${index}Success">
                        <input type="radio" name="q${index}" value="success" required id="q${index}Success">
                        <span>Réussite</span>
                    </label>
                    <label class="option" for="q${index}Failure">
                        <input type="radio" name="q${index}" value="failure" required id="q${index}Failure">
                        <span>Échec</span>
                    </label>
                `;
                div.addEventListener('change', function(event) {
                    if (event.target.type === 'radio') {
                        if (event.target.value === 'success') {
                            div.classList.remove('failure');
                            div.classList.add('success');
                        } else if (event.target.value === 'failure') {
                            div.classList.remove('success');
                            div.classList.add('failure');
                        }
                    }
                });
                questionsDiv.appendChild(div);
            });
            loading.style.display = 'none';
        })
        .catch(error => {
            loading.textContent = 'Erreur lors du chargement des questions. Veuillez réessayer.';
            console.error('Error loading questions:', error);
        });
});

document.getElementById('submit').addEventListener('click', () => {
    const questionsDiv = document.getElementById('questions');
    const questionElements = questionsDiv.getElementsByClassName('question');
    let successCount = 0;
    const totalQuestions = questionElements.length;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    for (let i = 0; i < totalQuestions; i++) {
        const radioSuccess = document.querySelector(`input[name="q${i}"][value="success"]`);
        const radioFailure = document.querySelector(`input[name="q${i}"][value="failure"]`);
        if (radioSuccess.checked) {
            successCount++;
        }
    }

    const successPercentage = (successCount / totalQuestions) * 100;
    const failureCount = totalQuestions - successCount;
    const failurePercentage = 100 - successPercentage;

    const canvas = document.createElement('canvas');
    canvas.id = 'successChart';
    canvas.width = 400;
    canvas.height = 400;
    resultsDiv.appendChild(canvas);

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Réussite', 'Échec'],
            datasets: [{
                data: [successCount, failureCount],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });

    const percentageDiv = document.createElement('div');
    percentageDiv.innerHTML = `Pourcentage de réussite: ${successPercentage.toFixed(2)}%`;
    resultsDiv.appendChild(percentageDiv);
});
