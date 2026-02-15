const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result handler
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }

  next();
}

/**
 * Login validation
 */
const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  validate
];

/**
 * Change password validation
 */
const validateChangePassword = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Old password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  body('newPassword')
    .custom((value, { req }) => value !== req.body.oldPassword)
    .withMessage('New password must be different from old password'),
  validate
];

/**
 * Stream creation validation
 */
const validateCreateStream = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Stream name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Stream name must be between 3 and 100 characters'),
  body('stream_key')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Stream key must contain only alphanumeric characters, underscores, and hyphens')
    .isLength({ min: 3, max: 100 })
    .withMessage('Stream key must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('protocol')
    .optional()
    .isIn(['rtmp', 'srt', 'both'])
    .withMessage('Protocol must be rtmp, srt, or both'),
  body('max_bitrate')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Max bitrate must be between 100 and 50000 kbps'),
  validate
];

/**
 * Stream update validation
 */
const validateUpdateStream = [
  param('id')
    .isInt()
    .withMessage('Stream ID must be an integer'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Stream name must be between 3 and 100 characters'),
  body('stream_key')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Stream key must contain only alphanumeric characters, underscores, and hyphens')
    .isLength({ min: 3, max: 100 })
    .withMessage('Stream key must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('protocol')
    .optional()
    .isIn(['rtmp', 'srt', 'both'])
    .withMessage('Protocol must be rtmp, srt, or both'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  body('max_bitrate')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Max bitrate must be between 100 and 50000 kbps'),
  validate
];

/**
 * ID parameter validation
 */
const validateId = [
  param('id')
    .isInt()
    .withMessage('ID must be an integer'),
  validate
];

/**
 * Config update validation
 */
const validateUpdateConfig = [
  body('max_concurrent_streams')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max concurrent streams must be between 1 and 20'),
  body('require_authentication')
    .optional()
    .isBoolean()
    .withMessage('require_authentication must be a boolean'),
  body('allow_recording')
    .optional()
    .isBoolean()
    .withMessage('allow_recording must be a boolean'),
  body('default_protocol')
    .optional()
    .isIn(['rtmp', 'srt'])
    .withMessage('default_protocol must be rtmp or srt'),
  body('session_timeout')
    .optional()
    .isInt({ min: 60, max: 3600 })
    .withMessage('session_timeout must be between 60 and 3600 seconds'),
  validate
];

module.exports = {
  validate,
  validateLogin,
  validateChangePassword,
  validateCreateStream,
  validateUpdateStream,
  validateId,
  validateUpdateConfig
};
