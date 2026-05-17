import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { generateSlug } from '../common/utils/slug.util';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string, includePassword = false) {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (includePassword) {
      query.select('+password +refreshToken');
    }
    return query.exec();
  }

  async findByUsername(username: string) {
    return this.userModel.findOne({ username: username.toLowerCase() }).exec();
  }

  async create(dto: CreateUserDto, actorRole: Role) {
    this.assertAssignableRole(actorRole, dto.role);

    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 12);
    const baseUsername = generateSlug(dto.name) || `user-${Date.now()}`;
    let username = baseUsername;
    let counter = 1;
    while (await this.userModel.exists({ username })) {
      username = `${baseUsername}-${counter++}`;
    }

    const user = await this.userModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashed,
      username,
    });

    return this.sanitize(user);
  }

  async list(query: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const filter: Record<string, unknown> = {};

    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: items.map((user) => this.sanitize(user)),
      meta: this.buildMeta(total, page, limit),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.username) {
      const existing = await this.userModel.findOne({
        username: dto.username.toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('Username already in use');
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          ...(dto.username ? { username: dto.username.toLowerCase() } : {}),
        },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitize(user);
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive }, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitize(user);
  }

  async storeRefreshToken(userId: string, refreshToken: string, expiry: Date) {
    const hashed = await bcrypt.hash(refreshToken, 12);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashed,
      refreshTokenExpiry: expiry,
    });
  }

  async clearRefreshToken(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1, refreshTokenExpiry: 1 },
    });
  }

  async validateRefreshToken(userId: string, refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.userModel
      .findById(userId)
      .select('+refreshToken')
      .exec();

    if (
      !user ||
      !user.isActive ||
      !user.refreshToken ||
      !user.refreshTokenExpiry ||
      user.refreshTokenExpiry < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const valid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.sanitize(user);
  }

  async validatePassword(user: UserDocument, password: string) {
    const withPassword = await this.userModel
      .findById(user._id)
      .select('+password')
      .exec();
    if (!withPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return bcrypt.compare(password, withPassword.password);
  }

  private assertAssignableRole(actorRole: Role, targetRole: Role) {
    if (actorRole === Role.SUPER_ADMIN) {
      return;
    }

    if (actorRole === Role.ADMIN && [Role.AUTHOR, Role.REVIEWER].includes(targetRole)) {
      return;
    }

    throw new ForbiddenException('Cannot assign this role');
  }

  sanitize(user: UserDocument) {
    const plain = user.toObject();
    const { password: _password, refreshToken: _refreshToken, refreshTokenExpiry: _refreshTokenExpiry, ...safeUser } =
      plain;
    return safeUser;
  }

  private buildMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
}
