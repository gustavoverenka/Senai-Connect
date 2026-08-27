const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    return next();
  } catch (error) {
    const issues = error.issues || error.errors || [];
    const formattedErrors = issues.map((err) => ({
      campo: err.path ? err.path.join('.') : 'campo',
      mensagem: err.message,
    }));

    return res.status(400).json({
      error: 'Dados inválidos',
      detalhes: formattedErrors,
    });
  }
};

module.exports = validate;