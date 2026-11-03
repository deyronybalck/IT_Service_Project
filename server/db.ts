import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'itlab_database.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'hr', 'receptionist', 'technician')),
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 1,
      verification_token TEXT,
      verification_expires_at TEXT,
      reset_password_token TEXT,
      reset_password_expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'individual',
      contact_person TEXT,
      phone TEXT NOT NULL,
      whatsapp TEXT,
      email TEXT,
      address TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT,
      description TEXT,
      unit TEXT NOT NULL DEFAULT 'Pcs',
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      vat_percent REAL NOT NULL DEFAULT 0,
      tax_percent REAL NOT NULL DEFAULT 0,
      warranty_period TEXT DEFAULT '1 Year',
      status TEXT NOT NULL DEFAULT 'active',
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      whatsapp TEXT,
      address TEXT NOT NULL,
      product_category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_number TEXT,
      accessories TEXT,
      reported_problems TEXT NOT NULL,
      physical_condition TEXT,
      received_at TEXT NOT NULL,
      received_by TEXT NOT NULL,
      estimated_delivery_date TEXT,
      estimated_cost REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Received',
      assigned_technician_id TEXT,
      assigned_technician_name TEXT,
      inspection_date TEXT,
      problems_identified TEXT,
      work_required TEXT,
      work_completed TEXT,
      parts_cost REAL NOT NULL DEFAULT 0,
      labor_charge REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total_bill REAL NOT NULL DEFAULT 0,
      amount_received REAL NOT NULL DEFAULT 0,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      customer_approval_status TEXT DEFAULT 'Pending',
      customer_feedback TEXT,
      actual_delivery_date TEXT,
      delivered_by TEXT,
      handover_person_name TEXT,
      handover_person_phone TEXT,
      return_reason TEXT,
      additional_remarks TEXT,
      last_reminder_sent_at TEXT,
      reminder_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS service_parts_used (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_cost REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_status_history (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_schedules (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_type TEXT DEFAULT 'institution',
      location_address TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      service_category TEXT NOT NULL,
      problem_description TEXT NOT NULL,
      assigned_technician_id TEXT,
      assigned_technician_name TEXT,
      schedule_date TEXT NOT NULL,
      schedule_time TEXT,
      priority TEXT NOT NULL DEFAULT 'Normal',
      admin_instructions TEXT,
      expected_duration TEXT,
      status TEXT NOT NULL DEFAULT 'Scheduled',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technician_daily_reports (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      service_location TEXT NOT NULL,
      arrival_time TEXT,
      departure_time TEXT,
      work_performed TEXT NOT NULL,
      problems_found TEXT,
      work_completed TEXT NOT NULL,
      parts_used_json TEXT,
      service_charge REAL NOT NULL DEFAULT 0,
      amount_collected REAL NOT NULL DEFAULT 0,
      outstanding_amount REAL NOT NULL DEFAULT 0,
      handover_person_name TEXT,
      handover_person_phone TEXT,
      customer_feedback TEXT,
      follow_up_required INTEGER NOT NULL DEFAULT 0,
      recommended_next_visit TEXT,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      created_at TEXT NOT NULL,
      FOREIGN KEY(schedule_id) REFERENCES service_schedules(id)
    );

    CREATE TABLE IF NOT EXISTS technician_service_requests (
      id TEXT PRIMARY KEY,
      technician_id TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      contact_person TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      problem_details TEXT NOT NULL,
      service_required TEXT NOT NULL,
      urgency TEXT NOT NULL DEFAULT 'Normal',
      technician_remarks TEXT,
      admin_remarks TEXT,
      status TEXT NOT NULL DEFAULT 'Pending Approval',
      scheduled_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS free_lab_services (
      id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      customer_id TEXT,
      visit_date TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      total_computers INTEGER NOT NULL DEFAULT 0,
      working_computers INTEGER NOT NULL DEFAULT 0,
      non_working_computers INTEGER NOT NULL DEFAULT 0,
      problems_found TEXT,
      work_completed TEXT NOT NULL,
      required_parts TEXT,
      lab_condition TEXT,
      next_visit_recommendation TEXT,
      photo_notes TEXT,
      remarks TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      address TEXT,
      quotation_date TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      prepared_by TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT DEFAULT 'fixed',
      discount_value REAL NOT NULL DEFAULT 0,
      total_discount REAL NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL DEFAULT 0,
      vat_type TEXT NOT NULL DEFAULT 'exclusive',
      vat_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      terms_and_conditions TEXT,
      delivery_time TEXT DEFAULT '2-3 Business Days',
      payment_terms TEXT DEFAULT '100% upon delivery / Net 15',
      status TEXT NOT NULL DEFAULT 'Draft',
      rejection_reason TEXT,
      converted_to_order_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      description TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      vat_percent REAL NOT NULL DEFAULT 0,
      tax_percent REAL NOT NULL DEFAULT 0,
      warranty_period TEXT DEFAULT '1 Year',
      total_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_ledgers (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      reference_type TEXT NOT NULL,
      reference_id TEXT,
      description TEXT NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      running_balance REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS ta_da_claims (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      schedule_id TEXT,
      customer_or_institution TEXT NOT NULL,
      travel_date TEXT NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      transport_expense REAL NOT NULL DEFAULT 0,
      food_allowance REAL NOT NULL DEFAULT 0,
      daily_allowance REAL NOT NULL DEFAULT 0,
      other_expense REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      explanation TEXT,
      attachment_name TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      review_remarks TEXT,
      reviewed_by TEXT,
      paid_at TEXT,
      paid_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_followups (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      related_type TEXT NOT NULL,
      related_id TEXT,
      contact_method TEXT NOT NULL DEFAULT 'Phone Call',
      follow_up_date TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      customer_response TEXT,
      notes TEXT NOT NULL,
      next_follow_up_date TEXT,
      status TEXT NOT NULL DEFAULT 'Completed',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id TEXT PRIMARY KEY,
      service_id TEXT,
      phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      error_message TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);

  // Default Passwords:
  // Admin: Admin@123456
  // HR: Hr@123456
  // Reception: Reception@123456
  // Tech: Tech@123456
  const adminHash = bcrypt.hashSync('Admin@123456', salt);
  const hrHash = bcrypt.hashSync('Hr@123456', salt);
  const recHash = bcrypt.hashSync('Reception@123456', salt);
  const techHash = bcrypt.hashSync('Tech@123456', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, is_active, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);

  insertUser.run('USR-ADMIN', 'Tariqul Islam (System Admin)', 'admin@itlabsolutions.com', adminHash, 'admin', '+8801711000001', now, now);
  insertUser.run('USR-HR', 'Nusrat Jahan (HR Lead)', 'hr@itlabsolutions.com', hrHash, 'hr', '+8801711000002', now, now);
  insertUser.run('USR-REC', 'Farhana Akter (Front Desk / Reception)', 'reception@itlabsolutions.com', recHash, 'receptionist', '+8801711000003', now, now);
  insertUser.run('USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)', 'technician@itlabsolutions.com', techHash, 'technician', '+8801711000004', now, now);
  insertUser.run('USR-TECH2', 'Rafiqul Islam (Hardware Specialist)', 'rafiq@itlabsolutions.com', techHash, 'technician', '+8801711000005', now, now);

  // Settings
  const insertSetting = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value, description) VALUES (?, ?, ?)`);
  insertSetting.run('company_name', 'IT Lab Solutions Limited', 'Company Business Name');
  insertSetting.run('company_address', 'Suite 7B, Al-Razi Complex, 166-167 Shahid Syed Nazrul Islam Sarani, Purana Paltan, Dhaka-1000, Bangladesh', 'Official Registered Address');
  insertSetting.run('company_phone', '+880 2 223389012, +880 1711 000001', 'Contact Numbers');
  insertSetting.run('company_email', 'support@itlabsolutions.com', 'Official Support Email');
  insertSetting.run('company_website', 'https://itlabsolutions.com', 'Official Website');
  insertSetting.run('terms_conditions', '1. Warranty covers manufacturing hardware defects only.\n2. Products left uncollected over 30 days are subject to storage fees.\n3. Goods once received cannot be returned without original inspection slip.\n4. IT Lab Solutions is not responsible for data loss. Customers must backup before submission.', 'Default Terms & Conditions');
  insertSetting.run('default_vat_percent', '5', 'Default VAT percentage');
  insertSetting.run('whatsapp_enabled', '0', 'WhatsApp 30-Day Reminder automated trigger toggle');
  insertSetting.run('whatsapp_phone_number_id', '', 'Meta WhatsApp Business Cloud API Phone Number ID');
  insertSetting.run('whatsapp_access_token', '', 'Meta System User Permanent Access Token');
  insertSetting.run('whatsapp_template_name', 'service_ready_reminder_v1', 'Approved WhatsApp Template Name');

  // Customers
  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, type, contact_person, phone, whatsapp, email, address, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  insertCustomer.run('CUST-1001', 'Dhaka City College', 'institution', 'Md. Zahidul Haque (ICT Dept Head)', '+8801819123456', '+8801819123456', 'ict@dcc.edu.bd', 'Dhanmondi, Road 2, Dhaka-1205', 'Regular client for computer lab maintenance & CCTV support', now, now);
  insertCustomer.run('CUST-1002', 'Apex Footwear IT Cell', 'corporate', 'Engr. Tanvir Ahmed', '+8801713456789', '+8801713456789', 'tanvir.it@apexfootwearltd.com', 'Apex Centre, Gulshan-1, Dhaka', 'Corporate network & server support contract', now, now);
  insertCustomer.run('CUST-1003', 'Prime Bank Ltd (Motijheel Branch)', 'corporate', 'Shahidul Alam (Operations)', '+8801911223344', '+8801911223344', 'motijheel.ops@primebank.com.bd', '119-120 Motijheel C/A, Dhaka-1000', 'Passbook printers and desktop fleet maintenance', now, now);
  insertCustomer.run('CUST-1004', 'Ideal School & College, Motijheel', 'institution', 'Vice Principal Abdul Wadud', '+8801712998877', '+8801712998877', 'contact@idealschool.edu.bd', 'Motijheel, Dhaka-1000', 'Free computer lab service recipient', now, now);
  insertCustomer.run('CUST-1005', 'Mahmudur Rahman (Freelance Designer)', 'individual', 'Mahmudur Rahman', '+8801678112233', '+8801678112233', 'mahmud.design@gmail.com', 'House 42, Road 9/A, Dhanmondi, Dhaka', 'MacBook & custom high-end workstation client', now, now);

  // Products
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, category, brand, model, description, unit, purchase_price, selling_price, vat_percent, tax_percent, warranty_period, status, stock_quantity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  insertProduct.run('PROD-101', 'Samsung 980 PRO 1TB NVMe M.2 SSD', 'SSD', 'Samsung', 'MZ-V8P1T0BW', 'PCIe Gen 4.0 x4, up to 7000MB/s read speed', 'Pcs', 9200, 11500, 5, 0, '5 Years', 45, now);
  insertProduct.run('PROD-102', 'Corsair Vengeance LPX 16GB DDR4 3200MHz', 'RAM', 'Corsair', 'CMK16GX4M1E3200C16', 'High-performance desktop RAM module with aluminum heat spreader', 'Pcs', 3400, 4200, 5, 0, 'Lifetime', 60, now);
  insertProduct.run('PROD-103', 'Hikvision 4-Channel 1080P Turbo HD DVR', 'DVR/NVR', 'Hikvision', 'DS-7204HGHI-K1', 'H.265 Pro+ compression, audio via coaxial cable', 'Pcs', 2800, 3600, 5, 0, '2 Years', 20, now);
  insertProduct.run('PROD-104', 'Hikvision 2MP IR Fixed Turret Camera', 'CCTV Camera', 'Hikvision', 'DS-2CE16D0T-IRF', '1080p resolution, 20m IR distance, IP67 weatherproof', 'Pcs', 1200, 1650, 5, 0, '2 Years', 80, now);
  insertProduct.run('PROD-105', 'Epson EcoTank L3210 All-in-One Ink Tank Printer', 'Printer', 'Epson', 'L3210', 'High-yield ink tank printer, print, scan, copy', 'Pcs', 17800, 20500, 5, 0, '1 Year', 12, now);
  insertProduct.run('PROD-106', 'TP-Link Archer C6 AC1200 Dual Band Gigabit Router', 'Networking Equipment', 'TP-Link', 'Archer C6 v4', 'MU-MIMO gigabit Wi-Fi router with 4 external antennas', 'Pcs', 2900, 3750, 5, 0, '2 Years', 35, now);
  insertProduct.run('PROD-107', 'MaxGreen 650VA Offline UPS', 'UPS', 'MaxGreen', 'MG-650VA', 'High reliability UPS with voltage regulation for desktop and CCTV', 'Pcs', 2400, 3100, 5, 0, '1 Year', 25, now);
  insertProduct.run('PROD-108', 'Thermal Grizzly Kryonaut Thermal Paste (1g)', 'Accessories', 'Thermal Grizzly', 'TG-K-001-RS', 'High performance thermal grease for CPU and GPU servicing', 'Pcs', 550, 850, 5, 0, 'No Warranty', 50, now);
  insertProduct.run('PROD-109', 'Western Digital Purple 2TB Surveillance Hard Drive', 'HDD', 'Western Digital', 'WD20PURZ', 'AllFrame technology for surveillance recording', 'Pcs', 5800, 7100, 5, 0, '3 Years', 18, now);
  insertProduct.run('PROD-110', 'Dell Professional P2419H 24" FHD IPS Monitor', 'Monitor', 'Dell', 'P2419H', 'Ultrathin bezel IPS panel, pivot/height adjustable stand', 'Pcs', 19500, 23500, 5, 0, '3 Years', 10, now);

  // Past & Active Services
  const insertService = db.prepare(`
    INSERT INTO services (
      id, customer_id, customer_name, phone, whatsapp, address, product_category, brand, model, serial_number,
      accessories, reported_problems, physical_condition, received_at, received_by, estimated_delivery_date,
      estimated_cost, status, assigned_technician_id, assigned_technician_name, inspection_date, problems_identified,
      work_required, work_completed, parts_cost, labor_charge, discount, vat_amount, total_bill, amount_received,
      outstanding_balance, customer_approval_status, customer_feedback, actual_delivery_date, delivered_by,
      handover_person_name, handover_person_phone, return_reason, additional_remarks, last_reminder_sent_at,
      reminder_count, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  // Service 1: Completed & Delivered
  insertService.run(
    'SRV-2026-0001', 'CUST-1002', 'Apex Footwear IT Cell', '+8801713456789', '+8801713456789',
    'Apex Centre, Gulshan-1, Dhaka', 'Laptop', 'Dell', 'Latitude 5420', 'SN-DELL-884210',
    'Original 65W USB-C Charger, Targus Carry Bag', 'Screen blinking, excessive fan noise and thermal throttling under load.',
    'Minor scratches on bottom chassis, screen panel clean', '2026-10-15T10:30:00Z', 'Farhana Akter', '2026-10-18',
    4500, 'Delivered', 'USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)', '2026-10-15T14:00:00Z',
    'Dust clogged heatsink fin stack, dried factory thermal paste, loose eDP cable at motherboard connector.',
    'Clean internal thermal assembly, apply Thermal Grizzly Kryonaut, reseat eDP cable with kapton tape.',
    'Internal cooling assembly ultrasonic cleaned, new thermal paste applied, stress tested for 2 hours with no throttling.',
    850, 2000, 250, 130, 2730, 2730,
    0, 'Approved', 'Laptop running cooler and faster than ever. Very satisfied with turnaround.', '2026-10-18T16:45:00Z',
    'Farhana Akter', 'Tanvir Ahmed', '+8801713456789', '', 'All diagnostics passed.', null,
    0, '2026-10-15T10:30:00Z', '2026-10-18T16:45:00Z'
  );

  // Service 2: Ready for Delivery (Customer notified, awaiting pickup)
  insertService.run(
    'SRV-2026-0002', 'CUST-1005', 'Mahmudur Rahman (Freelance Designer)', '+8801678112233', '+8801678112233',
    'House 42, Road 9/A, Dhanmondi, Dhaka', 'Desktop Computer', 'Custom Rig', 'AMD Ryzen 9 5900X / RTX 3080', 'SN-CUST-99214',
    'Power Cord only', 'No display output on boot, motherboard debug LED stuck on VGA.',
    'Tempered glass panel intact, clean chassis interior', '2026-10-28T11:15:00Z', 'Farhana Akter', '2026-10-31',
    6000, 'Ready for Delivery', 'USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)', '2026-10-28T15:30:00Z',
    'PCIe slot dust oxidation and faulty primary NVMe boot drive causing UEFI hang.',
    'Deep clean PCIe Gen 4 slot, install new Samsung 980 Pro 1TB SSD, clone OS partition.',
    'Samsung 980 Pro 1TB installed, Windows 11 cleanly migrated, full GPU 3DMark benchmark passed 100%.',
    11500, 2500, 500, 675, 14175, 5000,
    9175, 'Approved', 'Informed on WhatsApp and phone. Will collect this Saturday afternoon.', null,
    '', '', '', '', 'Product in shelf #B4.', null,
    0, '2026-10-28T11:15:00Z', '2026-10-31T17:00:00Z'
  );

  // Service 3: Overdue / >30 Days undelivered (Testing the 30-Day Reminder workflow!)
  insertService.run(
    'SRV-2026-0003', 'CUST-1001', 'Dhaka City College', '+8801819123456', '+8801819123456',
    'Dhanmondi, Road 2, Dhaka-1205', 'Printer', 'Epson', 'EcoTank L3110', 'SN-EP-3110-8472',
    'Power cable, USB cable', 'Red light blinking paper jam error, black ink nozzle completely clogged.',
    'Ink stains on outer casing, roller wear', '2026-09-20T09:00:00Z', 'Farhana Akter', '2026-09-25',
    3500, 'Ready for Delivery', 'USR-TECH2', 'Rafiqul Islam (Hardware Specialist)', '2026-09-21T11:00:00Z',
    'Foreign paper clip stuck in feed path, printhead piezo nozzles dried out.',
    'Extract foreign object, manual head cleaning solution flush, calibrate printhead alignment.',
    'Paper feed assembly cleared, all color test patterns printing 100% clean.',
    0, 2200, 200, 100, 2100, 1000,
    1100, 'Approved', 'Pending pickup by institution vehicle.', null,
    '', '', '', '', 'Stored in long-term warehouse rack A2. Reached 30+ days.', '2026-10-25T10:00:00Z',
    1, '2026-09-20T09:00:00Z', '2026-10-25T10:00:00Z'
  );

  // Service 4: In Progress
  insertService.run(
    'SRV-2026-0004', 'CUST-1003', 'Prime Bank Ltd (Motijheel Branch)', '+8801911223344', '+8801911223344',
    '119-120 Motijheel C/A, Dhaka-1000', 'UPS', 'MaxGreen', 'Offline 1200VA', 'SN-MG-99412',
    'None', 'Beeps continuously when main line connected, no backup power.',
    'Heavy scratch on top metal enclosure', '2026-11-02T14:20:00Z', 'Farhana Akter', '2026-11-05',
    3800, 'In Progress', 'USR-TECH2', 'Rafiqul Islam (Hardware Specialist)', '2026-11-03T09:30:00Z',
    'Both 12V 7Ah lead acid batteries swollen and leaking, charging circuit MOSFET blown.',
    'Replace 2x 12V 7.2Ah batteries, replace IRF3205 MOSFETs, test automatic voltage regulator.',
    'Battery compartment deoxidized, waiting for replacement battery stock dispatch.',
    2800, 1000, 0, 190, 3990, 0,
    3990, 'Approved', 'Customer authorized battery replacement up to 4000 BDT.', null,
    '', '', '', '', 'High priority for branch counter #3.', null,
    0, '2026-11-02T14:20:00Z', '2026-11-03T09:30:00Z'
  );

  // Status histories
  const insertHistory = db.prepare(`
    INSERT INTO service_status_history (id, service_id, status, notes, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertHistory.run('HIST-1', 'SRV-2026-0001', 'Received', 'Unit received at Paltan front desk.', 'Farhana Akter', '2026-10-15T10:30:00Z');
  insertHistory.run('HIST-2', 'SRV-2026-0001', 'Under Inspection', 'Assigned to Kamrul Hasan for diagnostics.', 'Tariqul Islam', '2026-10-15T14:00:00Z');
  insertHistory.run('HIST-3', 'SRV-2026-0001', 'In Progress', 'Client approved cleaning and repasting.', 'Kamrul Hasan', '2026-10-16T11:00:00Z');
  insertHistory.run('HIST-4', 'SRV-2026-0001', 'Ready for Delivery', 'Completed benchmarks successfully.', 'Kamrul Hasan', '2026-10-17T17:00:00Z');
  insertHistory.run('HIST-5', 'SRV-2026-0001', 'Delivered', 'Collected by Tanvir Ahmed with full payment.', 'Farhana Akter', '2026-10-18T16:45:00Z');

  insertHistory.run('HIST-6', 'SRV-2026-0002', 'Received', 'Received custom PC tower.', 'Farhana Akter', '2026-10-28T11:15:00Z');
  insertHistory.run('HIST-7', 'SRV-2026-0002', 'Ready for Delivery', 'New SSD installed, OS restored.', 'Kamrul Hasan', '2026-10-31T17:00:00Z');

  // Service Schedules
  const insertSchedule = db.prepare(`
    INSERT INTO service_schedules (
      id, customer_id, customer_name, customer_type, location_address, contact_person, contact_phone,
      service_category, problem_description, assigned_technician_id, assigned_technician_name,
      schedule_date, schedule_time, priority, admin_instructions, expected_duration, status, created_by,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const todayStr = new Date().toISOString().split('T')[0];

  insertSchedule.run(
    'SCH-2026-0001', 'CUST-1001', 'Dhaka City College', 'institution', 'Dhanmondi, Road 2, Dhaka-1205',
    'Md. Zahidul Haque', '+8801819123456', 'Networking & CCTV',
    'Main Lab 3 Wi-Fi access points dropping DHCP leases, CCTV camera #4 offline near library entrance.',
    'USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)',
    todayStr, '11:00 AM', 'High',
    'Verify Cat6 cable termination and re-punch patch panel port #14. Check 12V DC power supply to CCTV.',
    '3 Hours', 'Assigned', 'Tariqul Islam', now, now
  );

  insertSchedule.run(
    'SCH-2026-0002', 'CUST-1002', 'Apex Footwear IT Cell', 'corporate', 'Apex Centre, Gulshan-1, Dhaka',
    'Engr. Tanvir Ahmed', '+8801713456789', 'Workstation Maintenance',
    'Quarterly preventive maintenance for 12 executive design workstations.',
    'USR-TECH2', 'Rafiqul Islam (Hardware Specialist)',
    todayStr, '02:30 PM', 'Normal',
    'Perform blower cleaning, software patch verification, and disk health check.',
    '4 Hours', 'Scheduled', 'Tariqul Islam', now, now
  );

  // Free Computer Lab Service
  const insertLab = db.prepare(`
    INSERT INTO free_lab_services (
      id, institution_name, customer_id, visit_date, technician_id, technician_name, total_computers,
      working_computers, non_working_computers, problems_found, work_completed, required_parts,
      lab_condition, next_visit_recommendation, photo_notes, remarks, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  insertLab.run(
    'LAB-2026-0001', 'Ideal School & College, Motijheel', 'CUST-1004', '2026-10-22',
    'USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)', 40,
    34, 6,
    '3 PCs had RAM contact oxidation, 2 had dead CMOS batteries losing time, 1 had failing SATA HDD.',
    'Cleaned RAM gold fingers on 3 systems, replaced 2 CMOS CR2032 cells, reinstalled Windows on 4 systems with deep dust blowing of all 40 chassis.',
    '1x 256GB SSD recommended for PC #18 to replace failing mechanical drive.',
    'Good ventilation, AC working, but needs monthly preventive dust cleaning due to open window airflow.',
    'Scheduled return visit in 60 days (December 2026) to inspect remaining 20 systems in Lab 2.',
    'Lab before/after photos archived with School ICT teacher Md. Mizanur.',
    'Principal expressed high gratitude for IT Lab Solutions Community Education program.',
    now
  );

  // Quotations
  const insertQuo = db.prepare(`
    INSERT INTO quotations (
      id, customer_id, customer_name, contact_person, phone, address, quotation_date, valid_until,
      prepared_by, subtotal, discount_type, discount_value, total_discount, vat_rate, vat_type,
      vat_amount, tax_rate, tax_amount, grand_total, terms_and_conditions, delivery_time,
      payment_terms, status, rejection_reason, converted_to_order_id, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const insertQuoItem = db.prepare(`
    INSERT INTO quotation_items (
      id, quotation_id, product_id, product_name, description, quantity, unit_price,
      discount, vat_percent, tax_percent, warranty_period, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuo.run(
    'QUO-2026-0001', 'CUST-1001', 'Dhaka City College', 'Md. Zahidul Haque', '+8801819123456',
    'Dhanmondi, Road 2, Dhaka-1205', '2026-10-25', '2026-11-15',
    'Tariqul Islam (System Admin)', 82250, 'fixed', 2250, 2250, 5, 'exclusive',
    4000, 0, 0, 84000,
    '1. Prices valid for 20 days.\n2. Delivery within 3 working days from official PO.\n3. Complete manufacturer warranty honoured with on-site replacement.',
    '3 Business Days', '50% advance, balance upon successful commissioning', 'Under Discussion',
    null, null, now, now
  );

  insertQuoItem.run('QITEM-1', 'QUO-2026-0001', 'PROD-101', 'Samsung 980 PRO 1TB NVMe M.2 SSD', 'For ICT Faculty High-Speed Render Nodes', 5, 11500, 0, 5, 0, '5 Years', 57500);
  insertQuoItem.run('QITEM-2', 'QUO-2026-0001', 'PROD-106', 'TP-Link Archer C6 AC1200 Dual Band Gigabit Router', 'Classroom high density Wi-Fi deployment', 4, 3750, 0, 5, 0, '2 Years', 15000);
  insertQuoItem.run('QITEM-3', 'QUO-2026-0001', 'PROD-107', 'MaxGreen 650VA Offline UPS', 'Lab server rack backup', 3, 3100, 0, 5, 0, '1 Year', 9300);

  // Customer Ledger
  const insertLedger = db.prepare(`
    INSERT INTO customer_ledgers (
      id, customer_id, transaction_date, reference_type, reference_id, description,
      debit, credit, running_balance, payment_method, recorded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLedger.run('LED-1001', 'CUST-1002', '2026-10-18', 'SERVICE', 'SRV-2026-0001', 'Service charge & parts for Dell Latitude 5420 repair', 2730, 0, 2730, null, 'Farhana Akter', now);
  insertLedger.run('LED-1002', 'CUST-1002', '2026-10-18', 'PAYMENT', 'SRV-2026-0001', 'Received full cash payment at counter handover', 0, 2730, 0, 'Cash', 'Farhana Akter', now);

  insertLedger.run('LED-1003', 'CUST-1005', '2026-10-28', 'SERVICE', 'SRV-2026-0002', 'Custom Workstation repair & 1TB NVMe SSD upgrade', 14175, 0, 14175, null, 'Farhana Akter', now);
  insertLedger.run('LED-1004', 'CUST-1005', '2026-10-28', 'PAYMENT', 'SRV-2026-0002', 'Initial advance payment via bKash', 0, 5000, 9175, 'bKash', 'Farhana Akter', now);

  // TA/DA Claim
  const insertTADA = db.prepare(`
    INSERT INTO ta_da_claims (
      id, employee_id, employee_name, schedule_id, customer_or_institution, travel_date, from_location,
      to_location, transport_expense, food_allowance, daily_allowance, other_expense, total_amount,
      explanation, attachment_name, status, review_remarks, reviewed_by, paid_at, paid_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertTADA.run(
    'EXP-2026-0001', 'USR-TECH1', 'Kamrul Hasan (Senior Service Engineer)', 'SCH-2026-0001',
    'Dhaka City College', todayStr, 'Paltan Main Office', 'Dhanmondi Road 2',
    350, 250, 300, 50, 950,
    'Emergency callout with heavy cable spool and drill kit via CNG auto-rickshaw. Lunch allowance during lab rewiring.',
    'cng_receipt_oct26.jpg', 'Submitted', null, null, null, null, now, now
  );

  // Customer Followups
  const insertFollowup = db.prepare(`
    INSERT INTO customer_followups (
      id, customer_id, customer_name, related_type, related_id, contact_method, follow_up_date,
      employee_id, employee_name, customer_response, notes, next_follow_up_date, status, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);

  insertFollowup.run(
    'FOL-1001', 'CUST-1001', 'Dhaka City College', 'QUOTATION', 'QUO-2026-0001', 'Phone Call',
    '2026-11-01', 'USR-HR', 'Nusrat Jahan (HR Lead)',
    'Purchase committee reviewed proposal. Awaiting final signature from principal.',
    'Quotation amount 84,000 BDT approved in committee meeting. Promised PO release by next Wednesday.',
    '2026-11-06', 'Completed', now
  );

  insertFollowup.run(
    'FOL-1002', 'CUST-1005', 'Mahmudur Rahman (Freelance Designer)', 'SERVICE', 'SRV-2026-0002', 'WhatsApp',
    '2026-11-02', 'USR-REC', 'Farhana Akter (Front Desk / Reception)',
    'Confirmed he will drop by to collect the rig on Saturday morning.',
    'Reminded about outstanding balance of 9,175 BDT to be cleared via Card or bKash.',
    '2026-11-07', 'Completed', now
  );

  // Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run('NOTIF-1', 'ALL_ADMIN', 'New TA/DA Claim Submitted', 'Kamrul Hasan submitted claim EXP-2026-0001 for BDT 950.', 'tada', '/tada', 0, now);
  insertNotification.run('NOTIF-2', 'ALL_ADMIN', '30-Day Storage Alert', 'Service SRV-2026-0003 (Dhaka City College) has exceeded 30 days undelivered.', 'reminder', '/services', 0, now);
  insertNotification.run('NOTIF-3', 'USR-TECH1', 'Today Schedule Assigned', 'Visit scheduled for Dhaka City College at 11:00 AM.', 'schedule', '/technician/schedules', 0, now);

  // Activity Log
  const insertLog = db.prepare(`
    INSERT INTO activity_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run('LOG-1', 'USR-ADMIN', 'Tariqul Islam', 'admin', 'SYSTEM_INITIALIZE', 'SYSTEM', 'ITLAB-01', 'Database initialized and core operational schemas seeded.', '127.0.0.1', now);
}
