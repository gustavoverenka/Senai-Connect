const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { 
  register, 
  login, 
  verifyEmail,
  forgotPassword,
  resetPassword,
  registerSchema, 
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../controllers/authController');
const validate = require('../middlewares/validate');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Limite de 20 requisições a cada 15 minutos
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

module.exports = router;