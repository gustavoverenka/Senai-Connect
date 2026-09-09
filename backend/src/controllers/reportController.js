const { z } = require('zod');
const { db } = require('../config/firebase');

const reportSchema = z.object({
    reason: z.enum(['spam', 'ofensivo', 'conteudo_improprio', 'desinformacao', 'desinformacaçao', 'outro'], {
        errorMap: () => ({ message: 'Motivo invalido. Escolha: spam, ofensivo, conteudo_improprio, desinformacao ou outro.' })
    }),
    details: z.string().max(300, 'Detalhes nao podem exceder 300 caracteres.').optional().default('')
});

// Cria a denuncia de um post
const reportPost = async (req, res) => {
    const postId = req.params.id;
    const { reason, details } = req.body;

    try {
        const postRef = db.collection('posts').doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ error: 'Publicacao nao encontrada.' });
        }

        const postData = postDoc.data();

        // Evita denuncias duplicadas do mesmo user/post
        const existingReport = await db.collection('reports')
          .where('post_id', '==', postId)
          .where('reporter_id', '==', req.userId)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!existingReport.empty) {
            return res.status(400).json({ error: 'Voce ja enviou uma denuncia pendente para esta publicacao.' });
        }

        const reportData = {
            post_id: postId,
            post_content: postData.content || '',
            post_author_id: postData.user_id,
            post_author_name: postData.author?.name || '',
            reporter_id: req.userId,
            reason: reason === 'desinformacaçao' ? 'desinformacao' : reason,
            details: details || '',
            status: 'pending', // 'pending', 'resolved', 'dismissed'
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('reports').add(reportData);

        return res.status(201).json({
            message: 'Denuncia enviada com sucesso para equipe de moderação.',
            reportId: docRef.id
        });
    } catch (error) {
        console.error('Erro ao registrar denuncia:', error);
        return res.status(500).json({ error: 'Erro interno ao registrar denuncia.' });
    }
};

module.exports = {
    reportPost,
    reportSchema
};