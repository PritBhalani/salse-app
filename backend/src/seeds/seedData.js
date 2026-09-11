import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Shop } from '../models/Shop.js';
import { Route } from '../models/Route.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { CallingSheetNote } from '../models/CallingSheetNote.js';

export const getSeedDataset = async () => {
  const salt = await bcrypt.genSalt(10);
  const hash = async (pwd) => await bcrypt.hash(pwd, salt);

  const adminId = new mongoose.Types.ObjectId();
  const warehouseId = new mongoose.Types.ObjectId();
  const salesman1Id = new mongoose.Types.ObjectId();
  const salesman2Id = new mongoose.Types.ObjectId();

  const shop1Id = new mongoose.Types.ObjectId();
  const shop2Id = new mongoose.Types.ObjectId();
  const shop3Id = new mongoose.Types.ObjectId();
  const shop4Id = new mongoose.Types.ObjectId();
  const shop5Id = new mongoose.Types.ObjectId();

  const route1Id = new mongoose.Types.ObjectId();
  const route2Id = new mongoose.Types.ObjectId();

  const users = [
    {
      _id: adminId,
      name: 'Sanjaybhai Patel (Uncle / Boss)',
      phone: '9898011111',
      email: 'boss@salaseplumbing.com',
      password: await hash('admin123'),
      role: 'ADMIN',
      cashInHand: 0,
      activeCities: ['Morbi', 'Wankaner', 'Rajkot', 'Gondal'],
      isActive: true,
    },
    {
      _id: warehouseId,
      name: 'Kishorbhai (Warehouse Manager)',
      phone: '9898022222',
      email: 'warehouse@salaseplumbing.com',
      password: await hash('warehouse123'),
      role: 'WAREHOUSE',
      cashInHand: 0,
      activeCities: [],
      isActive: true,
    },
    {
      _id: salesman1Id,
      name: 'Ramesh Kumar (Salesman)',
      phone: '9898033333',
      email: 'ramesh@salaseplumbing.com',
      password: await hash('sales123'),
      role: 'SALESMAN',
      cashInHand: 15000,
      activeCities: ['Morbi', 'Wankaner'],
      deviceId: 'DEVICE_ANDROID_SM_G998B',
      isActive: true,
    },
    {
      _id: salesman2Id,
      name: 'Prakash Joshi (Salesman)',
      phone: '9898044444',
      email: 'prakash@salaseplumbing.com',
      password: await hash('sales123'),
      role: 'SALESMAN',
      cashInHand: 0,
      activeCities: ['Rajkot', 'Gondal'],
      deviceId: null,
      isActive: true,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Jayeshbhai Shah (Shop Owner)',
      phone: '9898055555',
      password: await hash('shop123'),
      role: 'SHOP_OWNER',
      shopId: shop1Id,
      isActive: true,
    },
  ];

  const routes = [
    {
      _id: route1Id,
      name: 'Morbi - Wankaner Ceramic Beat',
      cities: ['Morbi', 'Wankaner'],
      assignedSalesman: salesman1Id,
      scheduleDays: ['Monday', 'Thursday'],
      nextVisitDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      description: 'Major hardware, sanitary and ceramic distributor strip along NH-8A',
      isActive: true,
    },
    {
      _id: route2Id,
      name: 'Rajkot - Gondal Industrial Beat',
      cities: ['Rajkot', 'Gondal'],
      assignedSalesman: salesman2Id,
      scheduleDays: ['Tuesday', 'Friday'],
      nextVisitDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      description: 'Dhebar Road plumbing dealers and Gondal bypass retail shops',
      isActive: true,
    },
  ];

  const shops = [
    {
      _id: shop1Id,
      shopName: 'Shri Krishna Hardware & Bath',
      ownerName: 'Jayeshbhai Shah',
      phone: '9898055555',
      altPhone: '9825012345',
      city: 'Morbi',
      address: 'Shop No 14, Patel Complex, Sanala Road, Morbi',
      location: { latitude: 22.8123, longitude: 70.8354 },
      routeId: route1Id,
      gstNumber: '24AAACP1234F1Z8',
      gstBalance: 24500,
      nonGstBalance: 45000,
      creditLimit: 200000,
      onboardedBy: salesman1Id,
      lastVisitedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      _id: shop2Id,
      shopName: 'Om Sanitations & Plumbers Hub',
      ownerName: 'Bhavinbhai Patel',
      phone: '9898066666',
      city: 'Morbi',
      address: 'Near Old Bus Stand, Ceramic Plaza, Morbi',
      location: { latitude: 22.819, longitude: 70.841 },
      routeId: route1Id,
      gstNumber: '24BCDE9876H2Z1',
      gstBalance: 12000,
      nonGstBalance: 31500,
      creditLimit: 150000,
      onboardedBy: salesman1Id,
      lastVisitedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      _id: shop3Id,
      shopName: 'Patel Bathware & Tiles Gallery',
      ownerName: 'Hareshbhai Vaghani',
      phone: '9898077777',
      city: 'Wankaner',
      address: 'Main Bazaar, Opp. Town Hall, Wankaner',
      location: { latitude: 22.6105, longitude: 70.9388 },
      routeId: route1Id,
      gstNumber: '24XYZK5555M1Z9',
      gstBalance: 0,
      nonGstBalance: 18200,
      creditLimit: 100000,
      onboardedBy: salesman1Id,
      lastVisitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      _id: shop4Id,
      shopName: 'Maruti Plumbing Solutions',
      ownerName: 'Dineshbhai Prajapati',
      phone: '9898088888',
      city: 'Wankaner',
      address: 'Near Railway Crossing, Mill Road, Wankaner',
      location: { latitude: 22.615, longitude: 70.942 },
      routeId: route1Id,
      gstNumber: '24QWER1122P1Z0',
      gstBalance: 38900,
      nonGstBalance: 22000,
      creditLimit: 150000,
      onboardedBy: salesman1Id,
      lastVisitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      _id: shop5Id,
      shopName: 'Ambica Sanitary & Hardware Mart',
      ownerName: 'Mukeshbhai Doshi',
      phone: '9898099999',
      city: 'Rajkot',
      address: 'Shop 8, Dhebar Road South, Rajkot',
      location: { latitude: 22.3039, longitude: 70.8022 },
      routeId: route2Id,
      gstNumber: '24LKJH4321A1Z5',
      gstBalance: 15000,
      nonGstBalance: 55000,
      creditLimit: 250000,
      onboardedBy: salesman2Id,
      lastVisitedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ];

  const products = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'CPVC Heavy Pipe 1 inch SDR 11 (3m)',
      sku: 'PIP-CPVC-01',
      category: 'Pipes & Fittings',
      brand: 'Astral',
      uom: 'Pcs',
      boxQuantity: 20,
      basePrice: 340,
      gstPercentage: 18,
      stockQuantity: 450,
      isOutOfStock: false,
      description: 'Hot and cold potable water plumbing pipe Astral Poly Technik Ltd',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'UPVC Plumbing Pipe 1/2 inch Schedule 40 (3m)',
      sku: 'PIP-UPVC-02',
      category: 'Pipes & Fittings',
      brand: 'Ashirvad',
      uom: 'Pcs',
      boxQuantity: 25,
      basePrice: 180,
      gstPercentage: 18,
      stockQuantity: 600,
      isOutOfStock: false,
      description: 'Cold water distribution UPVC pipe lead-free certified',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Brass Bib Cock with Wall Flange (Heavy Chrome)',
      sku: 'FIT-BIB-01',
      category: 'Brass C.P. Fittings',
      brand: 'Jaquar',
      uom: 'Pcs',
      boxQuantity: 12,
      basePrice: 480,
      gstPercentage: 18,
      stockQuantity: 140,
      isOutOfStock: false,
      description: 'Solid brass body, 10-year chrome warranty, ceramic disc cartridge',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Two-Way Bib Cock with Wall Flange',
      sku: 'FIT-2WAY-02',
      category: 'Brass C.P. Fittings',
      brand: 'Cera',
      uom: 'Pcs',
      boxQuantity: 10,
      basePrice: 750,
      gstPercentage: 18,
      stockQuantity: 85,
      isOutOfStock: false,
      description: 'Dual outlet for hand shower / health faucet and bucket tap',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Concealed Stop Cock 15mm (Heavy Brass)',
      sku: 'VAL-STOP-01',
      category: 'Valves & Diverters',
      brand: 'Supreme',
      uom: 'Pcs',
      boxQuantity: 12,
      basePrice: 520,
      gstPercentage: 18,
      stockQuantity: 120,
      isOutOfStock: false,
      description: 'Quarter turn concealed valve for bathroom water control',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Single Lever Basin Mixer (Tall Boy)',
      sku: 'FIT-BASIN-03',
      category: 'Brass C.P. Fittings',
      brand: 'Jaquar',
      uom: 'Pcs',
      boxQuantity: 4,
      basePrice: 2450,
      gstPercentage: 18,
      stockQuantity: 32,
      isOutOfStock: false,
      description: 'High neck mixer tap for counter top ceramic wash basins',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'High-Flow Diverter with Concealed Body (40mm)',
      sku: 'VAL-DIV-02',
      category: 'Valves & Diverters',
      brand: 'Cera',
      uom: 'Pcs',
      boxQuantity: 2,
      basePrice: 3850,
      gstPercentage: 18,
      stockQuantity: 18,
      isOutOfStock: false,
      description: 'Hot and cold shower diverter with high flow rate mechanism',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Stainless Steel Health Faucet Set with 1.2m Hose',
      sku: 'ACC-FAUCET-01',
      category: 'Bath Accessories',
      brand: 'Parryware',
      uom: 'Set',
      boxQuantity: 15,
      basePrice: 380,
      gstPercentage: 18,
      stockQuantity: 210,
      isOutOfStock: false,
      description: 'Anti-tangle flexible hose with ergonomic spray trigger',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Table Top Ceramic Wash Basin (Glossy White)',
      sku: 'SAN-BASIN-01',
      category: 'Sanitaryware',
      brand: 'Cera',
      uom: 'Pcs',
      boxQuantity: 1,
      basePrice: 1850,
      gstPercentage: 18,
      stockQuantity: 24,
      isOutOfStock: false,
      description: 'Fine glaze ceramic bowl basin (480x370x130mm)',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Western Water Closet Rimless Wall Hung (Soft Close)',
      sku: 'SAN-WWC-02',
      category: 'Sanitaryware',
      brand: 'Parryware',
      uom: 'Pcs',
      boxQuantity: 1,
      basePrice: 6200,
      gstPercentage: 18,
      stockQuantity: 12,
      isOutOfStock: false,
      description: 'Rimless hygienic flush toilet seat with UF hydraulic seat cover',
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Brass Ball Valve Heavy 1 inch',
      sku: 'VAL-BALL-03',
      category: 'Valves & Diverters',
      brand: 'Astral',
      uom: 'Pcs',
      boxQuantity: 15,
      basePrice: 420,
      gstPercentage: 18,
      stockQuantity: 0,
      isOutOfStock: true, // Sample Out-of-Stock for warehouse toggle testing
      description: 'Forged brass full bore ball valve for main water lines',
    },
  ];

  const orders = [
    {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-2026-0001',
      shop: shop1Id,
      salesman: salesman1Id,
      billType: 'GST',
      items: [
        {
          product: products[0]._id,
          name: products[0].name,
          quantity: 40,
          boxCount: 2,
          price: 340,
          gstPercentage: 18,
          gstAmount: 2448,
          subtotal: 16048,
        },
        {
          product: products[2]._id,
          name: products[2].name,
          quantity: 24,
          boxCount: 2,
          price: 480,
          gstPercentage: 18,
          gstAmount: 2074,
          subtotal: 13594,
        },
      ],
      subtotal: 25120,
      gstTotal: 4522,
      totalAmount: 29642,
      status: 'PACKED',
      dispatchNotes: 'Pack in double bubble wrap for ceramic fittings. Urgent delivery.',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-2026-0002',
      shop: shop2Id,
      salesman: salesman1Id,
      billType: 'NON_GST',
      items: [
        {
          product: products[3]._id,
          name: products[3].name,
          quantity: 20,
          boxCount: 2,
          price: 750,
          gstPercentage: 0,
          gstAmount: 0,
          subtotal: 15000,
        },
        {
          product: products[7]._id,
          name: products[7].name,
          quantity: 30,
          boxCount: 2,
          price: 380,
          gstPercentage: 0,
          gstAmount: 0,
          subtotal: 11400,
        },
      ],
      subtotal: 26400,
      gstTotal: 0,
      totalAmount: 26400,
      status: 'DISPATCHED',
      dispatchedAt: new Date(),
      dispatchNotes: 'Tempo vehicle GJ-03-BW-4521 driver Nareshbhai.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const payments = [
    {
      _id: new mongoose.Types.ObjectId(),
      receiptNumber: 'RCP-2026-0001',
      shop: shop1Id,
      salesman: salesman1Id,
      billType: 'NON_GST',
      amount: 15000,
      mode: 'CASH',
      isSettledWithWarehouse: false, // In salesman cash drawer!
      notes: 'Cash received during morning beat visit.',
      collectedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      receiptNumber: 'RCP-2026-0002',
      shop: shop4Id,
      salesman: salesman1Id,
      billType: 'GST',
      amount: 20000,
      mode: 'CHEQUE',
      chequeNumber: '004521',
      chequeBank: 'HDFC Bank Wankaner',
      chequeDate: new Date(),
      isSettledWithWarehouse: true,
      notes: 'Cheque cleared and handed over to Kishorbhai at warehouse.',
      collectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  const callNotes = [
    {
      _id: new mongoose.Types.ObjectId(),
      shop: shop1Id,
      route: route1Id,
      plannedVisitDate: routes[0].nextVisitDate,
      calledBy: warehouseId,
      callStatus: 'PAYMENT_READY',
      expectedPaymentAmount: 25000,
      remarks: 'Jayeshbhai confirmed payment of ₹25,000 cash will be ready. Also requested Astral pipe price list.',
      calledAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      shop: shop2Id,
      route: route1Id,
      plannedVisitDate: routes[0].nextVisitDate,
      calledBy: warehouseId,
      callStatus: 'ORDER_READY',
      expectedPaymentAmount: 0,
      remarks: 'Stock low on Jaquar bib cocks, order list kept ready.',
      calledAt: new Date(),
    },
  ];

  return { users, routes, shops, products, orders, payments, callNotes };
};

// Standalone seed runner
export const seedDB = async () => {
  try {
    const data = await getSeedDataset();
    await User.deleteMany({});
    await Route.deleteMany({});
    await Shop.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await CallingSheetNote.deleteMany({});

    await User.insertMany(data.users);
    await Route.insertMany(data.routes);
    await Shop.insertMany(data.shops);
    await Product.insertMany(data.products);
    await Order.insertMany(data.orders);
    await Payment.insertMany(data.payments);
    await CallingSheetNote.insertMany(data.callNotes);

    console.log('✅ Realistic Wholesale Plumbing & Bathware Database Seeded Successfully!');
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
  }
};
