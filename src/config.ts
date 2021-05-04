import { readFile } from 'fs/promises';

export interface IHostConfig {
    'record_type'?: string,
    'record_ttl'?: number,
    'shared_secret': string,
    'dns_provider': string
}

export interface IConfig {
    'auth_backends': {
        'predefined': {
            'users': Record<string, string>
        }
    },
    'update_endpoint': string,
    'hosts': Record<string, IHostConfig>,
    'dns_providers': Record<string, any>
}

export class Loader {
    private static config: IConfig;

    static async load(): Promise<IConfig> {
        if (!Loader.config) {
            const json:Buffer = await readFile(process.env.CONFIG_FILE || './config.json');
            const config = JSON.parse(json.toString());

            Loader.validate(config);
            Loader.config = config;
        }

        return Loader.config;
    }

    static validate(config: IConfig) {
        let provider: string, host: IHostConfig;

        if (!config.dns_providers) {
            config.dns_providers = {};
        }

        if (!config.dns_providers.default) {
            config.dns_providers.default = {
                dns_provider: 'route53'
            };
        }

        for (let provider in config.dns_providers) {
            let providerConfig = config.dns_providers[provider];

            if (!('dns_provider' in providerConfig)) {
                throw new Error(`Expected key dns_providers.${provider}.dns_provider not found in config.json`);
            }

            if (!['cloudflare', 'route53'].includes(providerConfig.dns_provider)) {
                throw new Error(`Unsupported dns provider ${providerConfig.dns_provider}`);
            }
        }

        for (const hostname in config.hosts) {
            host = config.hosts[hostname];
            host.dns_provider = host.dns_provider || 'default';

            if (!(host.dns_provider in config.dns_providers)) {
                throw new Error(`Expected key dns_providers.${host.dns_provider} not found in config.json`);
            }
        }
    }
}
