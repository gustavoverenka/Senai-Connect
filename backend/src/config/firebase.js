const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

// Verifica caminho na raiz do backend ou raiz do projeto
const keyPathInBackend = path.join(__dirname, '../../serviceAccountKey.json');
const keyPathDirect = path.join(__dirname, '../serviceAccountKey.json');
const resolvedKeyPath = fs.existsSync(keyPathDirect) ? keyPathDirect : keyPathInBackend;

let app;
if (!getApps().length) {
    try {
        const serviceAccount = require(resolvedKeyPath);
        app = initializeApp({
            credential: cert(serviceAccount)
        });
        console.log("Firebase inicializado com sucesso!");
    } catch (error) {
        console.error("Erro crítico ao inicializar o Firebase:", error.message);
    }
} else {
    app = getApps()[0];
}

const db = getFirestore();
const auth = getAuth();

// Mantém compatibilidade com referências a admin.firestore.FieldValue
const admin = {
    firestore: {
        FieldValue
    },
    auth: () => auth
};

module.exports = { admin, db, auth, FieldValue };