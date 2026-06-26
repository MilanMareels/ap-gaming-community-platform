import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CreateWhitelistDto,
  UpdateUserDto,
  UserDetailDto,
  UserListItemDto,
  UserListQueryDto,
  WhitelistEntryDto,
} from '../../dtos/users/user.dto.js';
import { AdminGuard } from '../../guards/admin.guard.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with filters (Admin only)' })
  @ApiOkResponse({ type: [UserListItemDto] })
  list(@Query() query: UserListQueryDto): Promise<UserListItemDto[]> {
    return this.usersService.list({
      search: query.search,
      adminOnly: query.adminOnly === 'true',
      noShowsOnly: query.noShowsOnly === 'true',
    });
  }

  @Get('whitelist')
  @ApiOperation({ summary: 'List pending SSO whitelist entries (Admin only)' })
  @ApiOkResponse({ type: [WhitelistEntryDto] })
  listWhitelist() {
    return this.usersService.listWhitelist();
  }

  @Post('whitelist')
  @ApiOperation({ summary: 'Pre-authorize an external SSO email for a user (Admin only)' })
  createWhitelist(@Body() dto: CreateWhitelistDto) {
    return this.usersService.createWhitelist(dto);
  }

  @Delete('whitelist/:email')
  @ApiOperation({ summary: 'Remove a whitelist entry (Admin only)' })
  deleteWhitelist(@Param('email') email: string) {
    return this.usersService.deleteWhitelist(email);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user detail (Admin only)' })
  @ApiOkResponse({ type: UserDetailDto })
  getById(@Param('id') id: string): Promise<UserDetailDto> {
    return this.usersService.getById(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Post(':id/promote')
  @ApiOperation({ summary: 'Promote user to admin (Admin only)' })
  promote(@Param('id') id: string) {
    return this.usersService.promoteToAdmin(+id);
  }

  @Delete(':id/admin')
  @ApiOperation({ summary: 'Demote user from admin (Admin only)' })
  demote(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.demoteFromAdmin(+id, this.currentUserId(req));
  }

  @Delete(':id/sso/:provider')
  @ApiOperation({ summary: 'Unlink an SSO provider from a user (Admin only)' })
  unlinkSso(@Param('id') id: string, @Param('provider') provider: string) {
    if (provider !== 'google' && provider !== 'microsoft') {
      throw new UnauthorizedException('Unknown provider');
    }
    return this.usersService.unlinkSso(+id, provider);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user and cascade their reservations (Admin only)' })
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.delete(+id, this.currentUserId(req));
  }

  private currentUserId(req: Request): number {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user.sub;
  }
}
