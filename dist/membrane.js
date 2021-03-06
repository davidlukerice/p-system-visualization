/* membranejs 0.0.3 2014-12-05 */
define("MJS/mSystem", 
  ["MJS/mjs","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MJS = __dependency1__["default"];

    var MSystem = function(params) {
      _.assign(this, {
        membrane: null,
        world: {}
      }, params);
    };

    MSystem.prototype.clone = function() {
      return new MSystem({
        membrane: this.membrane.clone(),
        world: _.cloneDeep(this.world)
      });
    };

    MSystem.prototype.simulate = function(stepLimit) {
      var outCome = true;
      stepLimit = stepLimit || 100;
      MJS.log('simulating');
      for (var i=0; i<stepLimit && outCome; ++i) {
        MJS.log('- step: '+(i+1));
        MJS.log('system world before: '+this.toString());
        outCome = this.membrane.step(this.world);
        if (outCome.dissolved)
          throw 'Error: Outermost membrane dissolved';
        MJS.log('system world after: '+this.toString());
      }
      if (i === stepLimit)
        MJS.log('step limit('+stepLimit+') reached');
      MJS.log('finished');
    };
    MSystem.prototype.toString = function() {
      return this.worldToString() +' '+ this.membrane.toString();
    };
    MSystem.prototype.worldToString = function () {
      return MJS.setToString(this.world);
    };

    MJS.MSystem = MSystem;
    __exports__["default"] = MSystem;
  });
define("MJS/membrane", 
  ["MJS/mjs","MJS/rule","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var MJS = __dependency1__["default"];
    var Rule = __dependency2__["default"];

    var idCounter = 0;

    var Membrane = function(params) {
      _.assign(this, {
        // array of Rules
        rules: [],
        // set of object definitions symbol:count
        world: {},
        // children Membranes
        membranes: [],
        label: null,
        charge: null
      }, params);

      if (typeof this.id === 'undefined')
        this.id = ++idCounter;
    };

    Membrane.prototype.clone = function() {
      var rules = _.map(this.rules, function(rule) { return rule.clone; }),
          membranes = _.map(this.membranes, function(membrane) { return membrane.clone(); });
      return new Membrane({
        id: this.id,
        rules: rules,
        world: _.cloneDeep(this.world),
        membranes: membranes,
        label: this.label,
        charge: this.charge
      });
    };

    /**
     * Simulates a single step for the membrane and its inner membranes
     * @param  {object} externalWorld A world object set
     * @return {bool/object} true if a rule was applied, false otherwise, {dissolved: true} if dissolved
     */
    Membrane.prototype.step = function(externalWorld) {
      var self = this,
          anyRulesApplied = false,
          hasDissolved = false;

      // Step inner membranes first
      for (var i = 0; i < this.membranes.length; ++i) {
        var membrane = this.membranes[i];
        var result = membrane.step(self.world);
        if (result.dissolved) {
          MJS.log('dissolving '+membrane.id);
          this.membranes.splice(i--, 1);
        }
        if (result) {
          anyRulesApplied = true;
        }
      }

      // Get all the rules that can apply
      var applicableRules = [];
      _.forEach(this.rules, function(rule) {
        _.times(rule.numberApplications(self.world, self.membranes), function() {
          applicableRules.push(rule);
        });
      });

      MJS.log('membrane before: '+this.toString());

      // Apply rules in random order and skip those that no longer apply
      shuffle(applicableRules);
      var oldWorld = _.cloneDeep(this.world);
      _.forEach(applicableRules, function(rule) {
        var result = rule.applyRule(oldWorld, self.world, self.membranes);
        if (_.isObject(result)) {
          _.forEach(result, function(count, symbol) {
            if (typeof externalWorld[symbol] === 'undefined')
              externalWorld[symbol] = 0;
            externalWorld[symbol]+=count;
          });
        }
        if (result) {
          anyRulesApplied = true;
          if (rule.type === Rule.Type.DISSOLVE) {
            hasDissolved = true;
            return false;
          }
        }
      });

      MJS.log('membrane after: '+this.toString());

      if (hasDissolved)
        return {dissolved: true};
      return anyRulesApplied;
    };
    Membrane.prototype.toString = function() {
      var world = this.worldToString();
      var children = '';
      _.forEach(this.membranes, function(membrane) {
        children+=membrane.toString();
      });
      return '('+this.id+')['+(world.slice(1,world.length-1))+children+']';
    };
    Membrane.prototype.worldToString = function () {
      return MJS.setToString(this.world);
    };

    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/array/shuffle [v1.0]
    function shuffle(o){ //v1.0
      for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
      return o;
    }

    MJS.Membrane = Membrane;
    __exports__["default"] = Membrane;
  });
