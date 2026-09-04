const { db } = require('../config/firebase');

//Estatisticas gerais da plataforma
const getDashboardStats = async (req, res) => {
    try {
        const usersSnap = await db.collection('users').get();
        const postsSnap = await db.collection('posts').get();
        const oppsSnap = await db.collection('opportunities').get();

        const stats = {
            totalUsers: usersSnap.size,
            totalPosts: postsSnap.size,
            totalOpportunities: oppsSnap.size,
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

module.exports = {
    getDashboardStats,
    listUsers,
    updateUserRole,
    adminDeletePost
};