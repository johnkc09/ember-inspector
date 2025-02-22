// eslint-disable-next-line ember/no-mixins
import PortMixin from 'ember-debug/mixins/port-mixin';
import Ember from './utils/ember';

const { Object: EmberObject, computed } = Ember;
const { readOnly } = computed;

export default EmberObject.extend(PortMixin, {
  namespace: null,

  objectInspector: readOnly('namespace.objectInspector'),

  container: computed.reads('namespace.owner.__container__'),

  portNamespace: 'container',

  TYPES_TO_SKIP: computed(function () {
    return [
      'component-lookup',
      'container-debug-adapter',
      'resolver-for-debugging',
      'event_dispatcher',
    ];
  }),

  typeFromKey(key) {
    return key.split(':').shift();
  },

  nameFromKey(key) {
    return key.split(':').pop();
  },

  shouldHide(type) {
    return type[0] === '-' || this.TYPES_TO_SKIP.indexOf(type) !== -1;
  },

  instancesByType() {
    let key;
    let instancesByType = {};
    let cache = this.container.cache;
    // Detect if InheritingDict (from Ember < 1.8)
    if (
      typeof cache.dict !== 'undefined' &&
      typeof cache.eachLocal !== 'undefined'
    ) {
      cache = cache.dict;
    }
    for (key in cache) {
      const type = this.typeFromKey(key);
      if (this.shouldHide(type)) {
        continue;
      }
      if (instancesByType[type] === undefined) {
        instancesByType[type] = [];
      }
      instancesByType[type].push({
        fullName: key,
        instance: cache[key],
      });
    }
    return instancesByType;
  },

  getTypes() {
    let key;
    let types = [];
    const instancesByType = this.instancesByType();
    for (key in instancesByType) {
      types.push({ name: key, count: instancesByType[key].length });
    }
    return types;
  },

  getInstances(type) {
    const instances = this.instancesByType()[type];
    if (!instances) {
      return null;
    }
    return instances.map((item) => ({
      name: this.nameFromKey(item.fullName),
      fullName: item.fullName,
      inspectable: this.objectInspector.canSend(item.instance),
    }));
  },

  messages: {
    getTypes() {
      this.sendMessage('types', {
        types: this.getTypes(),
      });
    },
    getInstances(message) {
      let instances = this.getInstances(message.containerType);
      if (instances) {
        this.sendMessage('instances', {
          instances,
          status: 200,
        });
      } else {
        this.sendMessage('instances', {
          status: 404,
        });
      }
    },
    sendInstanceToConsole(message) {
      const instance = this.container.lookup(message.name);
      this.objectToConsole.sendValueToConsole(instance);
    },
  },
});
