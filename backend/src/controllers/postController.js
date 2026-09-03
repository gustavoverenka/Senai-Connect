const { z } = require('zod');
const { db, admin } = require('../config/firebase');

// Schemas de validação
const createPostSchema = z.object({
  content: z.string().min(1, 'O conteudo do post nao pode estar vazio').max(1000, 'Maximo de 1000 caracteres'),
});

const commentSchema = z.object({
  content: z.string().min(1, 'O comentario nao pode estar vazio').max(500, 'Maximo de 500 caracteres'),
});

// Cria uma nova publicação
const createPost = async (req, res) => {
  const { content } = req.body;
  let imageUrl = '';

  try {
    if (req.file) {
      const file = req.file;
      imageUrl = `http://localhost:3000/uploads/${file.filename}`;
    }

    // Busca os dados do autor
    const userDoc = await db.collection('users').doc(req.userId).get();
    const userData = userDoc.data() || {};

    const author = {
      id: req.userId,
      name: userData.name || '',
      username: userData.username || '',
      role: userData.role || 'aluno',
      profile_picture: userData.profile_picture || ''
    };

    const newPostData = {
      user_id: req.userId,
      content,
      image: imageUrl,
      author,
      likesCount: 0,
      commentsCount: 0,
      created_at: new Date().toISOString()
    };

    const postRef = await db.collection('posts').add(newPostData);

    return res.status(201).json({
      message: 'Post publicado com sucesso!',
      post: { id: postRef.id, ...newPostData }
    });
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Retorna o feed de publicações
const getFeed = async (req, res) => {
  try {
    const postsSnapshot = await db.collection('posts').orderBy('created_at', 'desc').get();

    if (postsSnapshot.empty) {
      return res.json({ feed: [] });
    }

    // Busca as curtidas do usuário atual
    const myLikesSnapshot = await db.collection('likes')
      .where('user_id', '==', req.userId)
      .get();
    const myLikedPostIds = new Set(myLikesSnapshot.docs.map(doc => doc.data().post_id));

    // Busca todos os comentários
    const commentsSnapshot = await db.collection('comments').orderBy('created_at', 'asc').get();
    const commentsByPost = {};
    commentsSnapshot.forEach(doc => {
      const comment = { id: doc.id, ...doc.data() };
      if (!commentsByPost[comment.post_id]) {
        commentsByPost[comment.post_id] = [];
      }
      commentsByPost[comment.post_id].push(comment);
    });

    const formattedPosts = postsSnapshot.docs.map(doc => {
      const post = doc.data();
      const postId = doc.id;
      const comments = commentsByPost[postId] || [];

      return {
        id: postId,
        content: post.content,
        image: post.image || '',
        createdAt: post.created_at,
        author: post.author,
        likesCount: post.likesCount || 0,
        isLikeByMe: myLikedPostIds.has(postId),
        commentsCount: comments.length || post.commentsCount || 0,
        comments
      };
    });

    return res.json({ feed: formattedPosts });
  } catch (error) {
    console.error('Erro ao buscar feed:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Alterna curtida
const toggleLike = async (req, res) => {
  const postId = req.params.id;

  try {
    const existingLikeQuery = await db.collection('likes')
      .where('user_id', '==', req.userId)
      .where('post_id', '==', postId)
      .limit(1)
      .get();

    const postRef = db.collection('posts').doc(postId);

    if (!existingLikeQuery.empty) {
      // Remove curtida
      await existingLikeQuery.docs[0].ref.delete();
      await postRef.update({
        likesCount: admin.firestore.FieldValue.increment(-1)
      });
      return res.json({ message: 'Curtida removida.', liked: false });
    } else {
      // Adiciona curtida
      await db.collection('likes').add({
        user_id: req.userId,
        post_id: postId,
        created_at: new Date().toISOString()
      });
      await postRef.update({
        likesCount: admin.firestore.FieldValue.increment(1)
      });
      return res.json({ message: 'Post curtido com sucesso!', liked: true });
    }
  } catch (error) {
    console.error('Erro ao curtir post:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Adiciona um comentário
const addComment = async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;

  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    const userData = userDoc.data() || {};

    const commentData = {
      post_id: postId,
      user_id: req.userId,
      content,
      user: {
        id: req.userId,
        name: userData.name || '',
        username: userData.username || '',
        profile_picture: userData.profile_picture || ''
      },
      created_at: new Date().toISOString()
    };

    const commentRef = await db.collection('comments').add(commentData);

    await db.collection('posts').doc(postId).update({
      commentsCount: admin.firestore.FieldValue.increment(1)
    });

    return res.status(201).json({
      message: 'Comentario adicionado com sucesso!',
      comment: { id: commentRef.id, ...commentData }
    });
  } catch (error) {
    console.error('Erro ao comentar:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Deleta post
const deletePost = async (req, res) => {
  const postId = req.params.id;

  try {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post nao encontrado.' });
    }

    const post = postDoc.data();

    if (post.user_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Sem permissao para deletar esse post.' });
    }

    await postRef.delete();

    return res.json({ message: 'Post deletado com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar post:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
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