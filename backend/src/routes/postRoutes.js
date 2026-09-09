const express =  require('express');
const router = express.Router();

const authMiddleware =  require('../middlewares/auth');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');

const {
    createPost,
    getFeed,
    toggleLike,
    addComment,
    deletePost,
    createPostSchema,
    commentSchema,
} = require('../controllers/postController');

const {
    reportPost,
    reportSchema
} = require('../controllers/reportController');

//Todas as rotas exigem login
router.get('/', authMiddleware, getFeed);
router.post('/', authMiddleware, upload.single('image'), validate(createPostSchema), createPost);
router.post('/:id/like', authMiddleware, toggleLike);
router.post('/:id/comments', authMiddleware, validate(commentSchema), addComment);
router.delete('/:id', authMiddleware, deletePost);

//Rota de denuncia
router.post('/:id/report', authMiddleware, validate(reportSchema), reportPost);

module.exports = router;