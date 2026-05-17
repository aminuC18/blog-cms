import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin() {
    const existing = await this.userModel.findOne({ role: Role.SUPER_ADMIN }).exec();
    if (existing) {
      return;
    }

    const hashed = await bcrypt.hash('Admin@123', 12);
    await this.userModel.create({
      name: 'Super Admin',
      email: 'admin@blog.com',
      password: hashed,
      role: Role.SUPER_ADMIN,
      isActive: true,
      username: 'super-admin',
    });
    this.logger.log('Seeded default SUPER_ADMIN user');
  }
}
