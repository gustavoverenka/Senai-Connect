const { z } = require('zod');
const supabase = require('../config/supabase');

// Schema de validação para publicações e comentários.
const createPostSchema = z.object({
    content: z.string().min(1, 'O conteudo do post nao pode estar vazio').max(1000, 'Maximo de 1000 caracteres'),
});

const commentSchema = z.object({
    content: z.string().min(1, 'O comentario nao pode estar vazio').max(500, 'Maximo de 500 caracteres'),
});

// Cria uma nova publicação.
const createPost = async (req, res) => {
    const { content } =  req.body;
    let imageUrl = '';

    try {
        // Processa o upload de imagem, se fornecida.
        if (req.file) {
            const file = req.file;
            const avatarUrl = `http://localhost:3000/uploads/${file.filename}`;
            imageUrl = avatarUrl;
        }

        // Persiste a publicação no banco de dados.
        const { data: post, error: insertError } = await supabase
          .from('posts')
          .insert([
            {
                user_id: req.userId,
                content,
                image: imageUrl,
            },
          ])
          .select('id, content, image, created_at, author:users!posts_user_id_fkey(id, name, username, role, profile_picture)')
          .single();

        if (insertError) {
            return res.status(500).json({ error: 'Erro ao enviar post.'});
        }

        return res.status(201).json({
            message: 'Post publicado com sucesso!',
            post,
        });
    } catch (error) {
        console.error('Erro ao criar post:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Retorna o feed de publicações.
const getFeed = async (req, res) => {
    try {
        const { data: posts, error} =  await supabase
          .from('posts')
          .select(`
            id,
            content,
            image,
            created_at,
            author: users!posts_user_id_fkey (id, name, username, role, profile_picture),
            likes (user_id),
            comments (
            id,
            content,
            created_at,
            user:users (id, name, username, profile_picture)
            )
          `)
          .order('created_at', { ascending: false});

        if (error) {
            return res.status(500).json({ error: 'Erro ao carregar o feed.'});
        }

        // Estrutura o payload de resposta.
        const formattedPosts = posts.map((post) => {
            const isLikeByMe = post.likes.some((like) => like.user_id === req.userId);
            return {
                id: post.id,
                content: post.content,
                image: post.image,
                createdAt: post.created_at,
                author: post.author,
                likesCount: post.likes.length,
                isLikeByMe,
                commentsCount: post.comments.length,
                comments: post.comments,
            };
        });

        return res.json({ feed: formattedPosts });
    } catch (error) {
        console.error('Erro ao buscar feed:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Alterna o status de curtida da publicação.
const toggleLike = async (req, res) => {
    const postId = parseInt(req.params.id, 10);

    try {
        // Verifica curtida existente.
        const { data: existingLike } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', req.userId)
          .eq('post_id', postId)
          .maybeSingle();

        if (existingLike) {
            // Remove curtida.
            await supabase
              .from('likes')
              .delete()
              .eq('user_id', req.userId)
              .eq('post_id', postId);

            return res.json({ message: 'Curtida removida.', liked: false });
        } else {
            // Adiciona curtida.
            await supabase
              .from('likes')
              .insert([{ user_id: req.userId, post_id: postId }]);

            return res.json({ message: 'Post curtido com sucesso!', liked: true});
        }
    } catch (error) {
        console.error('Erro ao curtir post:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
};

// Adiciona um comentário à publicação.
const addComment = async (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { content } = req.body;

    try {
        const { data: comment, error } = await supabase
          .from('comments')
          .insert([
            {
                post_id: postId,
                user_id: req.userId,
                content,
            },
          ])
          .select('id, content, created_at, user:users(id, name, username, profile_picture)')
          .single();

        if (error) {
            return res.status(500).json({ error: 'Erro ao salvar comentario.' });   
        }

        return res.status(201).json({
            message: 'Comentario adicionado com sucesso!',
            comment,
        });
    } catch (error) {
        console.error('Erro ao comentar:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Remove a publicação (requer permissão de autor ou administrador).
const deletePost = async (req, res) => {
    const postId = parseInt(req.params.id, 10);

    try {
        //Busca o post para verficar o dono
        const { data: post, error: findError } = await supabase
          .from('posts')
          .select('id, user_id')
          .eq('id', postId)
          .maybeSingle();
          
        if (findError || !post) {
            return res.status(404).json({ error: 'Post nao encontrado.'});
        } 

        //So o author ou admin pode deletar o post
        if (post.user_id !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Sem permissao para deletar esse post.'});
        }

        const { error: deleteError } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);
          
        if (deleteError) {
            return res.status(500).json({ error: 'Erro ao deletar o post.'});
        }

        return res.json({ message: 'Post deletado com sucesso!'});
    } catch (error) {
        console.error('Erro ao deletar post:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

module.exports = {
    createPost,
    getFeed,
    toggleLike,
    addComment,
    deletePost,
    createPostSchema,
    commentSchema,
};