const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

const {
    getDashboardStats,
    listUsers,
    updateUserRole,
    adminDeletePost
} = require('../controllers/adminController');

//Todas as rotas de admin exigem autenticação e a role 'admin'
router.use(authMiddleware, requireRole('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/posts/:id', adminDeletePost);

module.exports = router;