import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config";
import {PrismaModule} from "./prisma/prisma.module";
import {RabbitMQModule} from "./rabbitmq/rabbitmq.module";
import {AuthModule} from "../auth/auth.module";
import {UserModule} from "../user/user.module";
import {MfaModule} from "../mfa/mfa.module";

@Module({
  imports: [
      // Import the ConfigModule
      ConfigModule.forRoot({
        isGlobal: true, // set to true to make the config module global,
        envFilePath: '.env',
      }),
      PrismaModule,
      AuthModule,
      UserModule,
      MfaModule,
      RabbitMQModule
  ],
})
export class AppModule {}
