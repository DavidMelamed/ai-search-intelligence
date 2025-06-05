import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Auth validation schemas
const authSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().optional()
});

export function validateAuth(req: Request, res: Response, next: NextFunction) {
  const { error } = authSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(d => d.message)
    });
  }
  
  next();
}

// Citation validation
const citationSchema = Joi.object({
  domainId: Joi.number().integer().positive().required(),
  query: Joi.string().required(),
  text: Joi.string().required(),
  sourceUrl: Joi.string().uri().optional(),
  position: Joi.number().integer().positive().optional(),
  aiModeType: Joi.string().optional()
});

export function validateCitation(req: Request, res: Response, next: NextFunction) {
  const { error } = citationSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(d => d.message)
    });
  }
  
  next();
}

// Generic validation middleware factory
export function validate(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }
    
    next();
  };
}