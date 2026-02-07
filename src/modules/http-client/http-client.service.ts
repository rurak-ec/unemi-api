import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

export interface HttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  bearerToken?: string;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      timeout: 30_000,
      validateStatus: (status) => status < 500, // Reject on Server Errors (5xx) immediately
    });

    axiosRetry(this.client, {
      retries: 2,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        error.code === 'ECONNABORTED',
    });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<T> {
    const axiosConfig = this.buildConfig(config);
    this.logger.debug(`POST ${url}`);
    const response: AxiosResponse<T> = await this.client.post(
      url,
      data,
      axiosConfig,
    );
    return response.data;
  }

  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
    const axiosConfig = this.buildConfig(config);
    this.logger.debug(`GET ${url}`);
    const response: AxiosResponse<T> = await this.client.get(url, axiosConfig);
    return response.data;
  }

  private buildConfig(config?: HttpRequestConfig): AxiosRequestConfig {
    const headers: Record<string, string> = {
      accept: '*/*',
      'accept-language': 'es-419,es;q=0.9',
      'content-type': 'application/json',
      ...(config?.headers ?? {}),
    };

    if (config?.bearerToken) {
      headers['authorization'] = `Bearer ${config.bearerToken}`;
    }

    return {
      headers,
      params: config?.params,
      timeout: config?.timeout ?? 30_000,
    };
  }
}
