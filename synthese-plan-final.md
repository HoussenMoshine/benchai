# Plan d'implémentation - Séparation des benchmarks par type

## Modifications Backend
1. **Endpoint /api/results/ranking**
   - Ajouter paramètre `type` (optionnel)
   - Modifier la requête SQL :
   ```sql
   SELECT ai_name, benchmark_type, score, created_at
   FROM results
   WHERE (? IS NULL OR benchmark_type = ?)
   ORDER BY score DESC
   LIMIT 100
   ```

## Modifications Frontend
1. **ranking.html**
   - Ajouter un sélecteur de type :
   ```html
   <div class="filter-container">
     <label>Type de benchmark :</label>
     <select id="benchmark-type-filter" class="form-control">
       <option value="all">Tous types</option>
       <option value="code">Benchmark Code</option>
       <option value="raisonnement">Benchmark Raisonnement</option>
     </select>
   </div>
   ```

2. **ranking.js**
   - Modifier loadData() :
   ```javascript
   async loadData() {
     const typeFilter = document.getElementById('benchmark-type-filter').value;
     const response = await fetch(`/api/results/ranking?type=${typeFilter !== 'all' ? typeFilter : ''}`);
     // ... reste inchangé
   }
   ```
   - Ajouter écouteur d'événement :
   ```javascript
   document.getElementById('benchmark-type-filter').addEventListener('change', () => this.loadData());
   ```

## Plan de test
1. **Cas à vérifier :**
   - Filtrage 'code' : n'affiche que les résultats code
   - Filtrage 'raisonnement' : idem pour raisonnement
   - Pas de filtre : comportement actuel
   - Type invalide : retourne une erreur 400

2. **Validation :**
   - Vérifier le nombre de résultats affichés
   - Confirmer la cohérence des données avec la base

## Documentation associée
1. **progres-benchai.md**
   - Section 4.1 : Marquer comme "en cours"
   - Ajouter les détails techniques sous 5. Détails Techniques

2. **API.md (à créer)**
   - Décrire le nouveau paramètre 'type'
   - Exemple de requête valide