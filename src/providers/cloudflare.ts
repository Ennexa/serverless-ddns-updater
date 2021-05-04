'use strict';

import Cloudflare from 'cloudflare';

class CloudflareClient {
    private client: Cloudflare;
    private hostedZoneId: null|string|Promise<string>;

    constructor(config: any, zoneId: string|null = null) {
        if (!('token' in config)) {
            throw new Error('Missing key `token` in cloudflare provider config');
        }

        this.client = new Cloudflare({ token : config.token });
        this.hostedZoneId = zoneId;
    }

    private getHostedZoneId(hostname: string): string|Promise<string> {
        if (this.hostedZoneId) {
            return this.hostedZoneId;
        }

        return this.hostedZoneId = this.findHostedZoneId(hostname);
    }

    private async findHostedZoneId(hostname: string) {
        try {
            let response:any = await this.client.zones.browse();

            if (!response.success) {
                throw new Error('API Request failed.');
            }

            let zone = response.result.find((zone: any) => `${hostname}`.endsWith(zone.name));

            if (!zone) {
                throw new Error('Could not find hosted zone.');
            }

            return zone.id;
        } catch(err: any) {
            throw new Error(`${err} Unable to retrieve cloudflare hosted zone id.`);
        }
    }

    private async getRecord(zoneId: string, name: string, type: string): Promise<any|null> {
        let response:any = await this.client.dnsRecords.browse(zoneId);

        if (!response.success) {
            throw new Error('API Request failed.');
        }

        for (let record of response.result) {
            if (record.name !== name || record.type !== type) {
                continue;
            }

            return record;
        }

        return null;
    }

    private updateRecord(zoneId: string, recordId: string, name: string, value: string, type: string, ttl: number) {
        return this.client.dnsRecords.edit(
            zoneId,
            recordId,
            {name, type: type as Cloudflare.RecordTypes, ttl: ttl, content: value, proxied: false}
        );
    }

    private createRecord(zoneId: string, name: string, value: string, type: string, ttl: number) {
        return this.client.dnsRecords.add(
            zoneId,
            {name, type: type as Cloudflare.RecordTypes, ttl: ttl, content: value, proxied: false, priority: 10}
        );
    }

    public async getIp(hostname: string, type: string): Promise<null|string> {
        const zoneId:string = await this.getHostedZoneId(hostname);
        const record = await this.getRecord(zoneId, hostname, type);

        return record?.content;
    }

    public async updateIp(hostname: string, value: string, type: string, ttl: number) {
        const zoneId:string = await this.getHostedZoneId(hostname);
        const record = await this.getRecord(zoneId, hostname, type);

        if (record) {
            return this.updateRecord(zoneId, record.id, hostname, value, type, ttl);
        }

        await this.createRecord(zoneId, hostname, value, type, ttl);
    }
}

export default CloudflareClient;
