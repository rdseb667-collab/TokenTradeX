/**
 * Password strength validation utility
 */

const validatePasswordStrength = (password) => {
  const errors = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Maximum length (prevent DOS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Common passwords check
  const commonPasswords = [
    'password', 'Password123!', '12345678', 'qwerty', 'abc123',
    'password1', 'Password1!', '123456789', 'letmein', 'welcome'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password is too common. Please choose a stronger password');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculateStrength(password)
  };
};

const calculateStrength = (password) => {
  let strength = 0;
  
  // Length bonus
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 20;
  if (password.length >= 16) strength += 10;
  
  // Variety bonus
  if (/[a-z]/.test(password)) strength += 10;
  if (/[A-Z]/.test(password)) strength += 10;
  if (/[0-9]/.test(password)) strength += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;
  
  if (strength <= 30) return 'weak';
  if (strength <= 60) return 'medium';
  return 'strong';
};

module.exports = { validatePasswordStrength };
