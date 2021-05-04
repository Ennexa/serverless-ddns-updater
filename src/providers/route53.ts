'use strict';

import {Route53} from 'aws-sdk';
import {HostedZone, ListResourceRecordSetsResponse, ListHostedZonesResponse, ResourceRecord} from 'aws-sdk/clients/route53';

class Route53Client {
    public client: Route53;
    public hostedZoneId: null|string|Promise<string>;

    constructor(zoneId: string|null = null) {
        this.client = new Route53();
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
            const result: ListHostedZonesResponse = await this.client.listHostedZones({}).promise();
            const zone = result.HostedZones
                .sort((item1: any, item2: any) => item2.length - item1.length)
                .find((zone: HostedZone) => `${hostname}.`.includes(zone.Name));

            if (!zone) {
                throw new Error('Could not find hosted zone.');
            }

            const zoneId = zone.Id;
            const start = zoneId.indexOf('e/') + 2;

            return zoneId.substring(start);
        } catch(err: any) {
            throw new Error(`${err} Unable to retrieve Route53 hosted zone id.`);
        }
    }

    private async getRecord(zoneId: string, name: string, type: string): Promise<ResourceRecord|null> {
        const params = {
            HostedZoneId: zoneId,
            StartRecordName: name,
            StartRecordType: type,
            MaxItems: '2'
        };

        const data: ListResourceRecordSetsResponse = await this.client.listResourceRecordSets(params).promise();

        for (let record of data.ResourceRecordSets) {
            if (record.Name !== `${name}.`) {
                continue;
            }
            if (!record.ResourceRecords) {
                break;
            }
            if (record.ResourceRecords.length > 1) {
                throw new Error('You should only have a single value for your dynamic record.  You currently have more than one.');
            }

            if (record.ResourceRecords.length == 1) {
                return record.ResourceRecords[0];
            }
        }

        return null;
    }

    private updateRecord(zoneId: string, name: string, value: string, type: string, ttl: number) {
        return this.client.changeResourceRecordSets({
            HostedZoneId: zoneId,
            ChangeBatch: {
                'Changes': [
                    {
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': name,
                            'Type': type,
                            'TTL': ttl,
                            'ResourceRecords': [
                                {
                                    'Value': value
                                }
                            ]
                        }
                    }
                ]
            }
        }).promise();
    }

    public async getIp(hostname: string, type: string) {
        const zoneId:string = await this.getHostedZoneId(hostname);
        const record = await this.getRecord(zoneId, hostname, type);

        return record?.Value;
    }

    public async updateIp(hostname: string, value: string, type: string, ttl: number) {
        const zoneId:string = await this.getHostedZoneId(hostname);

        await this.updateRecord(zoneId, hostname, value, type, ttl);
    }

}

export default Route53Client;