define("MJS/mjs", 
  ["exports"],
  function(__exports__) {
    "use strict";

    /**
     * membrane.js global object
     */
    var MJS = {};

    MJS.log = function(msg) {
      if (console)
        console.log(msg);
      if (typeof $ !== 'undefined')
        $('.log').prepend(msg+'<br>');
    };

    /**
     * @param {[type]} set {symbol:count,...}
     */
    MJS.setToString = function(set) {
      var chars = ['['];
      _.forEach(set, function(count, symbol) {
        _.times(count, function(){
          chars.push(symbol);
        });
      });
      chars.push(']');
      return chars.join(' ');
    };

    MJS.selectRandomIn = function(xs) {
      return xs[Math.floor(Math.random()*xs.length)];
    };

    MJS.cloneObjectArray = function(xs) {
      return _.map(xs, function(x) {return x.clone;});
    };

    __exports__["default"] = MJS;
  });
define("MJS/rule", 
  ["MJS/mjs","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var MJS = __dependency1__["default"];

    var Rule = function(params) {
      _.assign(this, {
        type: Rule.Type.EVOLVE,
        // symbols consumed by the rule
        reactants: {},
        // symbols generated by the rule
        products: {},
        charge: null,
        label: null
      }, params);

      if (typeof this.type === 'undefined')
        throw 'Unsupported Rule Type('+this.type+')';
    };

    Rule.prototype.clone = function() {
      return new Rule({
        type: this.type,
        reactants: _.cloneDeep(this.reactants),
        products: _.cloneDeep(this.products),
        charge: this.charge,
        label: this.label
      });
    };

    /**
     * Gets how many times a rule can be applied on the given world and membrane children
     * @param {Object} world             Multiset of world objects
     * @param {Array} childrenMembranes  List of the current membrane's children
     * @return Number of times this rule can be applied
     */
    Rule.prototype.numberApplications = function(world, childrenMembranes) {
      var self = this,
          num = 0,
          tempWorld = _.cloneDeep(world),
          applied;
      do {
        applied = this.applyRule(tempWorld, MJS.cloneObjectArray(childrenMembranes));
        if (applied) {
          num+=1;
        }
      } while(applied);
      return num;
    };
    /**
     * Apply the rule to the given world. Only updates the world
     * if it can actually apply the rule
     * @param  {object} oldWorld {symbol:count,...} world to decrement but not add to
     * @param  {object} world {symbol:count,...} (optional) world to both decrement and add to
     * @param {Array} childrenMembranes  (optional) List of the current membrane's children
     * @return {bool/object} Whether the rule was applied or not, or world set object if sending out
     */
    Rule.prototype.applyRule = function(oldWorld, world, childrenMembranes) {
      var self = this,
          applied = true,
          sendOutSet = {};

      if (_.isArray(world)) {
        childrenMembranes = world;
        world = null;
      }

      // First preprocess to check if all reactants exist and the rule can be applied
      _.forEach(self.reactants, function(count, symbol) {
        if (typeof oldWorld[symbol] === 'undefined' || oldWorld[symbol] < count) {
          applied = false;
          return false;
        }
      });

      // Send in rules require some children membrane to send in to
      if (this.type === Rule.Type.SEND_IN && (!childrenMembranes || childrenMembranes.length===0)) {
        applied = false;
      }

      // Then apply if possible
      if (applied) {
        _.forEach(self.reactants, function(count, symbol) {
          oldWorld[symbol]-= count;
          if (world)
            world[symbol]-= count;
        });

        if (world)
          MJS.log('apply rule: '+this.toString());

        _.forEach(self.products, function(count, symbol) {
          var w = world;
          if (self.type === Rule.Type.SEND_OUT ||
              self.type === Rule.Type.DISSOLVE)
          {
            w = sendOutSet;
          }
          else if (self.type === Rule.Type.SEND_IN) {
            w = MJS.selectRandomIn(childrenMembranes).world;
          }

          if (w && typeof w[symbol] === 'undefined')
            w[symbol] = 0;
          if (w)
            w[symbol]+=count;
        });
      }

      if (_.keys(sendOutSet).length) {
        return sendOutSet;
      }
      return applied;
    };
    Rule.prototype.toString = function() {
      return "Rule("+this.type+") react"+MJS.setToString(this.reactants)+' prod'+MJS.setToString(this.products);
    };

    Rule.Type = {
      EVOLVE: 'evolve',
      SEND_OUT: 'sendOut',
      DISSOLVE: 'dissolve',
      SEND_IN: 'sendIn'
      // TODO other rule types
      //ELEMENTARY_DIVISION: 'elementaryDivision',
      //NONELEMENTARY_DIVIONS: 'nonelementaryDivision'
    };

    MJS.Rule = Rule;
    __exports__["default"] = Rule;
  });
//# sourceMappingURL=membrane.js.map