const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { db } = require('../config/firebase');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Schemas de Validação
const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  username: z
    .string()
    .min(3, 'O username deve ter pelo menos 3 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'O username só pode conter letras, números e underline')
    .toLowerCase(),
  email: z.string().email('Formato de e-mail inválido!').toLowerCase(),
  password: z.string().min(6, 'A senha deve ter no minimo 6 caracteres'),
  role: z.enum(['Aluno', 'ex-aluno', 'professor', 'admin']).default('Aluno'),
  unit: z.string().optional(),

  //Dados de aluno
  course: z.string().optional(),
  class_period: z.string().optional(),
  registration_number: z.string().optional(),

  //Dados ex-alunos
  graduated_course: z.string().optional(),
  graduation_year: z.number().int().optional(),
  current_company: z.string().optional(),
  current_position: z.string().optional(),
  linkedin_url: z.string().url('URL invalida').optional().or(z.literal('')),
  open_for_mentoring: z.boolean().optional().default(false),

  //Dados professor
  teaching_areas: z.array(z.string()).optional(),
  teacher_code: z.string().optional() //Codigo institucional para validar o cadastro do professor
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

// Serviço de E-mail
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

// Controllers de Autenticação

const register = async (req, res) => {
  const { name, username, email, password, role, unit, course, class_period, registration_number, graduated_course, graduation_year, current_company, current_position, linkedin_url, open_for_mentoring, teaching_areas, teacher_code } = req.body;

  try {
    // Verifica e-mail ou username duplicados no Firestore
    const emailCheck = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!emailCheck.empty) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const usernameCheck = await db.collection('users').where('username', '==', username).limit(1).get();
    if (!usernameCheck.empty) {
      return res.status(400).json({ error: 'Username já em uso.' });
    }

    if (role == 'professor') {
      const validCode = process.env.TEACHER_SECRET_CODE || 'SENAI2026';
      if (req.body.teacher_code !== validCode) {
        return res.status(400).json({ error: 'Codigo institucional de professor invalido.'});
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Gera código de verificação (6 dígitos)
    const verifyToken = Math.floor(100000 + Math.random() * 900000).toString();

    const userData = {
      name,
      username,
      email,
      password: hashedPassword,
      role: role || 'aluno',
      unit: unit || '',
      bio: '',
      profile_picture: '',
      is_verified: false,
      verify_token: verifyToken,
      created_at: new Date().toISOString(),

      //Campos adicionais/especificos
      course: course || null,
      class_period: class_period || null,
      registration_number: registration_number || null,

      graduated_course: graduated_course || null,
      graduation_year: graduation_year  || null,
      current_company: current_company || null,
      current_position: current_position || null,
      linkedin_url: linkedin_url || null,
      open_for_mentoring: open_for_mentoring ?? false,

      teaching_areas: teaching_areas || []
    };

    const docRef = await db.collection('users').add(userData);

    const newUser = {
      id: docRef.id,
      name,
      username,
      email,
      is_verified: false
    };

    // Envia o e-mail de confirmação assincronamente
    getTransporter().then(transporter => {
        transporter.sendMail({
          from: '"Equipe SENAI Connect" <suporte@senaiconnect.com>',
          to: newUser.email,
          subject: 'Seu Código de Verificação - SENAI Connect',
          html: `
            <h3>Olá, ${newUser.name}!</h3>
            <p>Obrigado por se cadastrar no SENAI Connect.</p>
            <p>Seu código de verificação de 6 dígitos é:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #3b82f6;">${verifyToken}</h1>
            <p>Insira este código na tela de verificação para ativar sua conta.</p>
          `
        }).then(info => {
            if (!process.env.EMAIL_USER) {
                console.log("[CÓDIGO DE VERIFICAÇÃO] URL do E-mail de Teste: %s", require('nodemailer').getTestMessageUrl(info));
            }
        }).catch(err => console.error("Erro ao enviar e-mail:", err));
    }).catch(err => console.error("Erro no Transporter:", err));

    return res.status(201).json({
      message: 'Conta criada! Enviamos um código de 6 dígitos para o seu e-mail.',
      user: newUser
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return res.status(400).json({ error: 'Código inválido ou e-mail incorreto.' });
    }

    const doc = snapshot.docs[0];
    const userData = doc.data();

    if (userData.verify_token !== code) {
      return res.status(400).json({ error: 'Código inválido ou e-mail incorreto.' });
    }

    await doc.ref.update({ is_verified: true, verify_token: null });

    return res.json({ message: 'Conta ativada com sucesso! Você já pode fazer login.' });
  } catch (error) {
    console.error('Erro ao verificar e-mail:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos' });
    }

    const doc = snapshot.docs[0];
    const user = { id: doc.id, ...doc.data() };

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos' });
    }

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
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      return res.json({ message: 'Se o e-mail existir, um link de recuperação foi enviado.' });
    }

    const doc = snapshot.docs[0];
    const user = { id: doc.id, ...doc.data() };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expireTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await doc.ref.update({ reset_token: resetToken, reset_token_expires: expireTime });

    const transporter = await getTransporter();
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
        console.log("[RECUPERAR SENHA] URL do E-mail de Teste: %s", nodemailer.getTestMessageUrl(info));
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
    const snapshot = await db.collection('users').where('reset_token', '==', token).limit(1).get();

    if (snapshot.empty) {
      return res.status(400).json({ error: 'Token inválido ou não encontrado.' });
    }

    const doc = snapshot.docs[0];
    const user = doc.data();

    const now = new Date();
    const expireDate = new Date(user.reset_token_expires);
    if (now > expireDate) {
      return res.status(400).json({ error: 'Este token já expirou.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await doc.ref.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null
    });

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