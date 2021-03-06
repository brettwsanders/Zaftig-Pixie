var mongoose = require('mongoose');

mongoURI = process.env.MONGOLAB_URI || 'mongodb://localhost/shortlydb';
// connect to local server or deployment server
mongoose.connect(mongoURI);

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once("open", function() {
  console.log('Mongodb connection open');
});


module.exports = db;


///////////////////////////////////////////////

