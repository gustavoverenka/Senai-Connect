const { db } = require('../config/firebase');

// Listar notificacoes do usuario logado
const getNotifications = async (req, res) => {
  try {
    const snapshot = await db
      .collection('notifications')
      .where('recipient_id', '==', req.userId)
      .orderBy('created_at', 'desc')
      .limit(30)
      .get();

    const notifications = [];
    let unreadCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.read) unreadCount++;
      notifications.push({ id: doc.id, ...data });
    });

    return res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('Erro ao buscar notificacoes:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar notificacoes.' });
  }
};

// Marcar uma notificacao como lida
const markAsRead = async (req, res) => {
  const { id } = req.params;

  try {
    const notiRef = db.collection('notifications').doc(id);
    const notiDoc = await notiRef.get();

    if (!notiDoc.exists) {
      return res.status(404).json({ error: 'Notificacao nao encontrada.' });
    }

    if (notiDoc.data().recipient_id !== req.userId) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    await notiRef.update({ read: true });

    return res.json({ message: 'Notificacao marcada como lida.' });
  } catch (error) {
    console.error('Erro ao atualizar notificacao:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Marcar todas as notificacoes como lidas
const markAllAsRead = async (req, res) => {
  try {
    const snapshot = await db
      .collection('notifications')
      .where('recipient_id', '==', req.userId)
      .where('read', '==', false)
      .get();

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();

    return res.json({ message: 'Todas as notificacoes foram marcadas como lidas.' });
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Helper interno para criar notificacoes
const createNotification = async ({ recipient_id, actor, type, text, resourceId = null }) => {
  // Evita que o usuario receba notificacao de acoes feitas por ele mesmo
  if (recipient_id === actor.id) return;

  try {
    const notificationData = {
      recipient_id,
      actor: {
        id: actor.id,
        name: actor.name || '',
        username: actor.username || '',
        profile_picture: actor.profile_picture || '',
        role: actor.role || 'aluno',
      },
      type, // 'like', 'comment', 'follow'
      text,
      resource_id: resourceId,
      read: false,
      created_at: new Date().toISOString(),
    };

    await db.collection('notifications').add(notificationData);
  } catch (err) {
    console.error('Erro ao criar notificacao automatica:', err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};