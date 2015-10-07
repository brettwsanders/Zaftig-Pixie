/*
* Speed Typer Model contains most of the model logic for the game.
* This includes the player data, the async server calls, and the socket
* handlers. One instance of SpeedTyperModel is instantiated in AppModel
* and passed into SpeedTyperView and all sub views.
*/

var SpeedTyperModel = Backbone.Model.extend({

  urlRoot: '/',

  defaults: {
    /*
    * 'paragraph' contains the text the player will be typing.
    */
    paragraph: '',

    /*
    * Score handlers: these are updated based on user input
    *  while the game is running.
    * 'oppScore' is updated from a socket handler, triggered
    *  when the opponent's score changes.
    */
    numMissed: 0,
    numCorrect: 0,
    oppScore: 0,
    currentIndex: 0,
    wpm: 0,
    practiceMode: false,

    /*
    * 'gameOver' is updated from a socket handler, triggered
    * when the socket server has determined a player has won or lost.
    */
    gameOver: false

  },

  initialize: function () {
    this.startGame();
    /*
    * Initialize socket, set it on the model and put
    * a connect handler on it.
    */
    this.set('socket', io.connect(window.location.host));
    this.get('socket').on('connect', function () {
      console.log('Connected!');
    });

    /*
    * Add event listeners for the socket object. The handlers:
    * match: emmitted from socket when two players are connected and the
    *   game client should begin.
    * update: emitted from socket when the opponents score has changed.
    * win: emmitted from socket when this player has a winning score differential
    * lose: emmitted from socket when opponent has a winning score differential
    */
    this.get('socket').on('update', this.updateOpponent.bind(this));
    this.get('socket').on('practice', this.beginPractice.bind(this));
    this.get('socket').on('win', this.gameWin.bind(this));
    this.get('socket').on('lose', this.gameLose.bind(this));
    this.get('socket').on('match', this.beginGame.bind(this));


    this.set('paragraphArray', this.get('paragraph').split(' '));
    this.updateCurrentLine();
    this.updateNextLine();
  },


  /*
  * beginPractice is called when a socket emits a 'practice' event.
  */
  beginPractice: function() {
    this.set('practiceMode', true);
    this.set('startTime', Date.now());
  },

  /*
  * beginGame is called when a socket emits a 'match' event.
  */
  beginGame: function() {
    /*
    * beginGame resets variables that may have been changed
    * when the player was practicing.
    * 'startTime' is used to calculate words per minute.
    */
    this.set('practiceMode', false);
    this.set('numCorrect', 0);
    this.set('numMissed', 0);
    this.set('wpm', 0);
    this.trigger('update');
    this.set('currentIndex', 0);
    this.set('startTime', Date.now());

    /*
    * trigger the views to initialize game functionality
    */
    this.trigger('beginGame', 'true');
  },

  /*
  * updateOpponent is called with socket emits an 'update' event.
  * Socket passes in a data object with the opponent's score.
  */
  updateOpponent: function(data) {
    this.set('oppScore', data.score);
  },

  /*
  * gameWin and gameLose are socket handlers for the two gameOver
  *   situations.
  */
  gameWin: function () {
    // alert('Game Won');
    this.set('gameOver', true);
    this.trigger('gameWin');
  },

  gameLose: function () {
    // alert('Game lost');
    this.set('gameOver', true);
    this.trigger('gameLose');
  },

  startGame: function() {
  },

  /*
  * fetchText submits a GET request to the server '/text' URL to retrieve a paragraph
  * generated by the server.
  */
  fetchText: function() {
    var context = this;

    this.deferred = this.fetch({
      url: '/text',
      success: function(data, response){
        return response.text;
      }
    });

    this.deferred.done(function(data){
      /*
      * 'paragraphArray' takes the string form of the text ('paragraph')
      * and splits it into an array. Using an array form allows for the
      * game statistics to be more easily and naturally calculated.
      */
      context.set('paragraph', data.text);
      context.set('paragraphArray', context.get('paragraph').split(' '));
      context.updateCurrentLine();
      context.updateNextLine();
      context.trigger('paragraphSet');
    });
  },

  /*
  * spaceHandler is called by InputView when a space is pressed by the user.
  *   param 'inputWord' is the word grabbed from the input box.
  * This method calculates the player score based on the inputWord's correctness
  * and updates the appropriate score handlers.
  */
  spaceHandler: function (inputWord) {
    this.set( 'inputWord', inputWord );

    if( inputWord === this.get('paragraphArray')[this.get('currentIndex')] ){
      this.set('numCorrect', this.get('numCorrect') + 1 );
      if (!this.get('practiceMode')) {
        this.trigger('correct');
      }
      /*
      * 'prevResult' is set to notify the views whether the input submitted
      * is correct or incorrect.
      */
      this.set('prevResult', 'correct');

      /*
      * Emit an event to the socket with our score when it increases.
      */
      this.get('socket').emit('update', { score: this.get('numCorrect') });

    } else {
      this.set('numMissed', this.get('numMissed') + 1 );
      this.set('prevResult', 'incorrect');
    }

    /*
    * Update the current position and the words per minute
    */
    this.set('currentIndex', this.get('currentIndex') + 1 );
    this.updateWordsPerMinute();
  },

  getCurrentWord: function () {
    return this.get('paragraphArray')[this.get('currentIndex')];
  },

  /*
  * updateWordsPerMinute calculates wpm by taking the number of correct
  *   words and dividing it by the elapsed time.
  */
  updateWordsPerMinute: function () {
    var start = this.get('startTime');
    var now = Date.now();
    var elapsed = (now - start) / (1000 * 60);
    var wpm = this.get('numCorrect') / elapsed;
    this.set('wpm', wpm);
    this.trigger('update');
  },

  /*
  * currentLine and nextLine refer to the text being displayed in paragraph view.
  * Each currently contains the following five words to be shown, and is updated by
  * the paragraphView
  */
  updateCurrentLine: function () {
    var index = this.get('currentIndex');
    this.set('currentLine', this.get('paragraphArray').slice(index, index + 5));
  },

  updateNextLine: function () {
    var index = this.get('currentIndex') + 5;
    this.set('nextLine', this.get('paragraphArray').slice(index, index + 5));
  },

  saveGame: function () {
    //TODO submit post request with game statistics
  }

});