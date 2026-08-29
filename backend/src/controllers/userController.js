const { z } = require('zod');
const supabase = require('../config/supabase');

const updateBioSchema = z.object({
  bio: z.string().max(250, 'A bio não pode ultrapassar 250 caracteres'),
});

const getMyProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, username, email, role, bio, profile_picture, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const getUserProfile = async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, username, role, bio, profile_picture, created_at')
      .eq('id', targetId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // verifica se ta seguindo
    const { data: follow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', req.userId)
      .eq('following_id', targetId)
      .maybeSingle();

    return res.json({ user, isFollowing: !!follow });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const updateBio = async (req, res) => {
  const { bio } = req.body;

  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ bio })
      .eq('id', req.userId)
      .select('id, name, username, email, role, bio, profile_picture')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Erro ao atualizar bio.' });
    }

    return res.json({
      message: 'Bio atualizada com sucesso!',
      user: updatedUser,
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
    // URL para o arquivo salvo localmente
    const avatarUrl = `http://localhost:3000/uploads/${file.filename}`;

    const { data: user, error: dbError } = await supabase
      .from('users')
      .update({ profile_picture: avatarUrl })
      .eq('id', req.userId)
      .select('id, name, username, email, role, bio, profile_picture')
      .single();

    if (dbError) {
      return res.status(500).json({ error: 'Erro ao vincular a foto ao perfil.' });
    }

    return res.json({
      message: 'Foto de perfil atualizada com sucesso!',
      profile_picture: avatarUrl,
      user,
    });
  } catch (error) {
    console.error('Erro no upload do avatar:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const searchUsers = async (req, res) => {
  const query = req.query.q || '';

  if (!query.trim()) {
    return res.json({ users: [] });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, username, role, bio, profile_picture')
      .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }

    return res.json({ users });
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