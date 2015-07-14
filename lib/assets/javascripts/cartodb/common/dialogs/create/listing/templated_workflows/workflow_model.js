var cdb = require('cartodb.js');
var WorkflowStepFormCollection = require('./workflow_step_form_collection');

/**
 *  Model that contains all the info when a
 *  visualization template has been selected
 *
 */

module.exports = cdb.core.Model.extend({

  defaults: {
    state: 'idle',
    stepNumber: null,
    stepFormCollection: null,
    formAttributes: {},
    template: null
  },

  initialize: function() {
    this._initBinds();
  },

  _initBinds: function() {
    this.bind('change:template', function() {
      this.attributes.formAttributes = {};
      this.set({
        state: 'idle',
        stepNumber: 0
      });

    }, this);
    this.bind('change:stepNumber', function() {
      var stepNumber = this.get('stepNumber');
      var step = this.getStep(stepNumber);
      if (step !== null) {
        var stepFormCollection = new WorkflowStepFormCollection(null, step);
        this.set('stepFormCollection', stepFormCollection);  
      }
    }, this);
  },

  resetValues: function() {
    _.extend(this.attributes, this.defaults);
    this.trigger('change:stepNumber');
  },

  isStepValid: function() {
    var stepFormCollection = this.get('stepFormCollection');
    return stepFormCollection && stepFormCollection.isValid();
  },

  isFinalStep: function() {
    var stepNumber = this.getStepNumber();
    var stepsCount = this.getStepNames().length;
    return (stepsCount - 1) === stepNumber;
  },

  isFirstStep: function() {
    var stepNumber = this.getStepNumber();
    return stepNumber === 0
  },

  nextStep: function() {
    var self = this;

    if (this.isStepValid()) {
      // Save attributes from current step
      var formAttrs = this.get('formAttributes');
      var stepAttrs = this.get('stepFormCollection').toJSON();
      this.set('formAttributes', _.extend(formAttrs, stepAttrs));

      console.log(stepAttrs, this.get('formAttributes'));

      // onStepFinished?
      var template = this.get('template');
      var stepNumber = this.get('stepNumber');
      template.onStepFinished(stepNumber, stepAttrs, function() {
        // Change step number
        if (!self.isFinalStep()) {
          self.set('stepNumber', stepNumber + 1);
        } else {
          self._createMap();
        }
      });
    }
  },

  isCreating: function() {
    return this.get('state') === "creating"
  },

  isIdle: function() {
    return !this.isCreating() && !this.isErrored()
  },

  isErrored: function() {
    return this.get('state') === "error"
  },

  _createMap: function() {

    // TODO: don't create visualizations for now
    return;

    var self = this;
    var template = this.get('template');
    var formAttributes = this.get('formAttributes');

    var vis = new cdb.admin.Visualization({
      id: template.get('source_visualization_id')
    });

    // Creating state
    this.set('state', 'creating');

    // Duplicate map
    this._newVis = vis.copy({
      name: template.get('name'),
      description: template.get('description')
    }, {
      success: function(mdl, obj) {
        template.onWizardFinished(mdl, formAttributes, function() {
          window.location.href = self._newVis.viewUrl() + "/map";
        })
      },
      error: function(err) {
        self.set('state', 'error');
      }
    });
  },

  previousStep: function() {
    if (!this.isFirstStep()) {
      var stepNumber = this.getStepNumber();
      this.set('stepNumber', stepNumber - 1);
    }
  },

  getStepNumber: function() {
    return this.get('stepNumber');
  },

  getStep: function(i) {
    var template = this.get('template');
    return template && template.getStep && template.getStep(i);
  },

  getStepNames: function() {
    var template = this.get('template');
    return template && template.getStepNames();
  },

  getStepFormCollection: function() {
    return this.get('stepFormCollection');
  },

  getTemplateName: function() {
    var template = this.get('template');
    return template && template.get('name')
  }

});