const request = require('supertest');
const app = require('../server');
const { User, AuditLog } = require('../models');
const { sequelize } = require('../config/database');

describe('Audit Logging', () => {
  let adminUser, regularUser;
  let adminAuthToken;

  beforeAll(async () => {
    // Clean up any existing test data
    await AuditLog.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_admin@example.com' } });
    await User.destroy({ where: { email: 'test_user@example.com' } });
    
    // Create test admin user
    adminUser = await User.create({
      email: 'test_admin@example.com',
      username: 'testadmin',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'admin',
      kycStatus: 'approved',
      isActive: true
    });

    // Create test regular user
    regularUser = await User.create({
      email: 'test_user@example.com',
      username: 'testuser',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      kycStatus: 'approved',
      isActive: true
    });

    // Get admin auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test_admin@example.com',
        password: 'Test123!'
      });

    adminAuthToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await AuditLog.destroy({ where: {} });
    await User.destroy({ where: { email: 'test_admin@example.com' } });
    await User.destroy({ where: { email: 'test_user@example.com' } });
    await sequelize.close();
  });

  it('should log admin actions to the audit log', async () => {
    // Perform an admin action that should be logged
    const response = await request(app)
      .put(`/api/admin/users/${regularUser.id}/role`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({
        role: 'trader'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Check that the action was logged
    const auditLogs = await AuditLog.findAll({
      where: {
        userId: adminUser.id,
        action: 'UPDATE_ROLE'
      }
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].resourceId).toBe(regularUser.id);
    expect(auditLogs[0].metadata).toBeDefined();
    expect(auditLogs[0].metadata.oldRole).toBe('user');
    expect(auditLogs[0].metadata.newRole).toBe('trader');
  });

  it('should allow admin to fetch audit logs with pagination', async () => {
    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .query({
        page: 1,
        limit: 10
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.logs).toBeDefined();
    expect(response.body.pagination).toBeDefined();
  });

  it('should include user information in audit logs', async () => {
    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAuthToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    if (response.body.logs.length > 0) {
      const log = response.body.logs[0];
      expect(log.user).toBeDefined();
      expect(log.user.email).toBe('test_admin@example.com');
      expect(log.user.role).toBe('admin');
    }
  });

  it('should filter audit logs by action type', async () => {
    // Perform another action to have more logs
    await request(app)
      .put(`/api/admin/users/${regularUser.id}/status`)
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .send({
        isActive: false
      });

    // Filter by UPDATE_ROLE action
    const response = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAuthToken}`)
      .query({
        action: 'UPDATE_ROLE'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    response.body.logs.forEach(log => {
      expect(log.action).toBe('UPDATE_ROLE');
    });
  });
});