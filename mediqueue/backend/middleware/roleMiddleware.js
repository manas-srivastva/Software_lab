const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRoles = new Set([req.user.role, ...(req.user.roles || [])]);
    if (!roles.some((role) => userRoles.has(role))) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles. Your role is '${req.user.role}'`,
      });
    }

    next();
  };
};

module.exports = { authorizeRoles };
