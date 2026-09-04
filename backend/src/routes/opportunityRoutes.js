const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const validate = require('../middlewares/validate');

const {
  createOpportunity,
  getOpportunities,
  deleteOpportunity,
  createOpportunitySchema
} = require('../controllers/opportunityController');

// Todas as rotas de oportunidades exigem login
router.use(authMiddleware);


router.get('/', getOpportunities);

//Apenas ex-aluno, professor ou admin pode criar
router.post(
  '/',
  requireRole('ex-aluno', 'professor', 'admin'),
  validate(createOpportunitySchema),
  createOpportunity
);

//Autor ou Admin pode deletar
router.delete('/:id', deleteOpportunity);

module.exports = router;