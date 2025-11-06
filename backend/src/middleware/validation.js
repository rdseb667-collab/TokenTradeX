const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
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
  password: Joi.string().required()
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
  txHash: Joi.string().optional()
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
