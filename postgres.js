/**
 * Copyright 2013 Kris Daniels.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var { Pool } = require('pg');
var named = require('node-postgres-named');
var querystring = require('querystring');

module.exports = (RED) => {
  RED.httpAdmin.get('/postgresdb/:id', (req, res) => {
    var credentials = RED.nodes.getCredentials(req.params.id);
    if (credentials) {
      res.send(JSON.stringify({
        user: credentials.user,
        hasPassword: (credentials.password && credentials.password != "")
      }));
    } else {
      res.send(JSON.stringify({}));
    }
  });

  RED.httpAdmin.delete('/postgresdb/:id', (req, res) => {
    RED.nodes.deleteCredentials(req.params.id);
    res.send(200);
  });

  RED.httpAdmin.post('/postgresdb/:id', (req, res) => {
    var body = "";
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      var newCreds = querystring.parse(body);
      var credentials = RED.nodes.getCredentials(req.params.id) || {};
      if (newCreds.user == null || newCreds.user == "") {
        delete credentials.user;
      } else {
        credentials.user = newCreds.user;
      }
      if (newCreds.password == "") {
        delete credentials.password;
      } else {
        credentials.password = newCreds.password || credentials.password;
      }
      RED.nodes.addCredentials(req.params.id, credentials);
      res.send(200);
    });
  });

  const PostgresDatabaseNode = function(n) {
    RED.nodes.createNode(this, n);
    this.hostname = n.hostname;
    this.port = n.port;
    this.db = n.db;
    this.ssl = n.ssl;

    var credentials = this.credentials;
    if (credentials) {
      this.user = credentials.user;
      this.password = credentials.password;
    }
  }

  RED.nodes.registerType("postgresdb", PostgresDatabaseNode, {
    credentials: {
      user: {
        type: "text"
      },
      password: {
        type: "password"
      }
    }
  });

  const PostgresNode = function(n) {
    RED.nodes.createNode(this, n);

    var node = this;

    node.topic = n.topic;
    node.postgresdb = n.postgresdb;
    node.postgresConfig = RED.nodes.getNode(this.postgresdb);
    node.sqlquery = n.sqlquery;
    node.output = n.output;

    if (node.postgresConfig) {

      var connectionConfig = {
        user: node.postgresConfig.user,
        password: node.postgresConfig.password,
        host: node.postgresConfig.hostname,
        port: node.postgresConfig.port,
        database: node.postgresConfig.db,
        ssl: node.postgresConfig.ssl
      };

      var handleError = (err, msg) => {
        //node.error(msg); This line is committed and edited to take the msg object also.
        // This allows the error to be caught with a Catch node.
        node.error(err, msg);
        console.log(err);
        console.log(msg.payload);
      };

      var pool = new Pool(connectionConfig);

      node.on('input', async (msg) => {
        if (!Array.isArray(msg.payload)) {
          // Useful error message for transitioning from `postgres` to `postgres-multi`
          handleError(new Error('msg.payload must be an array of queries'));
          return;
        }

        try {
          const client = await pool.connect();

          named.patch(client);

          const queries = msg.payload.slice();
          const outMsg = Object.assign({}, msg);

          if (node.output) {
            outMsg.payload = [];
          }
          
          var queryError = false;
          var _queryCounts = [];
          for (let i=0; i < queries.length; ++i) {
            try {
              const { query, params = {}, output = false } = queries[i];
              const result = await client.query(query, params);
  
              if (output && node.output) {
                // Save count of rows returned by a query
                _queryCounts.push(result.rows.length);
                outMsg.payload = outMsg.payload.concat(result.rows);
              }
            } catch (e) {
              // Assign -1 to result count to indicate query failure
              _queryCounts.push(-1);
              handleError(e, msg);
            } finally {
              msg._queryCounts = _queryCounts;
            }
          }
          client.release();

          if (node.output) {
            // Save count of rows in payload
            outMsg._queryCounts = _queryCounts;
            node.send(outMsg);
          }
        } catch(e) {
          handleError(e, msg);
        }
      });
    } else {
      this.error("missing postgres configuration");
    }
  }

  RED.nodes.registerType("postgres", PostgresNode);
};