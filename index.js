var AWS = require('aws-sdk');
//var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var util = require('util'), uuid = require('uuid');


/**
 * Dynamojo
 *
 * A simplified nodejs client for DynamoDB on AWS.
 *
 * @namespace dynamojo
 * @type {Object}
 * @version v1
 */

var dynamojo = {
  /**
   * dynamojo.config
   * @desc Configure AWS credentials and endpoint
   * @alias dynamojo.config
   * @memberOf! dynamojo
   *
   * @param {object} options Your custom aws configure options
   */
  config: function(options){
    //AWS.config.update(options);
    docClient = new AWS.DynamoDB.DocumentClient(options);
  },
 /**
  * dynamojo.get
  * @desc Get an item by primary id.
  * @alias dynamojo.get
  * @memberOf! dynamojo
  *
  * @param {string} table The DynamoDB TableName
  * @param {string} id The primary index value. Usually a the id UUID.
  * @param {object=} fields (optional) Only return these fields.
  * @param {callback} callback The callback that handles the response.
  */

  get: function(table, id, fields, callback){
    var params = {
      Key:(typeof id=='object' ? id : {id:id}),
      TableName:table
    }

    if(Array.isArray(fields)){
      params.AttributesToGet = fields;
    }else if(typeof fields=='function'){
      callback = fields;
    }

    docClient.get(params, function(err, data) {
      //var resp = data.Item ? data.Item : null;
      var resp = data && data.hasOwnProperty("Item") ? data.Item : null;
      callback(err, resp);
    });
  },
  /**
   * dynamojo.getByKey
   * @desc Get an item by primary id.
   * @alias dynamojo.getByKey
   * @memberOf! dynamojo
   *
   * @param {string} table The DynamoDB TableName
   * @param {string} indexName The DynamoDB IndexName
   * @param {string} key DynamoDB key name
   * @param {string} value DynamoDB key value
   * @param {object=} fields (optional) Only return these fields.
   * @param {callback} callback The callback that handles the response.
   */
  getByKey: function(table, indexName, key, value, fields, callback){
    var pkey = ":"+key;
    var eav = {};
    eav[pkey] = value;
    var params = {
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: key+' = '+pkey,
      ExpressionAttributeValues: eav
    };

    if(Array.isArray(fields)){
      params.AttributesToGet = fields;
    }else if(typeof fields=='function'){
      callback = fields;
    }

    docClient.query(params, function(err, data) {
      if(err){ callback(err); return; }
      var item = data && data.hasOwnProperty('Items') ? data.Items[0] : null;
      callback(err, item);
    });
  },

  /**
  * dynamojo.list
  * @desc Lists all items in a table
  * @alias dynamojo.list
  * @memberOf! dynamojo
  *
  * @param {string} table DynamoDB TableName
  * @param {callback} callback The callback that handles the response.
  */
  list: function(table, callback){
    var params = {
      TableName: table
    };
    docClient.scan(params, function(err, data) {
      if(err){ callback(err); return; }
      var item = data && data.hasOwnProperty('Items') ? data.Items : null;
      callback(err, item);
    });
  },

  /**
  * dynamojo.listByKey
  * @desc Lists all items in a table
  * @alias dynamojo.listByKey
  * @memberOf! dynamojo
  *
  * @param {string} table The DynamoDB TableName
  * @param {string} indexName The DynamoDB IndexName
  * @param {string} key DynamoDB key name
  * @param {string} value DynamoDB key value
  * @param {object=} qf (optional) An optional query, passed as an object.
  * @param {callback} callback The callback that handles the response.
  */
  listByKey: function(table, indexName, key, value, qf, callback){

    var eav = {};
    eav[":"+key] = value;
    var params = {
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: key+' = :'+key,
      ExpressionAttributeValues: eav
    };

    if(typeof qf=='object'){
      var fe = [];
      Object.keys(qf).forEach(function(k){
        params.ExpressionAttributeValues[":"+k] = qf[k];
        fe.push( k+" = :"+k );
      });
      params.FilterExpression = fe.join(',');
    }else if(typeof qf=='function'){
      callback = qf;
    }
    docClient.query(params, function(err, data) {
      var resp = !err && data.hasOwnProperty("Items") ? data.Items : [];
      callback(err, resp);
    });
  },

  /**
  * dynamojo.insert
  * @desc Insert a new item into the table, also generates and returns a new UUID for the `id` key.
  * @alias dynamojo.insert
  * @memberOf! dynamojo
  *
  * @param {string} table The DynamoDB TableName
  * @param {object} item The new item, passed as an object.
  * @param {callback} callback The callback that handles the response.
  */

  insert: function(table, obj, callback){
    if(typeof obj.id=='undefined'){ obj.id = uuid(); }
    var params = {
      TableName : table,
      Item: obj
    };
    docClient.put(params, function(err,data){
      callback(err, obj);
    });
  },

  /**
  * dynamojo.update
  * @desc Update values for a single item by primary index.
  * @alias dynamojo.update
  * @memberOf! dynamojo
  *
  * @param {string} table The DynamoDB TableName
  * @param {string|object} id The primary index value. Usually a the id UUID, but can be an object for sort keys
  * @param {object} update The new item values, passed as an object.
  * @param {callback} callback The callback that handles the response.
  */
  update: function(table, id, update, callback){

    //don't update the id again
    if('id' in update) delete update.id;
    var exp = [];
    var eav = {};
    var ean = {};
    var range = [65,90];
    Object.keys(update).forEach(function(key,i){
      var kcode = (range[0]+i);
      var kl = String.fromCharCode(kcode).toLowerCase();
      kl = kcode > 90 ? kl+String.fromCharCode(kcode).toLowerCase() : kl;
      //var uobj = {};
      //uobj["#"+kl] = key;
      //exp.push(JSON.stringify(uobj)+" = :"+kl);
      exp.push("#"+key+" = :"+kl);
      ean["#"+key] = key;
      eav[":"+kl] = update[key];
    });

    var updateExp = util.format("set %s", exp.join(', '));
    // console.log("updateExp", updateExp);
    // console.log("EAV", eav);

    var params = {
        TableName:table,
        Key:(typeof id=='object' ? id : {id:id}),
        UpdateExpression: updateExp,
        ExpressionAttributeNames: ean,
        ExpressionAttributeValues: eav,
        ReturnValues: "UPDATED_NEW"
    };
    docClient.update(params, function(err, data) {
      if(err){
        callback(err);
        return;
      }
      docClient.get({Key:(typeof id=='object' ? id : {id:id}), TableName:table}, function(err, data){
        var resp = data && data.hasOwnProperty("Item") ? data.Item : null;
        callback(err, resp);
      });
    });

  },
  /**
   * dynamojo.updateByKey
   * @desc Update an item by using a GSI index.
   * @alias dynamojo.updateByKey
   * @memberOf! dynamojo
   *
   * @param {string} table The DynamoDB TableName
   * @param {string} indexName The DynamoDB IndexName
   * @param {string} key DynamoDB key name
   * @param {string} value DynamoDB key value
   * @param {object} update The key/values to update
   * @param {callback} callback The callback that handles the response.
   */
  updateByKey: function(table, indexName, key, value, update, callback){
    dynamojo.getByKey(table, indexName, key, value, function(err,item){
      dynamojo.update(table, item.id, update, callback);
    });
  },

  /**
   * dynamojo.remove
   * @desc Deletes an item by primary id.
   * @alias dynamojo.remove
   * @memberOf! dynamojo
   *
   * @param {string} table The DynamoDB TableName
   * @param {string} id The primary index value. Usually a the id UUID.
   * @param {callback} callback The callback that handles the response.
   */

   remove: function(table, id, callback){
     var params = {
       Key:(typeof id=='object' ? id : {id:id}),
       TableName:table
     }
     docClient.delete(params, function(err, data) {
       //var resp = data.Item ? data.Item : null;
      //  var resp = data && data.hasOwnProperty("Item") ? data.Item : null;
       callback(err, data);
     });
   },

  /**
  * dynamojo.countByKey
  * @desc Insert a new item into the table, also generates and returns a new UUID for the `id` key.
  * @alias dynamojo.countByKey
  * @memberOf! dynamojo
  *
  * @param {string} table The DynamoDB TableName
  * @param {string} indexName The DynamoDB IndexName
  * @param {string} key DynamoDB key name
  * @param {string} value DynamoDB key value
  * @param {object=} qf (optional) An optional filter, passed as an object.
  * @param {callback} callback The callback that handles the response.
  */

  countByKey: function(table, indexName, key, value, qf, callback){
    var eav = {};
    eav[":"+key] = value;
    var params = {
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: key+' = :'+key,
      ExpressionAttributeValues: eav
    };

    if(typeof qf=='object'){
      var fe = [];
      Object.keys(qf).forEach(function(k){
        params.ExpressionAttributeValues[":"+k] = qf[k];
        fe.push( k+" = :"+k );
      });
      params.FilterExpression = fe.join(',');
    }else if(typeof qf=='function'){
      callback = qf;
    }
    docClient.query(params, function(err, data) {
      var cnt = !err && data.hasOwnProperty("Items") ? data.Items.length : 0;
      callback(err, cnt);
    });
  },
  /**
  * dynamojo.query
  * @desc Perform a raw query using the DocumentClient
  * @alias dynamojo.query
  * @memberOf! dynamojo
  *
  * @param {object} query (optional) A query, passed as an object.
  * @param {callback} callback The callback that handles the response.
  */


  query: function(query, callback){
    docClient.query(query, callback);
  }
};
module.exports = dynamojo;
