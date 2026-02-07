import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import configuration from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { HttpClientModule } from './modules/http-client/http-client.module';
import { StudentModule } from './modules/student/student.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    HealthModule,
    HttpClientModule,
    StudentModule,

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDocker = process.env.DOCKER_ENV === 'true';
        const defaultRedis = isDocker ? 'redis://redis:6379' : 'redis://localhost:6379';
        const redisUrl = configService.get<string>('REDIS_URL', defaultRedis);
        const ttl = configService.get<number>('CACHE_TTL_MS', 86400000);

        return {
          stores: [new Keyv({ store: new KeyvRedis(redisUrl) })],
          ttl,
        };
      },
    }),
  ],
})
export class AppModule { }
