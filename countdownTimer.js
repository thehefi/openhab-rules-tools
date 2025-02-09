const {timeUtils, loopingTimer} = require('openhab_rules_tools');
const {time, items} = require('openhab');

/**
 * Timer that updates a passed in Item with the number of seconds reamining on the 
 * Timer once a second. 
 */
class CountdownTimer {
  
    /**
     * Creates a timer to run func at when and a looping timer to update
     * countItem with the seconds remaining every second. Both timers start
     * immediately.
     * @param {*} when timeUtils.toDateTime compatible time or duration
     * @param {function} func function to call at when
     * @param {string} countItem name of the Item to update with the seconds remaining
     */
  constructor(when, func, countItem) {
    this.start = time.ZonedDateTime.now();
    this.end = timeUtils.toDateTime(when);
    this.ONE_SEC = time.Duration.ofSeconds(1);
    
    // Create a separate timer to run the func
    this.timer = actions.ScriptExecution.createTimer(this.start, func);
    this.timeLeft = time.Duration.between(this.start, this.end);

    // Start the countdown timer
    this.countItem = countItem;
    this.countdownTimer = new loopingTimer.LoopingTimer();
    this.countdownTimer.loop(this._iterateGenerator(this), 0); // start now
  }

  /**
   * Determines the number of seconds left and updates the count Item. If the 
   * time left is less than a second, 0 is the value posted.
   * @param {CountdownTimer} ctx Context to access the timer information from inside the countdown Timer's lambda
   */
  _updateItem(ctx) {
    let left = (ctx.timeLeft.compareTo(ctx.ONE_SEC) < 0) ? 0 : ctx.timeLeft.seconds();
    items.getItem(ctx.countItem).postUpdate(left);
  } 

  /**
   * Drives the looping timer that updates the countItem. Runs once a second until
   * the time has run out, calling updateItem each time.
   * @param {CountdownTimer} ctx Context to access the timer information from inside the looping timer
   */
  _iterateGenerator(ctx) {
    return () => {
      ctx._updateItem(ctx);
      if(!ctx.timeLeft.isZero()) {
        let sleepTime = (ctx.timeLeft.compareTo(ctx.ONE_SEC) < 0) ? ctx.timeLeft : ctx.ONE_SEC;
        ctx.timeLeft = ctx.timeLeft.minusDuration(sleepTime);
        return '1s';
      }
      else {
        return null;
      }
    }
  }

  /**
   * @returns {boolean} true when the timer has exited
   */
  hasTerminated() {
    return this.timer.hasTerminated();
  }

  /**
   * Cancels the running timer, if it's running.
   * @returns {boolean} true if timer was cancelled.
   */
  cancel() {
    this.timeLeft = time.Duration.ofSeconds(0);
    this._updateItem(this);
    this.countDownTimer?.cancel();
    return this.timer.cancel();
  }
}

module.exports = {
  CountdownTimer
}