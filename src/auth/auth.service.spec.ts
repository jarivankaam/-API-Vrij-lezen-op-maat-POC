import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  const user = {
    id: 1,
    email: 'reader@example.com',
    name: 'Reader',
    passwordHash: '',
  };

  beforeEach(async () => {
    user.passwordHash = await bcrypt.hash('correct-password', 10);

    usersService = { findByEmail: vi.fn(), create: vi.fn() };
    jwtService = { sign: vi.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('rejects when the email is already in use', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.register({ email: user.email, name: user.name, password: 'password' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and returns an access token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user);

      const result = await service.register({
        email: user.email,
        name: user.name,
        password: 'correct-password',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: user.email, name: user.name }),
      );
      expect(usersService.create.mock.calls[0][0].passwordHash).not.toBe('correct-password');
      expect(result).toEqual({ access_token: 'signed-jwt' });
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns an access token for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.login({ email: user.email, password: 'correct-password' });

      expect(result).toEqual({ access_token: 'signed-jwt' });
    });
  });
});
