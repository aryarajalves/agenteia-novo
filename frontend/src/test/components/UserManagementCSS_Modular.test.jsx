import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('UserManagement Base CSS Modularization', () => {
  const stylesDir = path.resolve(__dirname, '../../styles/Base');
  const modulesDir = path.join(stylesDir, 'modules', 'UserManagement');

  it('deve existir o arquivo agregador UserManagement.css com os imports dos submodulos', () => {
    const mainCssPath = path.join(stylesDir, 'UserManagement.css');
    expect(fs.existsSync(mainCssPath)).toBe(true);

    const content = fs.readFileSync(mainCssPath, 'utf8');
    expect(content).toMatch(/@import\s+['"].\/modules\/UserManagement\/UserManagementHeaderAndTable\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/modules\/UserManagement\/UserManagementModalAndForm\.css['"];/);
    expect(content).toMatch(/@import\s+['"].\/modules\/UserManagement\/UserManagementInviteModal\.css['"];/);

    const lines = content.split('\n').length;
    expect(lines).toBeLessThan(50);
  });

  it('deve conter todos os submodulos modulares em modules/UserManagement/ e cada um ter menos de 500 linhas', () => {
    const expectedModules = [
      'UserManagementHeaderAndTable.css',
      'UserManagementModalAndForm.css',
      'UserManagementInviteModal.css',
    ];

    for (const mod of expectedModules) {
      const filePath = path.join(modulesDir, mod);
      expect(fs.existsSync(filePath), `Modulo ${mod} deve existir`).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      expect(lines, `Modulo ${mod} nao deve exceder 500 linhas`).toBeLessThan(500);
      expect(content.length).toBeGreaterThan(50);
    }
  });

  it('deve conter as classes criticas distribuidas nos modulos corretos', () => {
    const headerContent = fs.readFileSync(path.join(modulesDir, 'UserManagementHeaderAndTable.css'), 'utf8');
    expect(headerContent).toContain('.page-header');
    expect(headerContent).toContain('.add-user-btn');
    expect(headerContent).toContain('.search-box');
    expect(headerContent).toContain('.role-select');
    expect(headerContent).toContain('.user-cell');

    const modalContent = fs.readFileSync(path.join(modulesDir, 'UserManagementModalAndForm.css'), 'utf8');
    expect(modalContent).toContain('.modal-header-refined');
    expect(modalContent).toContain('.modal-title-with-icon');
    expect(modalContent).toContain('.user-form');
    expect(modalContent).toContain('.tabs-container');
    expect(modalContent).toContain('.tab-btn');

    const inviteContent = fs.readFileSync(path.join(modulesDir, 'UserManagementInviteModal.css'), 'utf8');
    expect(inviteContent).toContain('.invite-result-card');
    expect(inviteContent).toContain('.invite-status-banner');
    expect(inviteContent).toContain('.invite-meta-badges');
    expect(inviteContent).toContain('.invite-url-box-premium');
    expect(inviteContent).toContain('.invite-copy-btn-primary');
    expect(inviteContent).toContain('.invite-security-tip');
  });
});
