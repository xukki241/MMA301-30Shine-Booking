function isValidObjectId(id) {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
}

function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: `Định dạng ${paramName} không hợp lệ` });
    }
    return next();
  };
}

module.exports = { isValidObjectId, validateObjectIdParam };
