import {Module} from "@nestjs/common";
import {PrismaModule} from "../src/prisma/prisma.module";
import {UserModule} from "../user/user.module";
import {ConfigModule} from "@nestjs/config";
import {RabbitMQModule} from "../src/rabbitmq/rabbitmq.module";

@Module({
    imports: [
        PrismaModule,
        UserModule,
        ConfigModule,
        RabbitMQModule
    ],
    controllers: [MfaController],
    providers: [MfaService],
    exports: [MfaService],
})

export class MfaModule {}