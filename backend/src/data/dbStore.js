import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Helper to generate 24-char hex MongoDB-like ObjectIDs
export function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0');
  const counter = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return timestamp + random + counter;
}

// In-Memory Data Collections
class DatabaseStore {
  constructor() {
    this.collections = {
      users: [],
      shops: [],
      routes: [],
      products: [],
      orders: [],
      payments: [],
      visitlogs: [],
      callingsheetnotes: [],
      media: [],
    };
    this.isInitialized = false;
  }

  init(initialDataset = null) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        this.collections = JSON.parse(raw);
        if (!this.collections.media) this.collections.media = [];
        this.isInitialized = true;
        console.log('📦 Loaded existing data store from data/store.json');
        return;
      } catch (err) {
        console.warn('Could not read existing store.json, re-initializing...');
      }
    }

    if (initialDataset) {
      this.collections.users = initialDataset.users.map((d) => this._wrapDoc(d, 'users'));
      this.collections.routes = initialDataset.routes.map((d) => this._wrapDoc(d, 'routes'));
      this.collections.shops = initialDataset.shops.map((d) => this._wrapDoc(d, 'shops'));
      this.collections.products = initialDataset.products.map((d) => this._wrapDoc(d, 'products'));
      this.collections.orders = initialDataset.orders.map((d) => this._wrapDoc(d, 'orders'));
      this.collections.payments = initialDataset.payments.map((d) => this._wrapDoc(d, 'payments'));
      this.collections.callingsheetnotes = initialDataset.callNotes.map((d) =>
        this._wrapDoc(d, 'callingsheetnotes')
      );
      this.saveToFile();
      this.isInitialized = true;
      console.log('✅ Initialized and persisted seed dataset into store.json');
    }
  }

  saveToFile() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.collections, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist store.json:', err.message);
    }
  }

  _wrapDoc(doc, collectionName = null) {
    if (!doc) return null;
    const cloned = { ...doc };
    if (!cloned._id) cloned._id = generateObjectId();
    else cloned._id = cloned._id.toString();

    // Attach .save() method that explicitly mutates and updates this.collections
    cloned.save = async () => {
      let targetColName = collectionName;
      if (!targetColName) {
        for (const [col, items] of Object.entries(this.collections)) {
          if (items.some((i) => i._id.toString() === cloned._id.toString())) {
            targetColName = col;
            break;
          }
        }
      }

      if (targetColName && this.collections[targetColName]) {
        const idx = this.collections[targetColName].findIndex(
          (i) => i._id.toString() === cloned._id.toString()
        );

        const toSave = { ...cloned };
        delete toSave.save;
        delete toSave.toObject;
        delete toSave.matchPassword;

        // Revert populated object fields to raw ID strings
        ['shop', 'salesman', 'route', 'assignedSalesman', 'onboardedBy', 'calledBy', 'settledBy'].forEach(
          (f) => {
            if (toSave[f] && typeof toSave[f] === 'object' && toSave[f]._id) {
              toSave[f] = toSave[f]._id.toString();
            }
          }
        );
        if (Array.isArray(toSave.items)) {
          toSave.items = toSave.items.map((it) => {
            if (it.product && typeof it.product === 'object' && it.product._id) {
              return { ...it, product: it.product._id.toString() };
            }
            return it;
          });
        }

        toSave.updatedAt = new Date();

        if (idx !== -1) {
          this.collections[targetColName][idx] = toSave;
        } else {
          this.collections[targetColName].push(toSave);
        }
      }

      this.saveToFile();
      return cloned;
    };

    // Attach .toObject() method
    cloned.toObject = () => ({ ...cloned });

    // Attach User .matchPassword method if password exists
    if (cloned.password) {
      cloned.matchPassword = async (entered) => {
        if (!cloned.password) return false;
        return await bcrypt.compare(entered, cloned.password);
      };
    }

    return cloned;
  }
}

export const dbStore = new DatabaseStore();

// Chainable Query Helper mirroring Mongoose query interface
class QueryBuilder {
  constructor(data, storeInstance, collectionName) {
    this.data = data;
    this.store = storeInstance;
    this.collectionName = collectionName;
    this.populateFields = [];
    this.sortFields = null;
  }

  populate(field, selectStr) {
    this.populateFields.push({ field, select: selectStr });
    return this;
  }

