const { rejection } = require('../validation');

module.exports = class AccessMiddleware {
  constructor(ctrl) {
    this.ctrl = ctrl;
  }

  atkn(req, res, next) {
    const rejectAs = (nature) => rejection('atkn', nature, res);

    // expect valid token; force logout otherwise
    const atkn = req.cookies.atkn;
    if (!atkn) return rejectAs('missing');
    const decoded = this.ctrl.tkn.utils.verify('atkn', atkn);
    if (!decoded) {
      this.ctrl.tkn.logUserOut(req.userData.address);
      return rejection('atkn', 'expired', res);
    }
    if (req.ip !== decoded.ip) return rejectAs('invalid');

    // goto next
    next();
  }

  roles(required, req, res, next) {
    let hasRequiredRole;
    required.forEach((role) => {
      if (this.ctrl.tkn.roles.hasRole(req.userData.address, role))
        hasRequiredRole = true;
    });
    if (!hasRequiredRole) return rejection('roles', '!authorized', res);
    next();
  }
};
