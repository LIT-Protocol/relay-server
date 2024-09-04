#!/bin/ash

if [ -f /mnt/secrets/default ]; then
    # this fill export key values into env
    export $(cat /mnt/secrets/default | xargs)
    cp /mnt/secrets/default /app/.env
fi

yarn start