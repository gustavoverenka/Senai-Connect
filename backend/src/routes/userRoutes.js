const express =  require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const validate = require('../middlewares/validate');

const {
    getMyProfile,
    updateBio,
    uploadAvatar,
    searchUsers,
    updateBioSchema,
} = require('../controllers/userController');

const {
    toggleFollow,
    getFollowers,
    getFollowing
} = require('../controllers/followController');

//Exigem que o usuario esteja logado
router.get('/me', authMiddleware, getMyProfile);
router.put('/bio', authMiddleware, validate(updateBioSchema), updateBio);
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);
router.get('/search', authMiddleware, searchUsers);

//Rotas de Seguidores
router.post('/:id/follow', authMiddleware, toggleFollow);
router.get('/:id/followers', authMiddleware, getFollowers);
router.get('/:id/following', authMiddleware, getFollowing);

module.exports = router;