# bats-ai

## Deployment with Docker (recommended quickstart)

This was a bit rushed so the deployment utilizes a single
docker file `docker-compose.prod.yml` in the root of the directory

I wanted some simple instructions below to configure the deployment

Be sure to use the proper hostname (batdetectai.kitware.com) in
all locations that require it.

## Docker Compose Differences

I created a `client` service which has it's own Dockerfile and
builds the vue client app.
The `client` service also uses a reverse proxy to route
`/api`, `/admin` fields to the django server.
The client will need to be built with a different Client ID
for accessing the server.

### Initial Setup for Deployment

1. Run `docker compose run --rm django ./manage.py migrate`
2. Run `docker compose run --rm django ./manage.py createsuperuser`
   and follow the prompts to create your own user
3. Run  `docker compose run --rm django ./manage.py makeclient \
                            --username your.super.user@email.address \
                            --uri https://batdetectai.kitware.com/`
4. Run `docker compose run --rm django ./manage.py loaddata species` to load species
   data into the database
5. Run `docker compose run --rm django ./manage.py collectstatic`
   to collect the static files
6. Run `docker compose -f docker-compose.prod.yml up` to start the server
   add `-d` for a silent version to run in the background
7. Copy over the ./dev/.env.prod.docker-compose.template
   to `./dev/.env.prod.docker-compose.template` and change the default passwords
8. Change the ID in the `./client/env.production` to a custom ID - this will
   probably require a `docker compose build` to build the app afterwards
9. After creating the basic application log into the django admin `batdetectai.kitware.com/admin`
   and change the ApplicationId to the ID in the `./client.env.production`
10. Test logging in/out and uploading data to the server.

### GRTS Cell Id suppoer

Make sure that there is the grts.csv in the /opt/batai/dev/grtsCells folder

Then run `docker compose run --rm django ./manage.py importGRTSCells /app/csv/grts.csv`

It may take a few minutes to upload because it is loading
around 500k rows into the DB.

### system.d service

Service that will automatically start and launch the server
Create this at `/etc/systemd/system` using sudo

```systemd
[Unit]
Description=batai-server
Requires=docker.service
After=docker.service

[Service]
ExecStartPre=/bin/sleep 10
Environment=PATH=/usr/bin:/sbin:/usr/sbin:/usr/local/sbin:/usr/local/bin
Restart=always
User=bryon
Group=docker
TimeoutStartSec=300
RestartSec=20
WorkingDirectory=/opt/batai
# Shutdown container (if running) when unit is started
ExecStartPre=docker compose down
# Start container when unit is started
ExecStart=docker compose -f docker-compose.prod.yml up
# Stop container when unit is stopped
ExecStop=docker compose down

[Install]
WantedBy=multi-user.target
```

After run `sudo systemctl enable batai.service`
Then to start you can use `sudo systemctl start batai.service`
Stopping: `sudo systemctl stop batai.service`

### User Management

There is no email server connected up so users need to be
individually approved and their email verified by an admin
