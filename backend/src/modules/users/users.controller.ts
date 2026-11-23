import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CreateUserNoteDto,
  CreateWhitelistDto,
  UpdateUserDto,
  UpdateUserNoteDto,
  UserDetailDto,
  UserListQueryDto,
  UserListResponseDto,
  UserNoteDto,
  WhitelistEntryDto,
} from '../../dtos/users/user.dto.js';
import { RbacService } from '../rbac/rbac.service.js';
import { PermissionGuard } from '../../guards/permission.guard.js';
import { RequirePermissions } from '../../decorators/require-permissions.decorator.js';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard.js';
import type { JwtPayload } from '../auth/types/jwt-payload.type.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  @RequirePermissions('users.view', 'users.manage')
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ type: UserListResponseDto })
  list(@Query() query: UserListQueryDto): Promise<UserListResponseDto> {
    return this.usersService.list({
      search: query.search,
      adminOnly: query.adminOnly === 'true',
      noShowsOnly: query.noShowsOnly === 'true',
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('whitelist')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'List pending SSO whitelist entries' })
  @ApiOkResponse({ type: [WhitelistEntryDto] })
  listWhitelist() {
    return this.usersService.listWhitelist();
  }

  @Post('whitelist')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Pre-authorize an external SSO email for a user' })
  createWhitelist(@Body() dto: CreateWhitelistDto) {
    return this.usersService.createWhitelist(dto);
  }

  @Delete('whitelist/:email')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Remove a whitelist entry' })
  deleteWhitelist(@Param('email') email: string) {
    return this.usersService.deleteWhitelist(email);
  }

  @Get(':id')
  @RequirePermissions('users.view', 'users.manage')
  @ApiOperation({ summary: 'Get user detail' })
  @ApiOkResponse({ type: UserDetailDto })
  getById(@Param('id') id: string): Promise<UserDetailDto> {
    return this.usersService.getById(+id);
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(+id, dto);
  }

  @Delete(':id/sso/:provider')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Unlink an SSO provider from a user' })
  unlinkSso(@Param('id') id: string, @Param('provider') provider: string) {
    if (provider !== 'google' && provider !== 'microsoft') {
      throw new UnauthorizedException('Unknown provider');
    }
    return this.usersService.unlinkSso(+id, provider);
  }

  @Post(':id/notes')
  @RequirePermissions('users.view', 'users.manage')
  @ApiOperation({ summary: 'Add a note, warning or block (block requires users.block) to a user' })
  @ApiCreatedResponse({ type: UserNoteDto })
  async createNote(@Param('id') id: string, @Body() dto: CreateUserNoteDto, @Req() req: Request): Promise<UserNoteDto> {
    const userId = this.currentUserId(req);
    return this.usersService.createNote(+id, userId, dto, await this.permissionsOf(req));
  }

  @Patch(':id/notes/:noteId')
  @RequirePermissions('users.view', 'users.manage')
  @ApiOperation({ summary: 'Edit or end a note (own notes always, others require users.notes.delete_others; blocks require users.block)' })
  @ApiOkResponse({ type: UserNoteDto })
  async updateNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateUserNoteDto,
    @Req() req: Request,
  ): Promise<UserNoteDto> {
    return this.usersService.updateNote(+id, +noteId, this.currentUserId(req), dto, await this.permissionsOf(req));
  }

  @Delete(':id/notes/:noteId')
  @RequirePermissions('users.view', 'users.manage')
  @ApiOperation({ summary: 'Delete a note (own notes always, others require users.notes.delete_others; blocks require users.block)' })
  async deleteNote(@Param('id') id: string, @Param('noteId') noteId: string, @Req() req: Request) {
    return this.usersService.deleteNote(+id, +noteId, this.currentUserId(req), await this.permissionsOf(req));
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Delete a user and cascade their reservations' })
  delete(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.delete(+id, this.currentUserId(req));
  }

  /** The permissions that count for this request: those of the impersonated role when impersonating one. */
  private async permissionsOf(req: Request): Promise<Set<string>> {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (user?.impersonatingRoleId) return new Set(user.permissions ?? []);
    return this.rbacService.getPermissionsForUser(this.currentUserId(req));
  }

  private currentUserId(req: Request): number {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('Unauthorized');
    return user.sub;
  }
}
