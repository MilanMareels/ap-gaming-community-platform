import { ExecutionContext, HttpException, createParamDecorator } from '@nestjs/common';

export const GetUser = createParamDecorator((data: keyof any, ctx: ExecutionContext) => {
  const response = ctx.switchToHttp().getResponse();
  const { user } = response.locals;

  if (!user) {
    throw new HttpException('User not authenticated', 401);
  }

  return data ? user[data] : user;
});
