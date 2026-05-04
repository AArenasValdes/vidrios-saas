import fs from 'fs';
import path from 'path';

describe('Bottom Nav Responsive Fix', () => {
  test('CSS contains safe-area-bottom padding for mobile bottom nav', () => {
    const cssPath = path.resolve(__dirname, '../src/components/layout/app-shell.module.css');
    const content = fs.readFileSync(cssPath, 'utf8');
    
    expect(content).toContain('bottom: calc(12px + env(safe-area-inset-bottom');
    expect(content).toContain('calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom');
  });
});