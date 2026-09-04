const { z } = require('zod');
const { db } = require('../config/firebase');

// Schema de validação Zod 
const createOpportunitySchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  type: z.enum(['estagio', 'emprego', 'mentoria', 'projeto'], {
    errorMap: () => ({ message: 'Tipo inválido. Escolha: estagio, emprego, mentoria ou projeto' })
  }),
  company: z.string().optional().default(''),
  workplace_type: z.enum(['remoto', 'hibrido', 'presencial']).default('presencial'),
  location: z.string().optional().default(''), // Ex: "Londrina - PR"
  description: z.string().min(10, 'A descrição deve ter no mínimo 10 caracteres'),
  requirements: z.string().optional().default(''),
  link_or_contact: z.string().min(3, 'Informe um e-mail, telefone ou link para candidatura')
});

//Criar Oportunidade
const createOpportunity = async (req, res) => {
  try {
    const data = req.body;

    // Busca os dados do autor logado
    const userDoc = await db.collection('users').doc(req.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const opportunityData = {
      title: data.title,
      type: data.type,
      company: data.company || '',
      workplace_type: data.workplace_type || 'presencial',
      location: data.location || '',
      description: data.description,
      requirements: data.requirements || '',
      link_or_contact: data.link_or_contact,
      
      // Dados de quem postou
      author_id: req.userId,
      author_name: userData.name || req.userUsername,
      author_username: req.userUsername,
      author_role: req.userRole,
      author_picture: userData.profile_picture || '',
      
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('opportunities').add(opportunityData);

    return res.status(201).json({
      message: 'Oportunidade publicada com sucesso!',
      opportunity: { id: docRef.id, ...opportunityData }
    });
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error);
    return res.status(500).json({ error: 'Erro interno ao publicar oportunidade.' });
  }
};

//Listar Oportunidades 
const getOpportunities = async (req, res) => {
  try {
    const { type, workplace_type } = req.query;

    let query = db.collection('opportunities').orderBy('created_at', 'desc');

    if (type) {
      query = query.where('type', '==', type);
    }
    if (workplace_type) {
      query = query.where('workplace_type', '==', workplace_type);
    }

    const snapshot = await query.limit(50).get();

    const opportunities = [];
    snapshot.forEach(doc => {
      opportunities.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ opportunities });
  } catch (error) {
    console.error('Erro ao listar oportunidades:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar oportunidades.' });
  }
};

//Deletar Oportunidade 
const deleteOpportunity = async (req, res) => {
  const { id } = req.params;

  try {
    const oppRef = db.collection('opportunities').doc(id);
    const oppDoc = await oppRef.get();

    if (!oppDoc.exists) {
      return res.status(404).json({ error: 'Oportunidade não encontrada.' });
    }

    const oppData = oppDoc.data();

    // Permite exclusão se for o autor da postagem OU se for um admin
    if (oppData.author_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Você não tem permissão para apagar esta oportunidade.' });
    }

    await oppRef.delete();

    return res.json({ message: 'Oportunidade removida com sucesso!' });
  } catch (error) {
    console.error('Erro ao deletar oportunidade:', error);
    return res.status(500).json({ error: 'Erro interno ao remover oportunidade.' });
  }
};

module.exports = {
  createOpportunity,
  getOpportunities,
  deleteOpportunity,
  createOpportunitySchema
};