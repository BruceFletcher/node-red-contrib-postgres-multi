## node-red-contrib-postgres-multi

A [Node-RED](http://nodered.org) node to query [PostgreSQL](http://www.postgresql.org/), with multiple query support.

Based on [node-red-contrib-postgres](https://github.com/krisdaniels/node-red-contrib/tree/master/node-red-contrib-postgres) by Kris Daniels.

### Compatibility

This module is designed assuming you will only use this one or Kris' original version in a project, but
not both at the same time. You can replace one with the other in your project and your flows will remain
connected.

* The configuration code is identical, so your database connection configuration should need no changes.
* The output format is identical (assuming equivalent queries)
* The input format is significantly different, and will require updates on any block generating
  queries to be passed to Postgres. (The queries shouldn't change, just the encapsulating data structure.)

### Requirements

This module uses JavaScript features only found in Node versions 8+.

### Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-postgres-multi

### Usage

Assemble your queries as an array of objects on msg.payload:

    msg.payload = [
        {
            query: 'begin',
        },
        {
            query: 'delete from mytable',
        },
        {
            query: 'insert into mytable (id, message) values (1, $hello), (2, $world)',
            params: {
                hello: 'Hi there',
                world: 'O\'Rorke',
            },
        },
        {
            query: 'commit',
        },
    ];

As you can see, this structure allows you to create your own transaction boundaries.

If you want the output of one or more queries, check the 'Receive output' box in the postgres node
and include an `output: true` member in the query object(s) you expect results from.
The results are then set on the msg.payload property of the outbound message.

    msg.payload = [
        {
            query: 'select message from mytable where id=$1',
            params: [1],
            output: true,
        },
        {
            query: 'select message from mytable where id=$1',
            params: [2],
            output: true,
        },
    ];

    # output:

    [
        ['Hi there'],
        ['O\'Rorke']
    ]

### Example DB

    begin;
    create table mytable
    (
        id integer not null,
        message character varying(20)
    );
    create unique index on mytable (id);
    commit;

### Example node-red flow

Import the flow below in an empty sheet in nodered

    [{"id":"460f2b8f.a23dbc","type":"tab","label":"Postgres example flows","disabled":false,"info":"# Postgres example flows\n\nThese flows demonstrate the use of the\n`node-red-contrib-postgres-multi` node.\n\n## Setup\n\nFor the flows in this tab,\nyou'll need a PostgreSQL table like so:\n\n    begin;\n    create table mytable\n    (\n        id integer not null,\n        message character varying(20)\n    );\n    create unique index on mytable (id);\n    commit;\n\nThen you'll need to configure the postgres\nblocks to have access to this database and table.\n"},{"id":"5498d534.e9cc54","type":"comment","z":"460f2b8f.a23dbc","name":"Reset","info":"This flow clears any contents from\nthe `mytable` table and inserts a single\nrecord:\n\n    id   message\n    1    'hello world'\n","x":90,"y":40,"wires":[]},{"id":"2ef9ce55.1ee282","type":"inject","z":"460f2b8f.a23dbc","name":"click me","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":120,"y":100,"wires":[["98595979.a97fe"]]},{"id":"98595979.a97fe","type":"function","z":"460f2b8f.a23dbc","name":"prepare","func":"\nmsg.payload = [\n    {\n        query: 'begin',\n    },\n    {\n        query: 'delete from mytable',\n    },\n    {\n        query: 'insert into mytable (id, message) values ($1, $2)',\n        params: [1, 'hello world'],\n    },\n    {\n        query: 'select * from mytable',\n        output: true,\n    },\n    {\n        query: 'commit',\n    },\n];\n\nreturn msg;","outputs":1,"noerr":0,"x":300,"y":100,"wires":[["30d1db79.179dd4"]]},{"id":"30d1db79.179dd4","type":"postgres","z":"460f2b8f.a23dbc","postgresdb":"5932c310.1c96d4","name":"","output":true,"outputs":1,"x":480,"y":100,"wires":[["87793132.0d9d88"]]},{"id":"87793132.0d9d88","type":"debug","z":"460f2b8f.a23dbc","name":"","active":true,"console":"false","complete":"false","x":679.5,"y":100,"wires":[]},{"id":"27e47fba.f5896","type":"comment","z":"460f2b8f.a23dbc","name":"Demo","info":"This flow demonstrates:\n\n* transactions and auto-commit queries\n* positional arguments (i.e. $argName)\n* query output from multiple queries\n","x":86.5,"y":182,"wires":[]},{"id":"2de05c89.ff8454","type":"inject","z":"460f2b8f.a23dbc","name":"click me","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":120,"y":240,"wires":[["b5127483.4ae8d8"]]},{"id":"b5127483.4ae8d8","type":"function","z":"460f2b8f.a23dbc","name":"prepare","func":"\nmsg.payload = [\n    {\n        query: 'begin',\n    },\n    {\n        query: 'delete from mytable',\n    },\n    {\n        query:\n            'insert into mytable (id, message) ' +\n            'values ($foo, $bar), ($baz, $boop)',\n        params: {\n            foo: 10,\n            bar: 'hello',\n            baz: 20,\n            boop: 'world',\n        },\n    },\n    {\n        query: 'commit',\n    },\n    {\n        query: 'select * from mytable',\n        output: true,\n    },\n    {\n        query: 'insert into mytable (id, message) values (30, \\'xtra\\')',\n    },\n    {\n        query: 'select message from mytable order by id',\n        output: true,\n    },\n];\n\nreturn msg;","outputs":1,"noerr":0,"x":300,"y":240,"wires":[["6308b299.b5a87c"]]},{"id":"6308b299.b5a87c","type":"postgres","z":"460f2b8f.a23dbc","postgresdb":"5932c310.1c96d4","name":"","output":true,"outputs":1,"x":480,"y":240,"wires":[["68797b5f.c0a3ec"]]},{"id":"68797b5f.c0a3ec","type":"debug","z":"460f2b8f.a23dbc","name":"","active":true,"console":"false","complete":"false","x":679.5,"y":240,"wires":[]},{"id":"35f6d8a5.a36018","type":"comment","z":"460f2b8f.a23dbc","name":"Rollback","info":"If you start a transaction and don't commit it,\nyour changes will not be saved.","x":100,"y":320,"wires":[]},{"id":"ba356a1b.b7c2e8","type":"inject","z":"460f2b8f.a23dbc","name":"click me","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":120,"y":380,"wires":[["73628965.7539d8"]]},{"id":"73628965.7539d8","type":"function","z":"460f2b8f.a23dbc","name":"prepare","func":"\nmsg.payload = [\n    {\n        query: 'begin',\n    },\n    {\n        query: 'delete from mytable',\n    },\n    {\n        query:\n            'insert into mytable (id, message) ' +\n            'values ($foo, $bar), ($baz, $boop), ($bing, $bang)',\n        params: {\n            foo: 10,\n            bar: 'one does not simply',\n            baz: 20,\n            boop: 'begin',\n            bing: 30,\n            bang: 'but not commit',\n        },\n    },\n    {\n        query: 'select message from mytable order by id',\n        output: true,\n    },\n];\n\nreturn msg;","outputs":1,"noerr":0,"x":300,"y":380,"wires":[["f7c2f77b.85d6b8"]]},{"id":"f7c2f77b.85d6b8","type":"postgres","z":"460f2b8f.a23dbc","postgresdb":"5932c310.1c96d4","name":"","output":true,"outputs":1,"x":480,"y":380,"wires":[["77248a23.6a48b4","b5a1d7d5.4301a8"]]},{"id":"77248a23.6a48b4","type":"debug","z":"460f2b8f.a23dbc","name":"","active":true,"console":"false","complete":"false","x":679.5,"y":380,"wires":[]},{"id":"b5a1d7d5.4301a8","type":"function","z":"460f2b8f.a23dbc","name":"check","func":"\nmsg.payload = [\n    {\n        query: 'select message from mytable order by id',\n        output: true,\n    },\n];\n\nreturn msg;","outputs":1,"noerr":0,"x":290,"y":460,"wires":[["d8d8e5bc.f76488"]]},{"id":"d8d8e5bc.f76488","type":"postgres","z":"460f2b8f.a23dbc","postgresdb":"5932c310.1c96d4","name":"","output":true,"outputs":1,"x":480,"y":460,"wires":[["b0f96526.7a4648"]]},{"id":"b0f96526.7a4648","type":"debug","z":"460f2b8f.a23dbc","name":"","active":true,"console":"false","complete":"false","x":679.5,"y":460,"wires":[]},{"id":"5932c310.1c96d4","type":"postgresdb","z":"","hostname":"localhost","port":"5432","db":"foo","ssl":false}]