import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: { role: Role },
  ) {
    return this.usersService.create(dto, currentUser.role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.list({
      page,
      limit,
      role,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() currentUser: { _id: string; role: Role }) {
    if (
      currentUser.role !== Role.SUPER_ADMIN &&
      currentUser.role !== Role.ADMIN &&
      currentUser._id.toString() !== id
    ) {
      throw new ForbiddenException('You do not have permission to view this user.');
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: { _id: string; role: Role },
  ) {
    if (currentUser.role === Role.SUPER_ADMIN || currentUser._id.toString() === id) {
      return this.usersService.update(id, dto);
    }

    if (currentUser.role === Role.ADMIN) {
      const target = await this.usersService.findById(id);
      if (!target || ![Role.AUTHOR, Role.REVIEWER].includes(target.role)) {
        throw new ForbiddenException('You can only update author and reviewer accounts.');
      }
      return this.usersService.update(id, dto);
    }

    throw new ForbiddenException('You do not have permission to update this user.');
  }

  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  activate(@Param('id') id: string) {
    return this.usersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.usersService.setActive(id, false);
  }
}
