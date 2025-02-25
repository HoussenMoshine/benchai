const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');

// Création de l'application Express
const app = express();
const port = 3250;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Configuration de la base de données SQLite
const db = new sqlite3.Database(path.join(__dirname, 'benchai.db'), (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('Connecté à la base de données SQLite');
        // Création de la table results si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ai_name TEXT NOT NULL,
            benchmark_type TEXT NOT NULL,
            score REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Création des index pour optimiser les requêtes
        db.run('CREATE INDEX IF NOT EXISTS idx_ai_name ON results(ai_name)');
        db.run('CREATE INDEX IF NOT EXISTS idx_benchmark_type ON results(benchmark_type)');
        db.run('CREATE INDEX IF NOT EXISTS idx_created_at ON results(created_at)');
    }
});

// Promisify db.all et db.run pour utiliser async/await
const dbAll = (query, params) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbRun = (query, params) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

// Route pour obtenir les questions d'un benchmark spécifique
app.get('/api/questions/:benchmarkType', async (req, res) => {
    try {
        const { benchmarkType } = req.params;
        if (!['code', 'raisonnement'].includes(benchmarkType)) {
            return res.status(400).json({ error: 'Type de benchmark invalide' });
        }

        const filePath = path.join(__dirname, 'data', `questions-ia-${benchmarkType}.json`);
        const questions = await fs.readFile(filePath, 'utf-8');
        
        res.setHeader('Cache-Control', 'max-age=3600');
        res.json(JSON.parse(questions));
    } catch (error) {
        console.error('Erreur lors de la lecture des questions:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la lecture des questions' });
    }
});

// Route pour enregistrer les résultats d'un benchmark
app.post('/api/results', (req, res) => {
    const { ai_name, benchmark_type, score } = req.body;

    // Validation basique des données
    if (!ai_name || !benchmark_type || score === undefined) {
        return res.status(400).json({ error: 'Données manquantes' });
    }

    if (!['code', 'raisonnement'].includes(benchmark_type)) {
        return res.status(400).json({ error: 'Type de benchmark invalide' });
    }

    // Insertion dans la base de données
    db.run(
        'INSERT INTO results (ai_name, benchmark_type, score) VALUES (?, ?, ?)',
        [ai_name, benchmark_type, score],
        function(err) {
            if (err) {
                console.error('Erreur lors de l\'enregistrement des résultats:', err);
                return res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement' });
            }
            res.json({ 
                message: 'Résultats enregistrés avec succès',
                resultId: this.lastID 
            });
        }
    );
});

// Route pour le filtrage avancé des résultats
app.get('/api/results/filter', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM results WHERE 1=1';
        const params = [];

        // Filtre par recherche
        if (req.query.search) {
            query += ' AND ai_name LIKE ?';
            params.push(`%${req.query.search}%`);
        }

        // Filtre par type
        if (req.query.type && req.query.type !== 'all') {
            query += ' AND benchmark_type = ?';
            params.push(req.query.type);
        }

        // Tri
        const sortMapping = {
            'date-desc': 'created_at DESC',
            'date-asc': 'created_at ASC',
            'score-desc': 'score DESC',
            'score-asc': 'score ASC'
        };
        query += ` ORDER BY ${sortMapping[req.query.sort] || 'created_at DESC'}`;

        // Comptage total pour la pagination
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
        const [{ count }] = await dbAll(countQuery, params);

        // Ajout de la pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results = await dbAll(query, params);
        
        res.json({
            results,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalResults: count
        });
    } catch (error) {
        console.error('Erreur lors du filtrage des résultats:', error);
        res.status(500).json({ error: 'Erreur serveur lors du filtrage' });
    }
});

// Route pour supprimer un benchmark
app.delete('/api/results/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dbRun('DELETE FROM results WHERE id = ?', [id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Benchmark non trouvé' });
        }
        
        res.json({ message: 'Benchmark supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
    }
});

// Route pour obtenir le classement des benchmarks
app.get('/api/results/ranking', async (req, res) => {
try {
    const { type } = req.query;
    
    if (type && !['code', 'raisonnement'].includes(type)) {
        return res.status(400).json({ error: 'Type de benchmark invalide' });
    }

    const query = `
        SELECT ai_name, benchmark_type, score, created_at
        FROM results
        ${type ? 'WHERE benchmark_type = ?' : ''}
        ORDER BY score DESC
        LIMIT 100
    `;
    
    const rankingResults = await dbAll(query, type ? [type] : []);
    return res.json(rankingResults);
    } catch (error) {
        console.error('Erreur lors de la récupération du classement:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération du classement' });
    }
});

