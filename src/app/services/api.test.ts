import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenantSignupApi, setApiTenant } from './api';

describe('tenantSignupApi', () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  describe('signupGoogle', () => {
    it('sends POST to /tenants/signup with X-User-Token and returns slug, name, adminEmail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { slug: 'my-restaurant', name: 'My Restaurant', adminEmail: 'user@example.com' },
        })),
      });

      const result = await tenantSignupApi.signupGoogle('fake-jwt-token', 'My Restaurant', 'user@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/tenants/signup');
      expect(options.method).toBe('POST');
      expect(options.headers['X-User-Token']).toBe('fake-jwt-token');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual({ name: 'My Restaurant', email: 'user@example.com' });

      expect(result).toEqual({ slug: 'my-restaurant', name: 'My Restaurant', adminEmail: 'user@example.com' });
    });

    it('trims name and email before sending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { slug: 'test', name: 'Test', adminEmail: 'test@example.com' },
        })),
      });

      await tenantSignupApi.signupGoogle('token', '  Test  ', '  test@example.com  ');

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ name: 'Test', email: 'test@example.com' });
    });

    it('accepts empty name (backend uses default)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { slug: 'restaurant', name: 'My Restaurant', adminEmail: 'user@example.com' },
        })),
      });

      const result = await tenantSignupApi.signupGoogle('token', '', 'user@example.com');

      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ name: '', email: 'user@example.com' });
      expect(result.adminEmail).toBe('user@example.com');
    });

    it('throws on success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ success: false, error: 'Invalid token' })),
      });

      await expect(tenantSignupApi.signupGoogle('bad-token', 'Name', 'a@b.com'))
        .rejects.toThrow('Invalid token');
    });

    it('throws on empty response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('') });

      await expect(tenantSignupApi.signupGoogle('token', 'Name', 'a@b.com'))
        .rejects.toThrow(/Empty response/);
    });

    it('throws on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('not json') });

      await expect(tenantSignupApi.signupGoogle('token', 'Name', 'a@b.com'))
        .rejects.toThrow(/Invalid response/);
    });
  });

  describe('signup (email/password)', () => {
    it('sends POST with name, adminEmail, adminPassword, slug and returns data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { slug: 'my-place', name: 'My Place', adminEmail: 'admin@example.com' },
        })),
      });

      const result = await tenantSignupApi.signup({
        name: 'My Place',
        adminEmail: 'admin@example.com',
        adminPassword: 'secret123',
        slug: 'my-place',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/tenants/signup');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({
        name: 'My Place',
        adminEmail: 'admin@example.com',
        adminPassword: 'secret123',
        slug: 'my-place',
      });

      expect(result).toEqual({ slug: 'my-place', name: 'My Place', adminEmail: 'admin@example.com' });
    });

    it('returns existingAccount when backend indicates existing account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          success: true,
          data: { slug: 'existing', name: 'Existing', adminEmail: 'existing@example.com' },
          existingAccount: true,
        })),
      });

      const result = await tenantSignupApi.signup({
        name: 'Test',
        adminEmail: 'existing@example.com',
        adminPassword: 'pass',
        slug: 'test',
      });

      expect(result.existingAccount).toBe(true);
      expect(result.slug).toBe('existing');
    });
  });
});

describe('setApiTenant', () => {
  it('is callable without error', () => {
    expect(() => setApiTenant(null)).not.toThrow();
    expect(() => setApiTenant('my-tenant')).not.toThrow();
  });
});
