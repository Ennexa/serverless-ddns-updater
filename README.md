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

