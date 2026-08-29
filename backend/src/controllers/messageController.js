const supabase =  require('../config/supabase');
const { z } = require('zod');

// Validacao do corpo da mensagem
const sendMessageSchema = z.object({
    content: z.string().min(1, 'A mensagem nao pode estar vazia.').max(2000, 'A mensagem nao pode ter mais de 2000 caracteres.'),
});

// Enviar mensagem
const sendMessage = async (req, res) => {
    const receiverId = parseInt(req.params.id, 10);
    const senderId = req.userId;
    const { content } = req.body;

    if (receiverId === senderId) {
        return res.status(400).json({ error: 'Nao e permitido enviar mensagem para si mesmo.'});
    }

    try {
        // Confere se o destinatario existe
        const { data: receiver, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', receiverId)
          .maybeSingle();

        if (checkError || !receiver) {
            return res.status(404).json({ error: 'Usuario destinatario nao encontrado.'});
        }

        const { data: message, error: insertError } = await supabase
          .from('messages')
          .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
          .select()
          .single();
          
        if (insertError) {
            return res.status(500).json({ error: 'Erro ao registrar a mensagem no banco de dados.'});
        }
        
        return res.status(201).json({ message: 'Mensagem enviada com sucesso.', data: message });
    } catch (error) {
        console.error('Erro no sendMessage:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Retornar historico de mensagens com um usuario especifico
const getConversation = async (req, res) => {
    const otherUserId = parseInt(req.params.id, 10);
    const myId = req.userId;

    try {
        // Busca as mensagens trocadas entre os dois usuarios
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
          .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Erro ao carregar o historico da conversa.'});
        }

        // Filtra as mensagens recebidas que ainda nao foram lidas
        const unreadIds = messages
          .filter(m => m.sender_id === otherUserId && m.is_read === false)
          .map(m => m.id);

        // Atualiza o status das mensagens para lidas
        if (unreadIds.length > 0) {
            await supabase.from('messages').update({ is_read: true}).in('id', unreadIds);
        }

        return res.json({ conversation: messages });
    } catch (error) {
        console.error('Erro no getConversation:', error);
        return res.status(500).json({ error: 'Erro interno no servidor.'});
    }
};

// Listar a caixa de entrada agrupada por usuario
const getInbox = async (req, res) => {
    const myId = req.userId;

    try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*, sender:users!messages_sender_id_fkey(id, name, username, profile_picture),receiver:users!messages_receiver_id_fkey(id, name, username, profile_picture)')
          .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
          .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Erro ao buscar dados da caixa de entrada.'});
        }

        // Agrupa as mensagens mantendo apenas a mais recente de cada contato
        const inboxMap = new Map();

        messages.forEach(msg => {
            const contact = msg.sender_id === myId ? msg.receiver : msg.sender;
            if (!inboxMap.has(contact.id)) {
            inboxMap.set(contact.id,{
                contact,
                lastMessage: msg.content,
                isRead: msg.is_read,
                isMine: msg.sender_id === myId,
                createdAt: msg.created_at,
            });
        }
    });

    return res.json({ inbox: Array.from(inboxMap.values()) });
  } catch (error) {
    console.error('Erro no getInbox:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.'});
  }
};

module.exports = { sendMessage, getConversation, getInbox, sendMessageSchema};