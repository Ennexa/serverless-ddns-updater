'use strict';

const AWS = require('aws-sdk');

class DdnsUpdater {
    constructor(hostname, config) {
        this.route53 = new AWS.Route53();
        this.hostname = hostname + '.';
        this.config = config || {}
        this.hostedZoneId = this.getHostedZoneId();
    }
    
    getHostedZoneId() {
        if (this.config.zoneId) {
            return Promise.resolve([this.config.zoneId]);
        }
        return this.route53.listHostedZones({}).promise().then((result) => {
            let zone = result.HostedZones
                .sort((item1, item2) => item2.length - item1.length)
                .find((zone) => this.hostname.includes(zone.Name));
            if (zone) {
                const zoneId = zone.Id;
                const start = zoneId.indexOf('e/') + 2;
                return zoneId.substring(start);
            }
            throw new Error('Could not find hosted zone.');
        })
        .catch((err) => {
            throw new Error(`${err} Unable to retrieve Route53 hosted zone id.`);
        });
    }
    
    getCurrentRecord(zoneId) {
        
        var params = {
            HostedZoneId: zoneId,
            StartRecordName: this.hostname,
            StartRecordType: 'A',
            MaxItems: '2'
        };

        return this.route53.listResourceRecordSets(params).promise().then((data) => {
            for (var len = data.ResourceRecordSets.length, i = 0; i < len; i++) {
                var record = data.ResourceRecordSets[i];
                if (record.Name === this.hostname) {
                    if (record.ResourceRecords.length == 1) {
                        return record.ResourceRecords[0].Value;
                    } else if (record.ResourceRecords.length > 1) {
                        throw new Error('You should only have a single value for your dynamic record.  You currently have more than one.');
                    }
                    break;
                }
            }
            return 0;
        });
    }
    
    updateRecord(ip) {
        return this.getHostedZoneId().then((zoneId) =>  {
            return this.getCurrentRecord(zoneId).then((currentIp) => {
                if (currentIp === ip) {
                    return 'nochg ' + ip;
                }
                
                return this.route53.changeResourceRecordSets({
                    HostedZoneId: zoneId,
                    ChangeBatch: {
                        'Changes': [
                            {
                                'Action': 'UPSERT',
                                'ResourceRecordSet': {
                                    'Name': this.hostname,
                                    'Type': this.config.type || 'A',
                                    'TTL': this.config.ttl || 300,
                                    'ResourceRecords': [
                                        {
                                            'Value': ip
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }).promise().then(() => 'good ' + ip);
            });
        });
    }
}

module.exports = DdnsUpdater;
