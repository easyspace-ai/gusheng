import { describe, expect, it } from 'vitest'
import { extractCnSymbol, normalizeCnSymbol } from './symbols'

describe('normalizeCnSymbol', () => {
  it('normalizes bare mainland stock codes with exchange suffix', () => {
    expect(normalizeCnSymbol('600519')).toBe('600519.SH')
    expect(normalizeCnSymbol('300750')).toBe('300750.SZ')
    expect(normalizeCnSymbol('000001')).toBe('000001.SZ')
    expect(normalizeCnSymbol('899050')).toBe('899050.BJ')
  })

  it('supports prefixed or suffixed exchange formats', () => {
    expect(normalizeCnSymbol('sh600519')).toBe('600519.SH')
    expect(normalizeCnSymbol('sz300750')).toBe('300750.SZ')
    expect(normalizeCnSymbol('600519.ss')).toBe('600519.SH')
  })
})

describe('extractCnSymbol', () => {
  it('extracts and normalizes codes from free text', () => {
    expect(extractCnSymbol('分析一下宁德时代 300750')).toBe('300750.SZ')
    expect(extractCnSymbol('看看贵州茅台 SH600519')).toBe('600519.SH')
    expect(extractCnSymbol('请分析 601318.SH')).toBe('601318.SH')
  })
})
