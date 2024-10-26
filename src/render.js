import * as Constants from './constants.js';

export default function render() {
  // eslint-disable-next-line no-invalid-this
  const store = this;
  const mapExists = store.ctx.map && store.ctx.map.getSource(Constants.sources.HOT) !== undefined;
  if (!mapExists) return cleanup();

  const mode = store.ctx.events.currentModeName();

  store.ctx.ui.queueMapClasses({ mode });

  let newHotIds = [];
  let newColdIds = [];

  if (store.isDirty) {
    newColdIds = store.getAllIds().filter(id => store.get(id).properties.visible != "False");
  } else {
    newHotIds = store.getChangedIds().filter(id => store.get(id) !== undefined).filter(id => store.get(id).properties.visible != "False");
    newColdIds = store.sources.hot.filter(geojson => geojson.properties.id && newHotIds.indexOf(geojson.properties.id) === -1 && store.get(geojson.properties.id) !== undefined).map(geojson => geojson.properties.id);
  }

  store.sources.hot = [];
  const lastColdCount = store.sources.cold.length;
  store.sources.cold = store.isDirty ? [] : store.sources.cold.filter((geojson) => {
    const id = geojson.properties.id || geojson.properties.parent;
    return newHotIds.indexOf(id) === -1;
  });

  const coldChanged = lastColdCount !== store.sources.cold.length || newColdIds.length > 0;
  newHotIds.forEach(id => renderFeature(id, 'hot'));
  newColdIds.forEach(id => renderFeature(id, 'cold'));

  function renderFeature(id, source) {
    const feature = store.get(id);
    const featureInternal = feature.internal(mode);
    store.ctx.events.currentModeRender(featureInternal, (geojson) => {
      geojson.properties.mode = mode;
      store.sources[source].push(geojson);
    });
  } 

  //need to clone before rendering

  const cold_source = [...store.sources.cold]

  for(var i in cold_source){
    Object.keys(cold_source[i].properties).forEach((key) => {
        if(key != "coord_path"){ // do not convert this value into a number
          let value = cold_source[i].properties[key];
          if (!isNaN(Number(value))) {  // Check if value can be converted to a number
            cold_source[i].properties[key] = Number(value);  // Update value in place
          }
        }
    });
  }

  const hot_source = [...store.sources.hot]

  for(var i in hot_source){
    Object.keys(store.sources.hot[i].properties).forEach((key) => {
        let value = hot_source[i].properties[key];
        if (!isNaN(Number(value))) {  // Check if value can be converted to a number
          hot_source[i].properties[key] = Number(value);  // Update value in place
        }
    });
  }

  if (coldChanged) {
    store.ctx.map.getSource(Constants.sources.COLD).setData({
      type: Constants.geojsonTypes.FEATURE_COLLECTION,
      features: cold_source
    });
  }

  store.ctx.map.getSource(Constants.sources.HOT).setData({
    type: Constants.geojsonTypes.FEATURE_COLLECTION,
    features: hot_source
  });

  cleanup();

  function cleanup() {
    store.isDirty = false;
    store.clearChangedIds();
  }
}
