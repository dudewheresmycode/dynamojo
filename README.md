## dynamojo
A super simple and lightweight DynamoDB client for nodejs.

If you are unfamiliar with DynamoDB, checkout Amazon Web Services: https://aws.amazon.com/dynamodb/



### Installation
```bash
npm install --save dynamojo
```

### Basic Usage
```javascript
var dynamojo = require('dynamojo');

var item = {title:'hello world'};
//insert a new item, will generate a new uuid on the primary key (id)
dynamojo.insert('collection1', db_item, function(err, inserted_item){
  if(err){ console.log(err); return; }

  console.log("Inserted: %s", inserted_item.id);

  //get the item by primary key
  dynamojo.get('collection1', {id:inserted_item.id}, function(err, response){
    if(err){ console.log(err); return; }

    console.log("Found item: %s", response);

    dynamojo.update('collection1', inserted_item.id, {updated:true}, function(err, response){
      if(err){ console.log(err); return; }

      console.log("Updated item: %s", response);

    }); //end update

  }); //end get


}); //end insert
```


### Credentials
We recommend you use a `~/.aws/credentials` file to configure access to your DynamoDB instance. For convenience, there is a `config` method available to pass an aws config object to:

```javascript
dynamojo.config({ "accessKeyId": "akid", "secretAccessKey": "secret", "region": "us-west-2" })
```
