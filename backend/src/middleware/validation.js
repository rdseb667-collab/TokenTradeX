const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    console.log('🔍 VALIDATION CHECK:', {
      body: req.body,
      path: req.path
    });
    
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      console.error('❌ VALIDATION FAILED:', {
        body: req.body,
        errors
      });
      
      // Return more informative error messages
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
        // Include user-friendly error message
        userMessage: errors.length > 0 ? errors[0].message : 'Invalid request data'
      });
    }
    
    console.log('✅ VALIDATION PASSED');
    next();
  };
};

// Auth validation schemas
const registerSchema = Joi.object({  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().optional().allow(''),
  lastName: Joi.string().optional().allow(''),
  referralCode: Joi.string().optional().allow('')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorToken: Joi.string().optional().allow('')
});

// Order validation schemas
const createOrderSchema = Joi.object({
  tokenId: Joi.string().uuid().required(),
  orderType: Joi.string().valid('market', 'limit', 'stop_loss', 'take_profit').required(),
  side: Joi.string().valid('buy', 'sell').required(),
  price: Joi.number().positive().when('orderType', {
    is: Joi.string().valid('limit', 'stop_loss', 'take_profit'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  quantity: Joi.number().positive().required(),
  stopPrice: Joi.number().positive().when('orderType', {
    is: Joi.string().valid('stop_loss', 'take_profit'),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// Transaction validation schemas
const depositSchema = Joi.object({
  tokenId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  txHash: Joi.string().optional().allow('')
});

const withdrawSchema = Joi.object({
  tokenId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  address: Joi.string().required()
});

module.exports = {
  validateRequest,
  registerSchema,
  loginSchema,
  createOrderSchema,
  depositSchema,
  withdrawSchema
};
