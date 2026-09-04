const { z } = require('zod');
const { db } = require('../config/firebase');

const updateBioSchema = z.object({
  bio: z.string().max(250, 'A bio não pode ultrapassar 250 caracteres'),
});

const getMyProfile = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { password, verify_token, reset_token, reset_token_expires, ...user } = userDoc.data();

    return res.json({ user: { id: userDoc.id, ...user } });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const getUserProfile = async (req, res) => {
  const targetId = req.params.id;

  try {
    const userDoc = await db.collection('users').doc(targetId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verifica se já está seguindo
    const followSnap = await db.collection('follows')
      .where('follower_id', '==', req.userId)
      .where('following_id', '==', targetId)
      .limit(1)
      .get();

    const { password, verify_token, reset_token, reset_token_expires, ...user } = userDoc.data();

    return res.json({
      user: { id: userDoc.id, ...user },
      isFollowing: !followSnap.empty
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const updateBio = async (req, res) => {
  const { bio } = req.body;

  try {
    const userRef = db.collection('users').doc(req.userId);
    await userRef.update({ bio });

    const updatedDoc = await userRef.get();
    const { password, verify_token, reset_token, reset_token_expires, ...updatedUser } = updatedDoc.data();

    return res.json({
      message: 'Bio atualizada com sucesso!',
      user: { id: updatedDoc.id, ...updatedUser },
    });
  } catch (error) {
    console.error('Erro ao atualizar bio:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
    }

    const file = req.file;
    const avatarUrl = `http://localhost:3000/uploads/${file.filename}`;

    const userRef = db.collection('users').doc(req.userId);
    await userRef.update({ profile_picture: avatarUrl });

    const updatedDoc = await userRef.get();
    const { password, verify_token, reset_token, reset_token_expires, ...user } = updatedDoc.data();

    return res.json({
      message: 'Foto de perfil atualizada com sucesso!',
      profile_picture: avatarUrl,
      user: { id: updatedDoc.id, ...user },
    });
  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const searchUsers = async (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  const { role, mentoring, unit, course } = req.query;

  try {
    let usersQuery = db.collection('users');

    // Se passou filtro de role direto no Firestore
    if (role) {
      usersQuery = usersQuery.where('role', '==', role.toLowerCase());
    }

    const snapshot = await usersQuery.limit(50).get();

    let users = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const username = (data.username || '').toLowerCase();
      const userCourse = (data.course || data.graduated_course || '').toLowerCase();
      const userUnit = (data.unit || '').toLowerCase();

      // Filtro de texto se foi enviado 'q'
      const matchesQuery = !query || name.includes(query) || username.includes(query);

      // Filtro de mentoria 
      const matchesMentoring = mentoring === undefined || String(data.open_for_mentoring) === mentoring;

      // Filtro de unidade/curso
      const matchesUnit = !unit || userUnit.includes(unit.toLowerCase());
      const matchesCourse = !course || userCourse.includes(course.toLowerCase());

      if (matchesQuery && matchesMentoring && matchesUnit && matchesCourse) {
        users.push({
          id: doc.id,
          name: data.name,
          username: data.username,
          role: data.role,
          unit: data.unit || '',
          bio: data.bio || '',
          profile_picture: data.profile_picture || '',
          
          // Dados contextuais de acordo com o role
          course: data.course || null,
          graduated_course: data.graduated_course || null,
          current_company: data.current_company || null,
          current_position: data.current_position || null,
          open_for_mentoring: data.open_for_mentoring || false,
          teaching_areas: data.teaching_areas || []
        });
      }
    });

    return res.json({ users: users.slice(0, 20) });
  } catch (error) {
    console.error('Erro na busca de usuários:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

module.exports = {
  getMyProfile,
  getUserProfile,
  updateBio,
  uploadAvatar,
  searchUsers,
  updateBioSchema,
};