const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const supabase = require('../config/supabase');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- Schemas de Validação ---
const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  username: z
    .string()
    .min(3, 'O username deve ter pelo menos 3 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'O username só pode conter letras, números e underline')
    .toLowerCase(),
  email: z.string().email('Formato de e-mail inválido!').toLowerCase(),
  role: z.enum(['aluno', 'ex-aluno', 'professor', 'admin']).default('aluno'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido').toLowerCase(),
  password: z.string().min(1, 'A senha é obrigatória'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Formato de e-mail inválido').toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ausente'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
});

// --- Função Auxiliar: Configurar E-mail ---
const getTransporter = async () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    } else {
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, 
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
};

// --- Funções de Controller ---

const register = async (req, res) => {
  const { name, username, email, password, role } = req.body;

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) return res.status(500).json({ error: 'Erro ao verificar disponibilidade.' });

    if (existingUser) {
      if (existingUser.email === email) return res.status(400).json({ error: 'E-mail já cadastrado.' });
      if (existingUser.username === username) return res.status(400).json({ error: 'Username já em uso.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Gera token de verificação
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
          name, username, email, password: hashedPassword,
          role: role || 'aluno', bio: '', profile_picture: '',
          is_verified: false, verify_token: verifyToken
      }])
      .select('id, name, username, email, is_verified')
      .single();

    if (insertError) return res.status(500).json({ error: 'Erro ao criar conta.' });

    // Dispara o e-mail de confirmação
    const transporter = await getTransporter();
    const verifyUrl = `http://localhost:3000/api/auth/verify-email?token=${verifyToken}`;

    const info = await transporter.sendMail({
      from: '"Equipe SENAI Connect" <suporte@senaiconnect.com>',
      to: newUser.email,
      subject: 'Bem-vindo! Confirme seu e-mail no SENAI Connect',
      html: `
        <h3>Olá, ${newUser.name}!</h3>
        <p>Obrigado por se cadastrar no SENAI Connect.</p>
        <p>Por favor, confirme seu endereço de e-mail clicando no link abaixo:</p>
        <a href="${verifyUrl}" target="_blank"><strong>Confirmar meu e-mail</strong></a>
      `
    });
    
    if (!process.env.EMAIL_USER) {
        console.log("🔔 [CONFIRMAR CONTA] URL do E-mail de Teste: %s", nodemailer.getTestMessageUrl(info));
    }

    return res.status(201).json({
      message: 'Conta criada! Verifique seu e-mail para ativar a conta antes de fazer login.',
      user: newUser
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('verify_token', token)
      .maybeSingle();

    if (error || !user) {
      return res.status(400).json({ error: 'Link de verificação inválido ou expirado.' });
    }

    await supabase
      .from('users')
      .update({ is_verified: true, verify_token: null })
      .eq('id', user.id);

    return res.send('<h1>E-mail confirmado com sucesso!</h1><p>Você já pode fechar esta página e fazer login no aplicativo.</p>');
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError || !user) return res.status(400).json({ error: 'E-mail ou senha incorretos' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ error: 'E-mail ou senha incorretos' });

    // Bloqueia se não verificou o email
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Por favor, verifique seu e-mail antes de fazer login.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, verify_token, reset_token, reset_token_expires, ...userWithoutPassword } = user;

    return res.json({
      message: 'Login realizado com sucesso!',
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    if (error || !user) return res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expireTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase
      .from('users')
      .update({ reset_token: resetToken, reset_token_expires: expireTime })
      .eq('id', user.id);

    const transporter = await getTransporter();
    
    // URL apontando para a rota de redefinicao no frontend
    const resetUrl = `http://localhost:5500/pages/reset-password.html?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: '"Equipe SENAI Connect" <suporte@senaiconnect.com>',
      to: user.email,
      subject: 'Recuperação de Senha - SENAI Connect',
      html: `
        <h3>Olá, ${user.name}!</h3>
        <p>Você solicitou a redefinição da sua senha.</p>
        <p>Clique no link abaixo para criar uma nova senha (link válido por 1 hora):</p>
        <a href="${resetUrl}" target="_blank"><strong>Redefinir minha senha</strong></a>
      `
    });
    
    if (!process.env.EMAIL_USER) {
        console.log("🔔 [RECUPERAR SENHA] URL do E-mail de Teste: %s", nodemailer.getTestMessageUrl(info));
    }

    return res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
  } catch (error) {
    console.error('Erro no forgotPassword:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .maybeSingle();

    if (error || !user) return res.status(400).json({ error: 'Token inválido ou não encontrado.' });

    const now = new Date();
    const expireDate = new Date(user.reset_token_expires);
    if (now > expireDate) return res.status(400).json({ error: 'Este token já expirou.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await supabase
      .from('users')
      .update({ password: hashedPassword, reset_token: null, reset_token_expires: null })
      .eq('id', user.id);

    return res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro no resetPassword:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
