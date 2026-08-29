const supabase = require('../config/supabase');

// Alterna o status de seguidor.
const toggleFollow = async (req, res) => {
    const followingId = parseInt(req.params.id, 10);
    const followerId = req.userId; // Extraído do token JWT.

    if (followingId === followerId) {
        return res.status(400).json({ error: 'Voce nao pode seguir a si mesmo.'});
    }

    try {
        // Valida a existência do usuário alvo.
        const { data: target, error: targetError } = await supabase
          .from('users')
          .select('id')
          .eq('id', followingId)
          .maybeSingle();

        if (targetError || !target) {
            return res.status(404).json({ error: 'Usuario nao encontrado.'});
        }

        // Verifica vínculo existente.
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', followerId)
          .eq('following_id', followingId)
          .maybeSingle();

        if (existingFollow) {
            // Remove vínculo de seguidor.
            await supabase
              .from('follows')
              .delete()
              .eq('follower_id', followerId)
              .eq('following_id', followingId);

            return res.json({ message: 'Voce deixou de seguir este usuario.', following: false});
        } else {
            // Cria vínculo de seguidor.
            const { error: insertError } = await supabase
              .from('follows')
              .insert([{ follower_id: followerId, following_id: followingId }]);
              
            if (insertError) {
                console.error("Erro insert follow", insertError);
                return res.status(500).json({ error: 'Erro ao seguir.' });
            }

            return res.json({ message: 'Voce esta seguindo este usuario agora!', following: true });
        }
    } catch (error) {
        console.error('Erro no follow', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Retorna a lista de seguidores.
const getFollowers = async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const { data: follows, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);

        if (error) throw error;

        // Extrai array de identificadores.
        const followerIds = follows.map(f => f.follower_id);

        if (followerIds.length === 0) {
            return res.json({ followers: [] });
        }

        // Obtém os perfis correspondentes.
        const { data: users } = await supabase
          .from('users')
          .select('id, name, username, profile_picture, role, bio')
          .in('id', followerIds);

        return res.json({ followers: users });
    } catch (error) {
        console.error('Erro ao buscar seguidos:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// Retorna a lista de usuários seguidos.
const getFollowing = async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const { data: follows, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);

        if (error) throw error;

        const followingIds = follows.map(f => f.following_id);
        
        if (followingIds.length === 0) {
            return res.json({ following: [] });
        }

        const { data: users } = await supabase
            .from('users')
            .select('id, name, username, profile_picture, role, bio')
            .in('id', followingIds);

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