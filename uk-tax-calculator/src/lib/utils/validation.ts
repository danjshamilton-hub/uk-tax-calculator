// Input Validation Utilities

import type { ScenarioInputs } from '../../types/scenario';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate scenario inputs
 */
export function validateScenarioInputs(inputs: ScenarioInputs): ValidationError[] {
  const errors: ValidationError[] = [];

  // Salary validations
  if (inputs.grossSalary <= 0) {
    errors.push({ field: 'grossSalary', message: 'Gross salary must be greater than 0' });
  }
  if (inputs.grossSalary > 10000000) {
    errors.push({ field: 'grossSalary', message: 'Gross salary seems unreasonably high' });
  }

  // Pension validations
  if (inputs.employeePensionPercentage < 0 || inputs.employeePensionPercentage > 100) {
    errors.push({ field: 'employeePensionPercentage', message: 'Pension percentage must be 0-100%' });
  }
  if (inputs.employerPensionPercentage < 0 || inputs.employerPensionPercentage > 100) {
    errors.push({ field: 'employerPensionPercentage', message: 'Employer pension percentage must be 0-100%' });
  }

  // Age validations
  if (inputs.currentAge < 16 || inputs.currentAge > 100) {
    errors.push({ field: 'currentAge', message: 'Current age must be 16-100' });
  }
  if (inputs.retirementAge < inputs.currentAge) {
    errors.push({ field: 'retirementAge', message: 'Retirement age must be greater than current age' });
  }
  if (inputs.retirementAge > 100) {
    errors.push({ field: 'retirementAge', message: 'Retirement age must be 100 or less' });
  }

  // Children validations
  if (inputs.hasChildren && inputs.numberOfChildren <= 0) {
    errors.push({ field: 'numberOfChildren', message: 'Number of children must be greater than 0 if has children' });
  }

  // Company car validations
  if (inputs.hasCompanyCar) {
    if (inputs.carBIKPercentage < 0 || inputs.carBIKPercentage > 100) {
      errors.push({ field: 'carBIKPercentage', message: 'BIK percentage must be 0-100%' });
    }
    if (inputs.carP11DValue <= 0) {
      errors.push({ field: 'carP11DValue', message: 'P11D value must be greater than 0' });
    }
  }

  return errors;
}
