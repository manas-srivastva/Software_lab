const requireOrganisationContext = (req, res, next) => {
  const userRoles = new Set([req.user?.role, ...(req.user?.roles || [])]);
  if (!userRoles.has('orgAdmin')) {
    return next();
  }

  const orgId = req.user.orgId?.toString();
  if (!orgId || !/^[a-f\d]{24}$/i.test(orgId)) {
    return res.status(403).json({
      success: false,
      message: 'This organisation administrator account has no valid organisation assigned',
    });
  }

  next();
};

module.exports = { requireOrganisationContext };
