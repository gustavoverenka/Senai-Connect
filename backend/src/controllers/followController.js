const { db } = require('../config/firebase');

// Alterna o status de seguidor
const toggleFollow = async (req, res) => {
  const followingId = req.params.id;
  const followerId = req.userId;

  if (followingId === followerId) {
    return res.status(400).json({ error: 'Voce nao pode seguir a si mesmo.' });
  }

  try {
    const targetDoc = await db.collection('users').doc(followingId).get();
    if (!targetDoc.exists) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    const existingFollow = await db.collection('follows')
      .where('follower_id', '==', followerId)
      .where('following_id', '==', followingId)
      .limit(1)
      .get();

    if (!existingFollow.empty) {
      // Deixar de seguir
      await existingFollow.docs[0].ref.delete();
      return res.json({ message: 'Voce deixou de seguir este usuario.', following: false });
    } else {
      // Seguir
      await db.collection('follows').add({
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      });
      return res.json({ message: 'Voce esta seguindo este usuario agora!', following: true });
    }
  } catch (error) {
    console.error('Erro no follow:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Retorna a lista de seguidores
const getFollowers = async (req, res) => {
  const userId = req.params.id;

  try {
    const followsSnap = await db.collection('follows')
      .where('following_id', '==', userId)
      .get();

    const followerIds = followsSnap.docs.map(doc => doc.data().follower_id);

    if (followerIds.length === 0) {
      return res.json({ followers: [] });
    }

    const userDocs = await Promise.all(
      followerIds.map(id => db.collection('users').doc(id).get())
    );

    const users = userDocs
      .filter(doc => doc.exists)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          username: data.username,
          profile_picture: data.profile_picture || '',
          role: data.role,
          bio: data.bio || ''
        };
      });

    return res.json({ followers: users });
  } catch (error) {
    console.error('Erro ao buscar seguidores:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Retorna a lista de seguidos
const getFollowing = async (req, res) => {
  const userId = req.params.id;

  try {
    const followsSnap = await db.collection('follows')
      .where('follower_id', '==', userId)
      .get();

    const followingIds = followsSnap.docs.map(doc => doc.data().following_id);

    if (followingIds.length === 0) {
      return res.json({ following: [] });
    }

    const userDocs = await Promise.all(
      followingIds.map(id => db.collection('users').doc(id).get())
    );

    const users = userDocs
      .filter(doc => doc.exists)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          username: data.username,
          profile_picture: data.profile_picture || '',
          role: data.role,
          bio: data.bio || ''
        };
      });

    return res.json({ following: users });
  } catch (error) {
    console.error('Erro ao buscar seguidos:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

module.exports = {
  toggleFollow,
  getFollowers,
  getFollowing,
};