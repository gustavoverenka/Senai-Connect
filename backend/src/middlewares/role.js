const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.userRole || !allowedRoles.includes(req.userRole)) {
            return res.status(403).json({
                error: 'Acesso negado: seu perfil nao tem permissao para realizar esta acao.',
            });
        }
        return next();
    };
};

module.exports = requireRole;