'use strict';

import https from 'https';

class CloudflareClient {
    private hostedZoneId: null|string|Promise<string>;
    private token:string;

    constructor(config: any, zoneId: string|null = null) {
        if (!('token' in config)) {
            throw new Error('Missing key `token` in cloudflare provider config');
        }

        this.token = config.token;
        this.hostedZoneId = zoneId;
    }

    public apiRequest(path: string, payload: any = null, method: string = 'GET'): any {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
        };
        const request = {
            host: `api.cloudflare.com`,
            port: '443',
            path: `/client/v4/${path}`,
            method: method,
            headers: headers
        };

        const isGet = method === 'GET';
        let requestBody:any;

        if (!isGet) {
            requestBody = JSON.stringify(payload);
            Object.assign(headers, {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody)
            });
        }

        return new Promise((resolve, reject) => {
            const req = https.request(request, res => {
                res.setEncoding("utf8");
                let responseBody:any = "";

                res.on("data", data => {
                    responseBody += data;
                });

                res.on("end", () => {
                    responseBody = JSON.parse(responseBody);
                    const isSuccess = responseBody.success === true;

                    if (!isSuccess && responseBody.error_chain) {
                        for (let error of responseBody.error_chain) {
                            console.error(`[${error.code}] ${error.message}`);
                        }
                    }

                    if (res.statusCode !== 200 || !isSuccess) {
                        reject(responseBody.errors[0].message || 'API Request failed');

                        return;
                    }

                    resolve(responseBody);
                });

                res.on('error', reject);
            });

            if (!isGet && requestBody) {
                req.write(requestBody);
            }
            req.end();
        });
    }

    private getHostedZoneId(hostname: string): string|Promise<string> {
        if (this.hostedZoneId) {
            return this.hostedZoneId;
        }

        return this.hostedZoneId = this.findHostedZoneId(hostname);
    }

    private async findHostedZoneId(hostname: string) {
        try {
            // let response:any = await this.client.zones.browse();
            let response:any = await this.apiRequest('zones');

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
        // let response:any = await this.client.dnsRecords.browse(zoneId);
        let response:any = await this.apiRequest(`zones/${zoneId}/dns_records`);

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
        return this.apiRequest(
            `zones/${zoneId}/dns_records/${recordId}`,
            {name, type: type, ttl: ttl, content: value, proxied: false},
            'PATCH'
        );
    }

    private createRecord(zoneId: string, name: string, value: string, type: string, ttl: number) {
        return this.apiRequest(
            `zones/${zoneId}/dns_records`,
            {name, type: type, ttl: ttl, content: value, proxied: false, priority: 10},
            'POST'
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