  sort(sortObj) {
    this.sortFields = sortObj;
    return this;
  }

  select(fieldsStr) {
    return this;
  }

  async exec() {
    let result = Array.isArray(this.data)
      ? this.data.map((item) => this.store._wrapDoc(item, this.collectionName))
      : this.data
      ? this.store._wrapDoc(this.data, this.collectionName)
      : null;

    if (Array.isArray(result) && this.sortFields) {
      for (const [key, dir] of Object.entries(this.sortFields)) {
        result.sort((a, b) => {
          const valA = a[key] ?? '';
          const valB = b[key] ?? '';
          if (dir === -1) return valB > valA ? 1 : valB < valA ? -1 : 0;
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        });
      }
    }

    // Apply population
    for (const pop of this.populateFields) {
      if (Array.isArray(result)) {
        result = result.map((item) => this._populateItem(item, pop.field, pop.select));
      } else if (result) {
        result = this._populateItem(result, pop.field, pop.select);
      }
    }

    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  _populateItem(item, field, selectStr) {
    if (!item) return item;
    const cloned = { ...item };
    const rawVal = cloned[field];
    if (!rawVal) return cloned;

    const targetId = (rawVal._id || rawVal).toString();

    let found = null;
    if (field === 'shop' || field === 'shopId') {
      found = this.store.collections.shops.find((s) => s._id.toString() === targetId);
    } else if (
      field === 'salesman' ||
      field === 'assignedSalesman' ||
      field === 'onboardedBy' ||
      field === 'calledBy' ||
      field === 'settledBy'
    ) {
      found = this.store.collections.users.find((u) => u._id.toString() === targetId);
    } else if (field === 'route' || field === 'routeId') {
      found = this.store.collections.routes.find((r) => r._id.toString() === targetId);
    } else if (field === 'items.product') {
      if (Array.isArray(cloned.items)) {
        cloned.items = cloned.items.map((i) => {
          const prodId = (i.product?._id || i.product || '').toString();
          const prod = this.store.collections.products.find((p) => p._id.toString() === prodId);
          return { ...i, product: prod || i.product };
        });
      }
      return this.store._wrapDoc(cloned, this.collectionName);
    }

    if (found) {
      let populatedObj = { ...found };
      if (selectStr && typeof selectStr === 'string') {
        const allowed = selectStr.split(' ').map((s) => s.replace('-', ''));
        const filtered = {};
        allowed.forEach((k) => {
          if (populatedObj[k] !== undefined) filtered[k] = populatedObj[k];
        });
        filtered._id = populatedObj._id;
        populatedObj = filtered;
      }
      cloned[field] = populatedObj;
    }

    return this.store._wrapDoc(cloned, this.collectionName);
  }
}

// Factory to create Mongoose-compatible Collection Model
export function createModelAdapter(collectionName) {
  const getCol = () => dbStore.collections[collectionName] || [];

  return {
    find: (filter = {}) => {
      const items = filterData(getCol(), filter);
      return new QueryBuilder(items, dbStore, collectionName);
    },

    findOne: (filter = {}) => {
      const items = filterData(getCol(), filter);
      const item = items.length > 0 ? items[0] : null;
      return new QueryBuilder(item, dbStore, collectionName);
    },

    findById: (id) => {
      if (!id) return new QueryBuilder(null, dbStore, collectionName);
      const strId = id.toString();
      const item = getCol().find((i) => i._id.toString() === strId);
      return new QueryBuilder(item || null, dbStore, collectionName);
    },

    create: async (data) => {
      const item = dbStore._wrapDoc({ ...data, createdAt: new Date(), updatedAt: new Date() }, collectionName);
      if (collectionName === 'users' && data.password && !data.password.startsWith('$2a$')) {
        const salt = await bcrypt.genSalt(10);
        item.password = await bcrypt.hash(data.password, salt);
      }
      dbStore.collections[collectionName].push(item);
      dbStore.saveToFile();
      return item;
    },

    findByIdAndUpdate: (id, update, options = {}) => {
      if (!id) return new QueryBuilder(null, dbStore, collectionName);
      const strId = id.toString();
      const idx = getCol().findIndex((i) => i._id.toString() === strId);
      if (idx === -1) return new QueryBuilder(null, dbStore, collectionName);

      const current = getCol()[idx];
      const updated = { ...current, ...update, updatedAt: new Date() };

      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          updated[k] = (updated[k] || 0) + v;
        }
        delete updated.$inc;
      }
      if (update.$set) {
        Object.assign(updated, update.$set);
        delete updated.$set;
      }

      dbStore.collections[collectionName][idx] = updated;
      dbStore.saveToFile();
      return new QueryBuilder(dbStore._wrapDoc(updated, collectionName), dbStore, collectionName);
    },

