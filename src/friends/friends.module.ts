import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PushModule } from 'src/push/push.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [AuthModule, PushModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
