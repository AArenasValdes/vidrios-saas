import fs from 'fs'
import path from 'path'

describe('Responsive bottom nav safe-area patch presence', () => {
  test('Main shell CSS contains bottom safe-area padding for mobile', () => {
    const cssPath = path.resolve(__dirname, '../../src/components/layout/app-shell.module.css')
    const content = fs.readFileSync(cssPath, 'utf8')
    expect(content).toContain('padding-bottom: calc(var(--tabbar-h) + var(--shell-tabbar-edge-bottom) + 8px)')
  })
})
