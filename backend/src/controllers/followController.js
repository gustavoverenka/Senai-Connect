const supabase = require('../config/supabase');

//Seguir ou deixar de seguir um usuario
const toggleFollow = async (req, res) => {
    const followingId = parseInt(req.params.id, 10);
    const followerId = req.userId; //Vem do token

    if (followingId === followerId) {
        return res.status(400).json({ error: 'Voce nao pode seguir a si mesmo.'});
    }

    try {
        //Verifica se ja segue
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', followerId)
          .eq('following_id', followingId)
          .maybeSingle();

        if (existingFollow) {
            //Se ja segue, remove
            await supabase
              .from('follows')
              .delete()
              .eq('follower_id', followerId)
              .eq('following_id', followingId);

            return res.json({ message: 'Voce deixou de seguir este usuario.', following: false});
        } else {
            //Se nao segue, adiciona
            await supabase
              .from('follows')
              .insert([{ follower_id: followerId, following_id: followingId }]);

            return res.json({ message: 'Voce esta seguindo este usuario agora!', following: true });
        }
    } catch (error) {
        console.error('Erro no follow', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

//Lista seguidores de um usuario
const getFollowers = async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    try {
        const { data: follows, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);

        if (error) throw error;

        //Separa so os IDs num array
        const followerIds = follows.map(f => f.follower_id);

        if (followerIds.length === 0) {
            return res.json({ followers: [] });
        }

        //Busca perfil de cada ID
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

// Listar quem o usuário segue (Quem eu sigo)
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