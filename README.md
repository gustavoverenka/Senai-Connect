<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0D0D0D&height=140&section=header&text=SENAI%20Connect&fontSize=26&fontColor=FFFFFF&fontAlignY=42&desc=Conex%C3%B5es%20e%20oportunidades&descAlignY=68&descSize=14&descColor=808080" width="100%" alt="SENAI Connect"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=400&size=15&duration=3500&pause=1200&color=707070&center=true&vCenter=true&width=480&lines=Rede+para+a+comunidade+SENAI;Perfis+%C2%B7+Publica%C3%A7%C3%B5es+%C2%B7+Oportunidades" alt="Rede para a comunidade SENAI"/>

<br/><br/>

<img src="https://img.shields.io/badge/Node.js-0D0D0D?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js"/>
<img src="https://img.shields.io/badge/Express-0D0D0D?style=flat-square&logo=express&logoColor=white" alt="Express"/>
<img src="https://img.shields.io/badge/Firebase-0D0D0D?style=flat-square&logo=firebase&logoColor=white" alt="Firebase"/>

</div>

<br/>

---

## Sobre

SENAI Connect é uma aplicação web para conectar alunos, ex-alunos e professores. O projeto reúne uma interface em HTML, CSS e JavaScript e uma API em Node.js, com dados armazenados no Firestore.

O código inclui cadastro e autenticação, verificação de e-mail e recuperação de senha; perfis e seguidores; publicações, curtidas, comentários e denúncias; mensagens, notificações e oportunidades. Há também rotas administrativas protegidas por perfil.

<br/>

---

## Stack

`Node.js` `Express` `Firebase Admin` `Firestore` `JWT` `Zod` `Nodemailer` `HTML` `CSS` `JavaScript`

<br/>

---

## Estrutura

```text
backend/
  docs/              Especificação Swagger usada pela API
  src/
    config/          Inicialização do Firebase
    controllers/     Lógica das funcionalidades
    middlewares/     Autenticação, validação e uploads
    routes/          Rotas da API
    tests/           Scripts exploratórios
    app.js           Configuração do Express
    server.js        Inicialização do servidor
  uploads/           Arquivos enviados
frontend/
  css/               Estilos
  js/                Código da interface e cliente da API
  pages/             Páginas da aplicação
  index.html         Página inicial
docs/                Cópia da especificação Swagger
```

<br/>

---

## Instalação e execução

É necessário ter Node.js e npm, além de um projeto Firebase com Firestore configurado. Clone o repositório e instale as dependências do backend:

```bash
git clone https://github.com/gustavoverenka/Senai-Connect.git
cd Senai-Connect/backend
npm ci
```

Crie `backend/.env` a partir de `backend/.env.example` e defina ao menos `JWT_SECRET`. `PORT` é opcional e usa `3000` por padrão. Para envio de e-mails pelo Gmail, configure `EMAIL_USER` e `EMAIL_PASS`; sem essas variáveis, o código usa uma conta de teste Ethereal. `TEACHER_SECRET_CODE` configura o código para cadastro de professores. O exemplo também contém variáveis de Supabase e PostgreSQL, mas a implementação atual dos controllers utiliza Firestore.

Coloque a chave de conta de serviço do Firebase em `backend/serviceAccountKey.json`, sem adicioná-la ao Git. O arquivo precisa pertencer ao projeto Firebase que será utilizado. Em seguida:

```bash
npm start
```

Para desenvolvimento, use `npm run dev`. A API fica em `http://localhost:3000` por padrão. Em outro terminal, sirva a pasta `frontend` como raiz de um servidor HTTP estático, por exemplo com Python:

```bash
cd frontend
python -m http.server 8000
```

Abra `http://localhost:8000`. O cliente aponta para `http://localhost:3000/api` em `frontend/js/api.js`; se a porta ou o endereço da API mudar, ajuste esse endereço.

<br/>

---

## API

O health check está em `GET /api/status` e a interface Swagger em `/api-docs`. As rotas estão organizadas sob os seguintes prefixos:

| Prefixo | Recursos |
| --- | --- |
| `/api/auth` | Cadastro, login, verificação de e-mail e recuperação de senha |
| `/api/users` | Perfis, busca, seguidores e notificações |
| `/api/posts` | Feed, publicações, curtidas, comentários e denúncias |
| `/api/messages` | Caixa de entrada e conversas |
| `/api/opportunities` | Listagem e gestão de oportunidades |
| `/api/admin` | Usuários, publicações, denúncias e estatísticas administrativas |

As rotas protegidas recebem `Authorization: Bearer <token>`. Consulte os arquivos em `backend/src/routes` para métodos, caminhos e restrições de acesso atuais.

<br/>

---

## Autor

[Gustavo Verenka](https://github.com/gustavoverenka)

<br/>

<div align="center"><sub>SENAI Connect</sub></div>