// Route pour supprimer plusieurs benchmarks
app.post('/api/results/delete-multiple', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Aucun benchmark sélectionné' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const query = `DELETE FROM results WHERE id IN (${placeholders})`;
        
        const result = await dbRun(query, ids);
        
        res.json({
            message: `${result.changes} benchmarks supprimés avec succès`
        });
    } catch (error) {
        console.error('Erreur lors de la suppression multiple:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la suppression multiple' });
    }
});

// Route pour vérifier l'existence d'un nom de benchmark
app.get('/api/results/check-name', async (req, res) => {
  const { name } = req.query;
  
  if (!name) {
    return res.status(400).json({ error: 'Le paramètre name est requis' });
  }

  try {
    const result = await dbAll(
      'SELECT 1 FROM results WHERE ai_name = ? LIMIT 1',
      [name]
    );
    res.json({ exists: result.length > 0 });
  } catch (error) {
    console.error('Erreur lors de la vérification du nom:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
  }
});

// Route pour obtenir les statistiques globales
app.get('/api/stats', async (req, res) => {
    try {
        const [total] = await dbAll('SELECT COUNT(*) as total FROM results');
        const [average] = await dbAll('SELECT AVG(score) as average FROM results');
        const [topScore] = await dbAll('SELECT MAX(score) as topScore FROM results');
        
        res.json({
            total: total.total,
            average: average.average || 0,
            topScore: topScore.topScore || 0
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
    }
});

// Route pour exporter les résultats
app.post('/api/results/export', async (req, res) => {
    try {
        const { ids, format } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Aucun benchmark sélectionné' });
        }

        if (!['csv', 'pdf'].includes(format)) {
            return res.status(400).json({ error: 'Format d\'export non supporté' });
        }

        // Construction de la requête avec les IDs sélectionnés
        const placeholders = ids.map(() => '?').join(',');
        const query = `SELECT * FROM results WHERE id IN (${placeholders}) ORDER BY created_at DESC`;
        const results = await dbAll(query, ids);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=benchmarks_${Date.now()}.csv`);
            
            // En-tête CSV
            res.write('Date,Nom de l\'IA,Type de benchmark,Score\n');
            
            // Données
            results.forEach(row => {
                const date = new Date(row.created_at).toLocaleString('fr-FR');
                res.write(`${date},"${row.ai_name}",${row.benchmark_type},${row.score}%\n`);
            });
            
            res.end();
        } else if (format === 'pdf') {
            try {
                const doc = new PDFDocument();
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=benchmarks_${Date.now()}.pdf`);
                
                doc.pipe(res);
            
            // En-tête
            doc.fontSize(20).text('Rapport des Benchmarks IA', { align: 'center' });
            doc.moveDown();
            
            // Tableau
            const tableTop = 150;
            let yPosition = tableTop;
            
            // En-têtes du tableau
            doc.fontSize(12);
            doc.text('Date', 50, yPosition);
            doc.text('IA', 200, yPosition);
            doc.text('Type', 350, yPosition);
            doc.text('Score', 450, yPosition);
            
            yPosition += 20;
            
            // Données
            results.forEach(row => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }
                
                const date = new Date(row.created_at).toLocaleString('fr-FR');
                doc.text(date, 50, yPosition);
                doc.text(row.ai_name, 200, yPosition);
                doc.text(row.benchmark_type, 350, yPosition);
                doc.text(`${row.score}%`, 450, yPosition);
                
                yPosition += 20;
            });
            
            doc.end();
            } catch (error) {
                console.error('Erreur PDFKit:', error);
                res.status(500).json({ error: 'Erreur de génération PDF' });
            }
        } else {
            res.status(400).json({ error: 'Format d\'export non supporté' });
        }
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'export' });
    }
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`Serveur backend démarré sur http://localhost:${port}`);
});

// Gestion propre de la fermeture
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Erreur lors de la fermeture de la base de données:', err);
        } else {
            console.log('Connexion à la base de données fermée');
        }
        process.exit(0);
    });
});