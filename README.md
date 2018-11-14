## Serverless DDNS Updater

A Dynamic DNS updater service using [Serverless](https://serverless.com/) framework.

### Installation

Clone the repository
```
git clone https://github.com/Ennexa/serverless-ddns-updater
```
Install project dependencies
```
npm install
```

Copy the included file `config.json.sample` to `config.json` and add your dynamic host details. Change the default username and password. (The default username / password is `admin` and `secret`)

Password should be hashed with bcrypt. You can use an online service like https://bcrypt-generator.com/ for generating the hash.

Finally, activate the service
```
./node_modules/.bin/sls create_domain -s production
./node_modules/.bin/sls deploy -s production
```

It is highly recommended to [secure your APIGateway](https://www.gorillastack.com/news/secure-your-serverless-projects-endpoints-with-aws-certificate-manager/) endpoint using free SSL certificate from ACM.

### Updating IP Address

The dynamic ip address can be updated by sending a GET request to the APIGateway endpoint

```
curl -s https://<username>:<password><endpoint_domain>/update?hostname=<dynamic_hostname>
```

You may also use the `ddns-update` client included with this project. The client can be configured using

- **Command line arguments**

  ```
  ddns-update -h <endpoint_domain> -u <username> -p <password> -s set <dynamic_hostname>
  ```

  See `./ddns-update --help` for all available options

- **Environment variables**
  
  The client can also be configured by defining the following environment variables
  ```
  DDNS_USERNAME=<username>      # Username from config.json
  DDNS_PASSWORD=<pssword>       # Password from config.json
  DDNS_SERVER=<endpoint_domain> # DDNS server endpoint hostname from config.json
  DDNS_SECURE=1                 # Required only If you have enabled SSL in ApiGateway (highly recommended).
  ```

- **Configuration file**
  
  You man also create a persistent configuration by saving the above configuration variables to any of the following locations
  - ~/.ddns-update-rc
  - /usr/local/etc/ddns-update
  - /etc/ddns-update
