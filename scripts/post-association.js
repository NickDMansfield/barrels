'use strict';
const Promise = require('bluebird');
const _ = require('lodash');
const mongo = require('mongodb');

let barrelsContext;

const assignForeignKeysToArray = ((destinationModel, destinationArray, targetModel, callback) => {
  console.log(`Assigning foreign keys to array`);
  const modelClass = sails.models[destinationModel];
  return modelClass.find({})
  .then(destModels => {
    return Promise.map(destModels, destModel => {
      // console.log(`product => ${JSON.stringify(product)}`);
      const moddedDestModel = _.clone(destModel);
      for (let i = 0; i < moddedDestModel[destinationArray].length; i++) {
        moddedDestModel[destinationArray][i] = barrelsContext.idMap[targetModel][moddedDestModel[destinationArray][i]-1];
      }
      return moddedDestModel;
    })
    .then(moddedDestModels => {
      return Promise.map(moddedDestModels, modelToUpdate => {
        return modelClass.update({ id: modelToUpdate.id}, modelToUpdate)
        .then(result => {
          return result;
        });
      })
      .then(updatedModels => {
        if (callback) {
          callback();
        }
      });
    });
  });
});

// TODO: anonymize this
const populateProperty = ((destinationModel, destinationPropertyPath, modelToPopulateWith, callback) => {
  const modelClass = sails.models[destinationModel];
  return modelClass.find({})
  .then(destModels => {
    return Promise.map(destModels, destModel => {
      const moddedDestModel = _.clone(destModel);
      // Assign the property to the new object
      const modProperty = moddedDestModel[destinationPropertyPath];
      // Loop through each subscription and populate the modules
      return Promise.map(moddedDestModel.subscriptions, subscription => {
        return Module.findOne({ id: barrelsContext.idMap.module[subscription.module-1] })
        .then(foundModule => {
          subscription.module = foundModule.id;
          return subscription;
        });
      })
      .then(moddedSubMap => {
        moddedDestModel.subscriptions = moddedSubMap;
        return moddedDestModel;
      });
    })
    .then(moddedDestModels => {
      return Promise.map(moddedDestModels, modelToUpdate => {
        return modelClass.update({ id: modelToUpdate.id}, modelToUpdate)
        .then(updatedModels => {
          if (callback)
            callback();
        });
      });
    });
  });
});

const actions = (_barrelsContext, cb) => {
  barrelsContext = _barrelsContext;
  console.log('Barrel-strapping finished');
  // Get the categories to map from each products
  return assignForeignKeysToArray('user', 'modules', 'module')
  .then(() => {
    console.log('First assignment finished');
    return populateProperty('organization', 'subscriptions')
    .catch(err => {
      console.log(`popProp error -> ${err}`);
    })
    .then(() => {
      return assignForeignKeysToArray('user', 'organizations', 'organization')
      .then(() => {
        if (cb) {
          cb();
        }
      });
    });
  });
};


module.exports = {
  actions
}
