# bats-ai

## Develop with Docker (recommended quickstart)

This is the simplest configuration for developers to start with.

### Initial Setup

1. Run `docker compose run --rm django ./manage.py migrate`
2. Run `docker compose run --rm django ./manage.py createsuperuser`
   and follow the prompts to create your own user
3. Run  `docker compose run --rm django ./manage.py makeclient \
                            --username your.super.user@email.address \
                            --uri http://localhost:3000/`

### Run Vue Frontend

1. Run `cd client/`
2. Run `npm install`
3. Run `npm run dev`

### Run Application

1. Run `docker compose up`
2. Access the site, starting at <http://localhost:8000/admin/>
3. When finished, use `Ctrl+C`

### Application Maintenance

Occasionally, new package dependencies or schema changes will necessitate
maintenance. To non-destructively update your development stack at any time:

1. Run `docker compose pull`
2. Run `docker compose build --pull --no-cache`
3. Run `docker compose run --rm django ./manage.py migrate`
4. Run `docker compose run --rm django ./manage.py createsuperuser`
5. Run `docker compose run --rm django ./manage.py loaddata species` to load species
   data into the database
6. Run  `docker compose run --rm django ./manage.py makeclient \
                            --username your.super.user@email.address \
                            --uri http://localhost:3000/`

## Develop Natively (advanced)

This configuration still uses Docker to run attached services in the background,
but allows developers to run Python code on their native system.

### Dev Tool Endpoints

1. Main Site Interface [http://localhost:3000/](http://localhost:3000/)
2. Site Administration [http://localhost:8000/admin/](http://localhost:8000/admin/)
3. Swagger API (These are default swagger endpoints using Django-REST) [http://localhost:8000/api/docs/swagger/](http://localhost:8000/api/docs/swagger/)
4. Django Ninja API [http://localhost:8000/api/v1/docs#/](http://localhost:8000/api/v1/docs#/)
5. MinIO (S3 local management) [http://localhost:9001/browser](http://localhost:9001/browser)
   Username: 'minioAccessKey'
   Password: 'minioSecretKey'

### Initial Setup (Natively)

1. Run `docker compose -f ./docker-compose.yml up -d`
2. Install Python 3.10
3. Install
   [`psycopg2` build prerequisites](https://www.psycopg.org/docs/install.html#build-prerequisites)
4. Create and activate a new Python virtualenv
5. Run `pip install -e .[dev]`
6. Run `source ./dev/export-env.sh`
7. Run `./manage.py migrate`
8. Run `./manage.py createsuperuser` and follow the prompts to create your own user

### Run Application (Natively)

1. Ensure `docker compose -f ./docker-compose.yml up -d` is still active
2. Run:
   1. `source ./dev/export-env.sh`
   2. `./manage.py runserver`
3. Run in a separate terminal:
   1. `source ./dev/export-env.sh`
   2. `celery --app bats_ai.celery worker --loglevel INFO --without-heartbeat`
4. When finished, run `docker compose stop`
5. To destroy the stack and start fresh, run `docker compose down -v`

## Remap Service Ports (optional)

Attached services may be exposed to the host system via alternative ports. Developers
who work on multiple software projects concurrently may find this helpful to avoid
port conflicts.

To do so, before running any `docker compose` commands, set any of the environment
variables:

* `DOCKER_POSTGRES_PORT`
* `DOCKER_RABBITMQ_PORT`
* `DOCKER_MINIO_PORT`

The Django server must be informed about the changes:

* When running the "Develop with Docker" configuration, override the environment
  variables:
  * `DJANGO_MINIO_STORAGE_ENDPOINT`, using the port from `DOCKER_MINIO_PORT`.
* When running the "Develop Natively" configuration, override the environment
  variables:
  * `DJANGO_DATABASE_URL`, using the port from `DOCKER_POSTGRES_PORT`
  * `DJANGO_CELERY_BROKER_URL`, using the port from `DOCKER_RABBITMQ_PORT`
  * `DJANGO_MINIO_STORAGE_ENDPOINT`, using the port from `DOCKER_MINIO_PORT`

Since most of Django's environment variables contain additional content, use the
values from the appropriate `dev/.env.docker-compose*` file as a baseline for
overrides.

## Testing

### Initial Setup (Testing)

tox is used to execute all tests.
tox is installed automatically with the `dev` package extra.

When running the "Develop with Docker" configuration, all tox commands must be run
as `docker-compose run --rm django tox`; extra arguments may also be appended to
this form.

### Running Tests

Run `tox` to launch the full test suite.

Individual test environments may be selectively run.
This also allows additional options to be be added.
Useful sub-commands include:

* `tox -e lint`: Run only the style checks
* `tox -e type`: Run only the type checks
* `tox -e test`: Run only the pytest-driven tests

To automatically reformat all code to comply with
some (but not all) of the style checks, run `tox -e format`.

## Code Formatting

Any contributed code should be compliant with `PEP8`, which is enforced by
`flake8` via `pre-commit`. It's recommended that you use `pre-commit` to ensure
linting procedures are run on any commit you make. See the
[installation instructions](https://pre-commit.com/#install) for your OS/platform
to install.

After you have the software installed, run `pre-commit install` on the command line.
Now every time you commit to this project's code base the linter procedures will
automatically run over the changed files.

To install the linting Python dependencies, run:

```bash
pip install -r pre-commit
```

To run pre-commit on files preemptively from the command line use:

```bash
 git add .
 pre-commit run

 # or

 pre-commit run --all-files
```

See `.pre-commit-config.yaml` for a list of configured linters and fixers.

To add `pre-commit` as a Git hook, run the following:

```bash
pre-commit install
```

This will run the `pre-commit` update prior to finalizing a local commit.  This
is preferred because once the commit is created locally, you will need to rebase
or otherwise rewrite the commit to make adjustments if done after the fact.

Lastly, the GitLab CI/CD infrastructure runs the same `pre-commit` configuration
on all pipelines for new MRs.  The automated checks in GitLab are optional, but
it is highly recommended to perform these checks locally prior to pushing new
commits.
