const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const validate = require('../middlewares/validate');

const {
    sendMessage,
    getConversation,
    getInbox,
    sendMessageSchema
} = require('../controllers/messageController');

// Todas as rotas de mensagens exigem login
router.use(authMiddleware);

// Rota para listar com quem eu tenho conversas
router.get('/inbox', getInbox);

// Rota para pegar a conversa inteira com um usuário específico
router.get('/:id', getConversation);

// Rota para enviar uma nova mensagem para um usuário
router.post('/:id', validate(sendMessageSchema), sendMessage);

module.exports = router;
