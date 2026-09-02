const { getInbox } = require('../controllers/messageController');
async function test() {
  const req = { userId: 1 };
  const res = {
    status: (code) => ({ json: (data) => console.log(code, data) }),
    json: (data) => console.log(data)
  };
  await getInbox(req, res);
}
test();
