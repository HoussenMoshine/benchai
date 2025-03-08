#!/bin/bash

# Définir les répertoires source et destination
SOURCE_DIR="/mnt/serveur/serveur/BenchAI"
SAUVEGARDE_DIR="/mnt/serveur/serveur/BenchAI-sauvegarde"
LOG_FILE="$HOME/benchai_backup.log"

# Vérifier si les répertoires existent
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERROR: Le répertoire source $SOURCE_DIR n'existe pas."
    exit 1
fi

if [ ! -d "$SAUVEGARDE_DIR" ]; then
    echo "Le répertoire de sauvegarde n'existe pas. Création en cours..."
    mkdir -p "$SAUVEGARDE_DIR"
fi

# Effectuer la sauvegarde avec rsync
rsync -av --delete \
    "$SOURCE_DIR/" \
    "$SAUVEGARDE_DIR/" 2>&1 | tee -a "$LOG_FILE"

# Vérifier si rsync s'est bien exécuté
if [ $? -eq 0 ]; then
    echo "Sauvegarde terminée avec succès le $(date)" | tee -a "$LOG_FILE"
else
    echo "ERREUR: La sauvegarde a échoué le $(date)" | tee -a "$LOG_FILE"
    exit 1
fi