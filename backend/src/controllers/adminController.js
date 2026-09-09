const { db } = require('../config/firebase');

//Estatisticas gerais da plataforma
const getDashboardStats = async (req, res) => {
    try {
        const usersSnap = await db.collection('users').get();
        const postsSnap = await db.collection('posts').get();
        const oppsSnap = await db.collection('opportunities').get();
        const reportsSnap = await db.collection('reports').where('status', '==', 'pending').get();

        const stats = {
            totalUsers: usersSnap.size,
            totalPosts: postsSnap.size,
            totalOpportunities: oppsSnap.size,
            pendingReports: reportsSnap.size,
            roles: {
                aluno: 0,
                'ex-aluno': 0,
                professor: 0,
                admin: 0
            }
        };

        usersSnap.forEach(doc => {
            const user = doc.data();
            if (stats.roles[user.role] !== undefined) {
                stats.roles[user.role]++;
            }
        });

        return res.json({ stats });
    } catch(error) {
        console.error('Erro ao buscar estatisticas:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar esatisticas.'});
    }
};

//Listar usuarios com paginação e filtro por role
const listUsers = async (req, res) => {
    const { role } = req.query;

    try {
        let query = db.collection('users').orderBy('created_at', 'desc');

        if (role) {
            query = query.where('role', '==', role);
        }

        const snapshot = await query.limit(50).get();
        const users = [];

        snapshot.forEach(doc => {
            const { password, verify_token, reset_token, reset_token_expires, ...user } = doc.data();
                user.push({ id: doc.id, ...user });
        });

        return res.json({ users });
    } catch (error) {
        console.error('Erro ao listar usuarios:', error);
        return res.status(500).json({ error: 'Erro interno ao listar usuarios.' });
    }
};

//alterar role de um usuario

const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['Aluno', 'ex-aluno', 'professor', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Role invalida.'});
    }

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(400).json({ error: 'Usuario não encontrado.'});
        }

        await userRef.update({ role })

        return res.json({ message: `Role atualizada para ${role} com sucesso!`});
    } catch (error) {
        console.error('Erro ao atualizar role:', error);
        return res.status(500).json({ error: 'Erro interno ao atualizar role.'});
    }
};

//Excluir post improprio
const adminDeletePost = async (req, res) => {
    const { id } = req.params;

    try {
        const postRef = db.collection('posts').doc(id);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ error: 'Post não encontrado.'});
        }

        await postRef.delete();
        return res.json({ message: 'Post removido pela moderação com sucesso.'});
    } catch (error) {
        console.error('Erro na moderação do post:', error);
        return res.status(500).json({ error: 'Erro interno ao remover post.'});
    }
};

//Listar denuncias pendentes
const listReports = async (req, res) => {
    const { status = 'pending' } = req.query;

    try {
        const snapshot = await db.collection('reports')
           .where('status', '==', status)
           .orderBy('created_at', 'desc')
           .limit(50)
           .get();

        const reports = [];
        snapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        return res.json({ reports });
    } catch (error) {
        console.error('Erro ao listar denuncias:', error);
        return res.status(500).json({ error: 'Erro interno ao listar denuncias.'});
    }
};

//Resolver ou descartar denuncia
const resolveReport = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; //'delete_post' ou 'dismiss'

    try {
        const reportRef = db.collection('reports').doc(id);
        const reportDoc = await reportRef.get();

        if (!reportDoc.exists) {
            return res.status(404).json({ error: 'Denuncia nao encontrada.'});
        }

        const reportData = reportDoc.data();

        if (action === 'delete_post') {
            //deleta o post denunciado se ele ainda existir
            const postRef = db.collection('posts').doc(reportData.post_id);
            const postDoc = await postRef.get();

            if (postDoc.exists) {
                await postRef.delete();
            }
            await reportRef.update({ status: 'resolved', resolved_at: new Date().toISOString() });
            return res.json({ message: 'Publicacao excluida e denuncia marcada como resolvida.'})
        } else {
            //apenas descarta a denuncia
            await reportRef.update({ status: 'dismissed', resolved_at: new Date().toISOString() });
            return res.json({ message: 'Denuncia descartada pela moderacao.' });
        }
    } catch (error) {
        console.error('Erro ao resolver denuncia:', error);
        return res.status(500).json({ error: 'Erro interno ao resolver denuncia.' });
    }
};

module.exports = {
    getDashboardStats,
    listUsers,
    updateUserRole,
    adminDeletePost,
    listReports,
    resolveReport
};