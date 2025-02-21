import {ConfigModule, ConfigService} from "@nestjs/config";
import {ClientProxyFactory, Transport} from "@nestjs/microservices";
import {Module} from "@nestjs/common";
import {RabbitMQService} from "./rabbitmq.service";

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'RABBITMQ_SERVICE',
            useFactory: (configService: ConfigService) => {
                return ClientProxyFactory.create({
                    options: {
                        transport: Transport.RMQ,
                        urls: [configService.get<string>('RABBITMQ_URL')],
                        queue: 'auth-queue',
                        queueOptions: {
                            durable: false
                        },
                    },
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: [RabbitMQService],
})
export class RabbitMQModule {}