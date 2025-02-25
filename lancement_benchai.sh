#!/bin/bash

# Port du serveur
PORT=3250

# Lance le serveur Node.js
echo "Démarrage du serveur..."
node backend/server.js &
SERVER_PID=$!

# Fonction pour vérifier si le port est accessible
wait_for_server() {
    local max_attempts=30
    local attempt=1
    
    while ! nc -z localhost $PORT && [ $attempt -le $max_attempts ]; do
        sleep 1
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo "Le serveur n'a pas démarré dans le temps imparti"
        cleanup
        exit 1
    fi
}

# Attend que le serveur soit prêt
wait_for_server

# Ouvre le navigateur par défaut
echo "Ouverture du navigateur..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:$PORT
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:$PORT
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start http://localhost:$PORT
else
    echo "Système d'exploitation non pris en charge pour l'ouverture automatique du navigateur."
fi

echo "Application lancée !"
echo "Serveur: http://localhost:$PORT"

# Gestion de l'arrêt propre
cleanup() {
    echo "Arrêt des serveurs..."
    kill $SERVER_PID 2>/dev/null
    exit 0
}

# Capture le signal d'interruption (Ctrl+C)
trap cleanup SIGINT SIGTERM

# Attend que l'utilisateur arrête le script
wait $SERVER_PID