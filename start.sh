#!/bin/ash

if [ -f /mnt/secrets/default ]; then
    # this fill export key values into env
    export $(cat /mnt/secrets/default | xargs)
fi

yarn start