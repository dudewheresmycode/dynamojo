// var attr = require('dynamodb-data-types').AttributeValue;
// var attrUpdate = require('dynamodb-data-types').AttributeValueUpdate;

var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({endpoint:'dynamodb.us-west-1.amazonaws.com'});
var docClient = new AWS.DynamoDB.DocumentClient();

var util = require('util'), uuid = require('uuid');

var db = {
  //get() get object by primary id
  get: function(table, id, fields, callback){
    var params = {
      Key:{id:id},
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

  //fields is optional
  getByKey: function(table, keyName, key, value, fields, callback){
    var pkey = ":"+key;
    var eav = {};
    eav[pkey] = value;
    var params = {
      TableName: table,
      IndexName: keyName,
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
  listByKey: function(table, keyName, key, value, qf, callback){

    var eav = {};
    eav[":"+key] = value;

    //var kcond = {};
    //kcond[key] = {ComparisonOperator:'EQ', AttributeValueList:[value]};
    //attr.wrap(value);
    var params = {
      TableName: table,
      IndexName: keyName,
      //KeyConditions: kcond
      KeyConditionExpression: key+' = :'+key,
      ExpressionAttributeValues: eav
    };
    console.log(params);

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
    console.log(params);


    docClient.query(params, function(err, data) {
      var resp = !err && data.hasOwnProperty("Items") ? data.Items : [];
      callback(err, resp);
    });
  },
  insert: function(table, obj, callback){
    obj.id = uuid();
    var params = {
      TableName : table,
      Item: obj
    };
    docClient.put(params, function(err,data){
      callback(err, obj);
    });
  },
  update: function(table, id, query, callback){

    //don't update the id again
    if('id' in query) delete query.id;

    var exp = [];
    var eav = {};
    Object.keys(query).forEach(function(key){
      exp.push(key+" = :"+key);
      eav[":"+key] = query[key];
    });
    var updateExp = util.format("set %s", exp.join(', '));
    var params = {
        TableName:table,
        Key:{id:id},
        UpdateExpression: updateExp,
        ExpressionAttributeValues: eav,
        ReturnValues: "UPDATED_NEW"
    };
    console.log("Updating the item...");
    docClient.update(params, function(err, data) {
      callback(err, data);
    });

    // var params = {
    //   Key:{id:id},
    //   TableName:table,
    //   AttributeUpdates: attrUpdate.put(query)
    // }
    // console.log(params);
    // dynamodb.updateItem(params, function(err, data) {
    //   //var resp = data && data.Item ? attr.unwrap(data.Item) : null;
    //   callback(err,  {data:data, params:params});
    // });
  }
};
module.exports = db;