    findOneAndUpdate: (filter = {}, update = {}, options = {}) => {
      const items = filterData(getCol(), filter);
      if (items.length === 0) return new QueryBuilder(null, dbStore, collectionName);
      const strId = items[0]._id.toString();
      return createModelAdapter(collectionName).findByIdAndUpdate(strId, update, options);
    },

    findByIdAndDelete: (id) => {
      if (!id) return new QueryBuilder(null, dbStore, collectionName);
      const strId = id.toString();
      const idx = getCol().findIndex((i) => i._id.toString() === strId);
      if (idx === -1) return new QueryBuilder(null, dbStore, collectionName);
      const [removed] = dbStore.collections[collectionName].splice(idx, 1);
      dbStore.saveToFile();
      return new QueryBuilder(dbStore._wrapDoc(removed, collectionName), dbStore, collectionName);
    },

    countDocuments: async (filter = {}) => {
      const items = filterData(getCol(), filter);
      return items.length;
    },

    updateMany: async (filter, update) => {
      const col = dbStore.collections[collectionName] || [];
      const matched = filterData(col, filter);
      matched.forEach((item) => {
        const idx = col.findIndex((i) => i._id.toString() === item._id.toString());
        if (idx !== -1) {
          if (update.$set) Object.assign(col[idx], update.$set);
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              col[idx][k] = (col[idx][k] || 0) + v;
            }
          }
          col[idx].updatedAt = new Date();
        }
      });
      dbStore.saveToFile();
      return { modifiedCount: matched.length };
    },

    deleteMany: async (filter = {}) => {
      dbStore.collections[collectionName] = [];
      dbStore.saveToFile();
      return { deletedCount: 0 };
    },

    insertMany: async (docs) => {
      const wrapped = docs.map((d) => dbStore._wrapDoc(d, collectionName));
      dbStore.collections[collectionName].push(...wrapped);
      dbStore.saveToFile();
      return wrapped;
    },
  };
}

// Generic filter function matching MongoDB conditions ($in, $or, regex, equality, ObjectId comparisons)
function filterData(list, filter) {
  if (!filter || Object.keys(filter).length === 0) return list;

  return list.filter((item) => {
    for (const [key, val] of Object.entries(filter)) {
      if (key === '$or' && Array.isArray(val)) {
        const matchAny = val.some((subFilter) => filterData([item], subFilter).length > 0);
        if (!matchAny) return false;
        continue;
      }

      const itemVal = item[key];

      if (val instanceof RegExp) {
        if (!val.test(itemVal || '')) return false;
      } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        if (val.$ne !== undefined) {
          if (itemVal === val.$ne) return false;
          if (val.$ne !== null && val.$ne !== undefined && typeof val.$ne !== 'boolean') {
            const strItemVal = (itemVal?._id || itemVal || '').toString();
            const strNeVal = (val.$ne?._id || val.$ne || '').toString();
            if (strItemVal === strNeVal) return false;
          }
        } else if (val.$in && Array.isArray(val.$in)) {
          const strItemVal = (itemVal?._id || itemVal || '').toString();
          const inList = val.$in.map((v) => (v?._id || v || '').toString());
          if (!inList.includes(strItemVal)) return false;
        } else if (val.$regex) {
          const re = new RegExp(val.$regex, val.$options || '');
          if (!re.test(itemVal || '')) return false;
        } else if (val.$gte !== undefined || val.$lte !== undefined) {
          const itemTime = new Date(itemVal).getTime();
          if (val.$gte && itemTime < new Date(val.$gte).getTime()) return false;
          if (val.$lte && itemTime > new Date(val.$lte).getTime()) return false;
        }
      } else if (val !== undefined) {
        const strVal = (val?._id || val || '').toString();
        const strItemVal = (itemVal?._id || itemVal || '').toString();
        if (strVal !== strItemVal) return false;
      }
    }
    return true;
  });
}
