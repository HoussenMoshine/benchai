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
        const questionResultDiv = document.createElement('div');
        questionResultDiv.className = radioSuccess.checked ? 'success' : 'failure';
        questionResultDiv.textContent = radioSuccess.checked ? 'Réussite' : 'Échec';
        resultsDiv.appendChild(questionResultDiv);
        if (radioSuccess.checked) {
            successCount++;
        }
    }

    const successPercentage = (successCount / totalQuestions) * 100;
    const percentageDiv = document.createElement('div');
    percentageDiv.innerHTML = `Pourcentage de réussite: ${successPercentage.toFixed(2)}%`;
    resultsDiv.appendChild(percentageDiv);
});
