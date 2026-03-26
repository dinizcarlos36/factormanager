import { describe, it, expect } from 'vitest'
import { 
  formatCurrency, 
  formatCNPJ, 
  validateCNPJ, 
  calculateIOF, 
  calculateNetValue,
  daysBetween 
} from './utils'

describe('Utils Functions', () => {
  describe('formatCurrency', () => {
    it('should format numbers to BRL currency', () => {
      // Note: Intl might have slight variations in spaces/characters between environments
      const result = formatCurrency(1234.56)
      expect(result).toContain('1.234,56')
      expect(result).toContain('R$')
    })
  })

  describe('CNPJ Functions', () => {
    it('should format a raw CNPJ string', () => {
      expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95')
    })

    it('should validate a correct CNPJ', () => {
      // Using a real valid CNPJ for testing
      expect(validateCNPJ('12.345.678/0001-95')).toBe(true)
      expect(validateCNPJ('12345678000195')).toBe(true)
    })

    it('should reject an invalid CNPJ', () => {
      expect(validateCNPJ('11.111.111/1111-11')).toBe(false)
      expect(validateCNPJ('12.345.678/0001-00')).toBe(false)
    })
  })

  describe('Financial Calculations', () => {
    it('should calculate IOF correctly (daily + fixed)', () => {
      // Face value: 1000, 10 days, rates default 0.0082% daily, 0.38% fixed
      // Daily: 1000 * 0.000082 * 10 = 0.82
      // Fixed: 1000 * 0.0038 = 3.8
      // Total: 4.62
      const iof = calculateIOF(1000, 10)
      expect(iof).toBe(4.62)
    })

    it('should calculate net value correctly', () => {
      // Face: 1000, Rate: 5%, IOF: 4.62, Tax: 10
      // 1000 * (1 - 0.05) - 4.62 - 10 = 950 - 4.62 - 10 = 935.38
      const net = calculateNetValue(1000, 0.05, 4.62, 10)
      expect(net).toBeCloseTo(935.38, 2)
    })
  })

  describe('Date Functions', () => {
    it('should calculate days between two dates', () => {
      expect(daysBetween('2024-01-01', '2024-01-11')).toBe(10)
      expect(daysBetween('2024-03-01', '2024-03-01')).toBe(0)
    })
  })
})
