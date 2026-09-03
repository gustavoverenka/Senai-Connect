const { db } = require('../config/firebase');
const { z } = require('zod');

// Schema de validação de mensagem
const sendMessageSchema = z.object({
  content: z.string().min(1, 'A mensagem nao pode estar vazia.').max(2000, 'A mensagem nao pode ter mais de 2000 caracteres.'),
});

// Envia uma nova mensagem direta
const sendMessage = async (req, res) => {
  const receiverId = req.params.id;
  const senderId = req.userId;
  const { content } = req.body;

  if (receiverId === senderId) {
    return res.status(400).json({ error: 'Nao e permitido enviar mensagem para si mesmo.' });
  }

  try {
    const receiverDoc = await db.collection('users').doc(receiverId).get();
    if (!receiverDoc.exists) {
      return res.status(404).json({ error: 'Usuario destinatario nao encontrado.' });
    }

    const messageData = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const msgRef = await db.collection('messages').add(messageData);

    return res.status(201).json({
      message: 'Mensagem enviada com sucesso.',
      data: { id: msgRef.id, ...messageData }
    });
  } catch (error) {
    console.error('Erro no sendMessage:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Retorna o histórico da conversa
const getConversation = async (req, res) => {
  const otherUserId = req.params.id;
  const myId = req.userId;

  try {
    const otherDoc = await db.collection('users').doc(otherUserId).get();
    if (!otherDoc.exists) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    // Busca mensagens enviadas por mim e recebidas por mim
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('messages')
        .where('sender_id', '==', myId)
        .where('receiver_id', '==', otherUserId)
        .get(),
      db.collection('messages')
        .where('sender_id', '==', otherUserId)
        .where('receiver_id', '==', myId)
        .get()
    ]);

    const messages = [];
    const unreadDocs = [];

    sentSnap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
    receivedSnap.forEach(doc => {
      const data = doc.data();
      messages.push({ id: doc.id, ...data });
      if (!data.is_read) {
        unreadDocs.push(doc.ref);
      }
    });

    // Ordena as mensagens por data de envio
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Marca mensagens não lidas como lidas
    if (unreadDocs.length > 0) {
      const batch = db.batch();
      unreadDocs.forEach(ref => batch.update(ref, { is_read: true }));
      await batch.commit();
    }

    return res.json({ conversation: messages });
  } catch (error) {
    console.error('Erro no getConversation:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Retorna a caixa de entrada (inbox)
const getInbox = async (req, res) => {
  const myId = req.userId;

  try {
    const [sentSnap, receivedSnap] = await Promise.all([
      db.collection('messages').where('sender_id', '==', myId).get(),
      db.collection('messages').where('receiver_id', '==', myId).get()
    ]);

    const allMessages = [];
    sentSnap.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));
    receivedSnap.forEach(doc => allMessages.push({ id: doc.id, ...doc.data() }));

    // Ordena do mais recente para o mais antigo
    allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Identifica os contatos únicos
    const contactIds = new Set();
    allMessages.forEach(msg => {
      const otherId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      contactIds.add(otherId);
    });

    // Busca os dados de perfil dos contatos
    const contactDocs = await Promise.all(
      Array.from(contactIds).map(id => db.collection('users').doc(id).get())
    );

    const contactMap = {};
    contactDocs.forEach(doc => {
      if (doc.exists) {
        const data = doc.data();
        contactMap[doc.id] = {
          id: doc.id,
          name: data.name,
          username: data.username,
          profile_picture: data.profile_picture || ''
        };
      }
    });

    // Monta o resumo da caixa de entrada
    const inboxMap = new Map();

    allMessages.forEach(msg => {
      const contactId = msg.sender_id === myId ? msg.receiver_id : msg.sender_id;
      const contact = contactMap[contactId];

      if (contact && !inboxMap.has(contactId)) {
        inboxMap.set(contactId, {
          contact,
          lastMessage: msg.content,
          isRead: msg.is_read,
          isMine: msg.sender_id === myId,
          createdAt: msg.created_at,
        });
      }
    });

    return res.json({ inbox: Array.from(inboxMap.values()) });
  } catch (error) {
    console.error('Erro no getInbox:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  sendMessageSchema
};