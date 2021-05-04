'use strict';

import Route53 from './providers/route53';
import { IHostConfig} from './config';

class DdnsUpdater {
    private client: any;
    private config: any;
    private provider: any;

    constructor(hostname: string, hostConfig: IHostConfig, provider: any) {
        this.client = new Route53();
        this.config = hostConfig || {};
        this.provider = provider;
    }

    update(hostname: string, ip?: string) {
        return this.client.updateIp(
            hostname,
            ip,
            this.config.record_type || 'A',
            this.config.record_ttl || 300
        );
    }

    get(hostname: string): Promise<string|null> {
        return this.client.getIp(hostname, this.config.record_type || 'A');
    }
}

export default DdnsUpdater;
