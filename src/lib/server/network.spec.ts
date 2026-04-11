import { describe, it, expect } from 'vitest';
import { isLocalIP } from './network';

describe('isLocalIP', () => {
	describe('loopback addresses', () => {
		it('should return true for IPv4 loopback 127.0.0.1', () => {
			expect(isLocalIP('127.0.0.1')).toBe(true);
		});

		it('should return true for any 127.x.x.x address', () => {
			expect(isLocalIP('127.0.0.2')).toBe(true);
			expect(isLocalIP('127.255.255.255')).toBe(true);
		});

		it('should return true for IPv6 loopback ::1', () => {
			expect(isLocalIP('::1')).toBe(true);
		});
	});

	describe('private LAN ranges', () => {
		it('should return true for 192.168.x.x addresses', () => {
			expect(isLocalIP('192.168.1.55')).toBe(true);
			expect(isLocalIP('192.168.0.1')).toBe(true);
			expect(isLocalIP('192.168.255.255')).toBe(true);
		});

		it('should return true for 10.x.x.x addresses', () => {
			expect(isLocalIP('10.0.0.1')).toBe(true);
			expect(isLocalIP('10.10.20.30')).toBe(true);
			expect(isLocalIP('10.255.255.255')).toBe(true);
		});

		it('should return true for 172.16.x.x – 172.31.x.x addresses (RFC1918)', () => {
			expect(isLocalIP('172.16.0.1')).toBe(true);
			expect(isLocalIP('172.24.50.1')).toBe(true);
			expect(isLocalIP('172.31.255.255')).toBe(true);
		});
	});

	describe('external / public addresses', () => {
		it('should return false for 8.8.8.8 (Google DNS)', () => {
			expect(isLocalIP('8.8.8.8')).toBe(false);
		});

		it('should return false for 1.1.1.1 (Cloudflare DNS)', () => {
			expect(isLocalIP('1.1.1.1')).toBe(false);
		});

		it('should return false for a random public IP 203.0.113.5', () => {
			expect(isLocalIP('203.0.113.5')).toBe(false);
		});

		it('should return false for 172.15.0.1 (just below RFC1918 range)', () => {
			expect(isLocalIP('172.15.0.1')).toBe(false);
		});

		it('should return false for 172.32.0.1 (just above RFC1918 range)', () => {
			expect(isLocalIP('172.32.0.1')).toBe(false);
		});

		it('should return false for 192.167.1.1 (just below 192.168.0.0)', () => {
			expect(isLocalIP('192.167.1.1')).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should return false for an empty string', () => {
			expect(isLocalIP('')).toBe(false);
		});

		it('should return false for a non-IP string', () => {
			expect(isLocalIP('not-an-ip')).toBe(false);
		});

		it('should handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)', () => {
			expect(isLocalIP('::ffff:192.168.1.1')).toBe(true);
		});

		it('should handle IPv4-mapped IPv6 external address (::ffff:8.8.8.8)', () => {
			expect(isLocalIP('::ffff:8.8.8.8')).toBe(false);
		});
	});
});
