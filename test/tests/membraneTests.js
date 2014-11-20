module("Membrane Tests");
test('step', function() {
  var membrane = new Membrane({
    world: {'a':4},
    rules: [
      new Rule({
        type: Rule.Type.EVOLVE,
        requirements:{'a':1},
        output:{'b':1},
      })
    ]
  });
  equal(membrane.worldToString(), '[ a a a a ]', 'counts world correctly');
  var ruleApplied = membrane.step([]);
  equal(membrane.worldToString(), '[ b b b b ]', 'applies all possible rules');
  ok(ruleApplied === true, 'rule applied');

  var membrane = new Membrane({
    world: {'a':4},
    rules: [
    new Rule({
      type: Rule.Type.EVOLVE,
      requirements:{'b':1},
      output:{'c':1},
    })
    ]
  });
  ruleApplied = membrane.step([]);
  equal(membrane.worldToString(), '[ a a a a ]', 'same when no rules applied');
  ok(ruleApplied === false, 'no rule applied');

  membrane = new Membrane({
    world: {'a':4},
    rules: [
    new Rule({
      type: Rule.Type.EVOLVE,
      requirements:{'a':1},
      output:{'b':1},
    }),
    new Rule({
      type: Rule.Type.EVOLVE,
      requirements:{'b':2},
      output:{'c':1},
    })
    ]
  });
  membrane.step([]);
  membrane.step([]);
  equal(membrane.worldToString(), '[ c c ]', 'handles multiple single symbol requirement');
});
