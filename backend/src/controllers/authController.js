const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const supabase = require('../config/supabase');

// Esquema de validação para cadastro com Role
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

// Esquema de validação para login
const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido').toLowerCase(),
  password: z.string().min(1, 'A senha é obrigatória'),
});

// Registro de novo usuário
const register = async (req, res) => {
  const { name, username, email, password, role } = req.body;

  try {
    // Verifica se já existe usuário com o mesmo e-mail ou username
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (checkError) {
      return res.status(500).json({ error: 'Erro ao verificar disponibilidade de usuário/e-mail' });
    }

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso' });
      }
    }

    // Criptografa a senha com Salt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insere o novo usuário no Supabase com o Role
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          name,
          username,
          email,
          role: role || 'aluno',
          password: hashedPassword,
          bio: '',
          profile_picture: '',
        },
      ])
      .select('id, name, username, email, role, bio, profile_picture, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Erro ao criar conta no banco de dados' });
    }

    // Gera o token JWT incluindo o Role no payload
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: newUser,
      token,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError || !user) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

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

module.exports = {
  register,
  login,
  registerSchema,
  loginSchema,
};
