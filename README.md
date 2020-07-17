dueroku
=======

<!-- toc -->
# Usage
<!-- usage -->

# Commands
<!-- commands -->

# Some Docker debugging stuff

docker exec -it {container} /bin/bash
echo $DATABASE_PASSWORD
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME
docker run --env-file {container}.env -it {container} /bin/bash