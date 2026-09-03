const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../../serviceAccountKey.json'));


if (!admin.apps?.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase inicializado com sucesso!");
    } catch (error) {
        
        if (!/already exists/i.test(error.message)) {
            console.error("Erro crítico ao inicializar o Firebase:", error);
        }
    }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };