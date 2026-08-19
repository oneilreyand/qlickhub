import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../src/db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkFolderModel,
  TaskModel,
  RequirementModel,
  RequirementTestCaseModel,
  QaDocumentModel,
  QaDocumentVersionModel,
  TaskDocumentModel,
  TaskRequirementModel,
  TaskCommentModel,
  TaskCommentMentionModel,
  TaskAttachmentModel,
  TaskActivityModel,
} from '../src/db/models/index.js';

export async function seedFullTestData() {
  console.log('🔄 Connecting to database for comprehensive data seeding...');
  await sequelize.authenticate();
  console.log('✅ Database connected.');

  // 1. Truncate all tables
  const [tables] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta';
  `);

  const tableNames = (tables as { table_name: string }[]).map((t) => `"${t.table_name}"`);
  if (tableNames.length > 0) {
    console.log(`🗑️ Truncating existing tables: ${tableNames.join(', ')} ...`);
    await sequelize.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE;`);
    console.log('✅ All data truncated successfully.');
  }

  // 2. Create Users
  console.log('👥 Creating Users (PO, Dev, QA, Admin, Viewer)...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    {
      id: uuidv4(),
      email: 'reyand.oneil@assist.id',
      name: "Reyand O'Neil",
      role: 'admin' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'sarah.jenkins@assist.id',
      name: 'Sarah Jenkins',
      role: 'po' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'alex.morgan@assist.id',
      name: 'Alex Morgan',
      role: 'qa_lead' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'kevin.pratama@assist.id',
      name: 'Kevin Pratama',
      role: 'qa_member' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'dina.lestari@assist.id',
      name: 'Dina Lestari',
      role: 'qa_member' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'budi.santoso@assist.id',
      name: 'Budi Santoso',
      role: 'dev' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'siti.rahma@assist.id',
      name: 'Siti Rahma',
      role: 'dev' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'michael.chen@assist.id',
      name: 'Michael Chen',
      role: 'dev' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'amanda.putri@assist.id',
      name: 'Amanda Putri',
      role: 'viewer' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
  ];

  const createdUsers = await UserModel.bulkCreate(usersData);
  const userMap = new Map(createdUsers.map((u) => [u.email, u]));

  const adminUser = userMap.get('reyand.oneil@assist.id')!;
  const poUser = userMap.get('sarah.jenkins@assist.id')!;
  const qaLeadUser = userMap.get('alex.morgan@assist.id')!;
  const qaKevin = userMap.get('kevin.pratama@assist.id')!;
  const qaDina = userMap.get('dina.lestari@assist.id')!;
  const devBudi = userMap.get('budi.santoso@assist.id')!;
  const devSiti = userMap.get('siti.rahma@assist.id')!;
  const devMichael = userMap.get('michael.chen@assist.id')!;
  const viewerAmanda = userMap.get('amanda.putri@assist.id')!;

  console.log(`✅ Created ${createdUsers.length} users.`);

  // 3. Create Workspaces
  console.log('🏢 Creating Workspaces...');
  const workspace1 = await WorkspaceModel.create({
    id: uuidv4(),
    name: 'Fintech Core & Payment System',
    slug: 'fintech-core-payment',
    description: 'Centralized core banking, QRIS payments, credit card settlement and QA verification workspace.',
    ownerId: adminUser.id,
  });

  const workspace2 = await WorkspaceModel.create({
    id: uuidv4(),
    name: 'Merchant SuperApp Mobile',
    slug: 'merchant-superapp-mobile',
    description: 'Merchant dashboard, POS integration, and iOS/Android mobile client engineering.',
    ownerId: adminUser.id,
  });

  // Add members to workspace1
  const membersWorkspace1 = [
    { workspaceId: workspace1.id, userId: adminUser.id, role: 'owner' as const },
    { workspaceId: workspace1.id, userId: poUser.id, role: 'po' as const },
    { workspaceId: workspace1.id, userId: qaLeadUser.id, role: 'admin' as const },
    { workspaceId: workspace1.id, userId: qaKevin.id, role: 'qa' as const },
    { workspaceId: workspace1.id, userId: qaDina.id, role: 'qa' as const },
    { workspaceId: workspace1.id, userId: devBudi.id, role: 'dev' as const },
    { workspaceId: workspace1.id, userId: devSiti.id, role: 'dev' as const },
    { workspaceId: workspace1.id, userId: devMichael.id, role: 'dev' as const },
    { workspaceId: workspace1.id, userId: viewerAmanda.id, role: 'qa' as const },
  ];
  await WorkspaceMemberModel.bulkCreate(membersWorkspace1);

  // Add members to workspace2
  const membersWorkspace2 = [
    { workspaceId: workspace2.id, userId: adminUser.id, role: 'owner' as const },
    { workspaceId: workspace2.id, userId: poUser.id, role: 'po' as const },
    { workspaceId: workspace2.id, userId: devBudi.id, role: 'dev' as const },
    { workspaceId: workspace2.id, userId: qaKevin.id, role: 'qa' as const },
  ];
  await WorkspaceMemberModel.bulkCreate(membersWorkspace2);

  console.log('✅ Created 2 Workspaces with member roles.');

  // 4. Create Hierarchical Work Folders (2-Level Hierarchy in Workspace 1)
  console.log('📁 Creating 2-Level Hierarchical Work Folders...');

  // Level 1: Sprint 24 - Payment Gateway Modernization
  const fSprint24 = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: null,
    name: 'Sprint 24 - Payment Gateway Modernization',
    position: 0,
    createdBy: adminUser.id,
  });

  const fQris = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fSprint24.id,
    name: 'QRIS & Dynamic QR Flow',
    position: 0,
    createdBy: adminUser.id,
  });

  const f3ds = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fSprint24.id,
    name: 'Credit Card 3D Secure 2.0 Integration',
    position: 1,
    createdBy: adminUser.id,
  });

  const fWebhook = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fSprint24.id,
    name: 'Webhook & Merchant Callback Engine',
    position: 2,
    createdBy: adminUser.id,
  });

  // Level 1: Sprint 25 - Digital Onboarding & KYC
  const fSprint25 = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: null,
    name: 'Sprint 25 - User Onboarding & KYC 2.0',
    position: 1,
    createdBy: adminUser.id,
  });

  const fOcr = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fSprint25.id,
    name: 'OCR e-KTP & Biometric Liveness Check',
    position: 0,
    createdBy: adminUser.id,
  });

  const fAml = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fSprint25.id,
    name: 'Automated AML & PEP Screening',
    position: 1,
    createdBy: adminUser.id,
  });

  // Level 1: Q3 Infrastructure & Security Hardening
  const fInfra = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: null,
    name: 'Q3 Platform Reliability & Security',
    position: 2,
    createdBy: adminUser.id,
  });

  const fDbReplication = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fInfra.id,
    name: 'Database Sharding & Read-Replicas',
    position: 0,
    createdBy: adminUser.id,
  });

  const fPasskey = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fInfra.id,
    name: 'OAuth2 & Passkey Biometric Auth',
    position: 1,
    createdBy: adminUser.id,
  });

  // Level 1: Backlog & Future Initiatives
  const fBacklog = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: null,
    name: 'Backlog & Future Initiatives',
    position: 3,
    createdBy: adminUser.id,
  });

  const fAiFraud = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    parentFolderId: fBacklog.id,
    name: 'AI Smart Fraud Anomaly Detection',
    position: 0,
    createdBy: adminUser.id,
  });

  console.log('✅ Hierarchical work folders created.');

  // 5. Create Requirements & Requirement Test Cases
  console.log('📋 Creating Requirements & Test Cases...');

  const req1 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    code: 'REQ-PAY-001',
    title: 'QRIS Dynamic QR Code Generation with 15-Minute Expiry',
    description: 'System must generate standard ASPI EMVCo-compliant QRIS payloads with merchant ID, dynamic amount, and exact 15-minute expiration timestamp.',
    status: 'active',
    createdBy: poUser.id,
  });

  const req2 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    code: 'REQ-PAY-002',
    title: '3DS 2.0 Frictionless & Challenge Flow Gateway',
    description: 'Handle frictionless authorization for risk score < 20 and step-up OTP challenge webview for risk score >= 20 without session timeout.',
    status: 'active',
    createdBy: poUser.id,
  });

  const req3 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    code: 'REQ-KYC-001',
    title: 'e-KTP OCR Data Extraction with Minimum 98% Accuracy',
    description: 'Automatically parse NIK (16 digits), Full Name, Date of Birth, and Address from e-KTP photo with glare and blur resistance filters.',
    status: 'active',
    createdBy: poUser.id,
  });

  const req4 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    code: 'REQ-SEC-001',
    title: 'FIDO2 / Passkey Passwordless Merchant Authentication',
    description: 'Allow merchants to register biometric hardware authenticators (TouchID/FaceID/YubiKey) via WebAuthn API for seamless 2FA-less login.',
    status: 'active',
    createdBy: qaLeadUser.id,
  });

  // Test Cases for Requirements
  await RequirementTestCaseModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req1.id,
      title: 'Verify QR code generation payload complies with ASPI QRIS standard',
      testType: 'e2e',
      status: 'passed',
      executionDetails: 'Verified against Bank Indonesia Sandbox emulator with valid CRC16 checksum.',
      createdBy: qaKevin.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req1.id,
      title: 'Verify QR code rejects payment after 15-minute expiration',
      testType: 'integration',
      status: 'passed',
      executionDetails: 'Simulated expired payment attempt at T+15m01s. Received HTTP 400 QR_EXPIRED.',
      createdBy: qaDina.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req1.id,
      title: 'Stress test concurrent dynamic QR generation at 500 RPS',
      testType: 'integration',
      status: 'passed',
      executionDetails: 'K6 performance run passed with p95 response time of 42ms and 0% error rate.',
      createdBy: qaDina.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req2.id,
      title: 'Verify frictionless authentication when risk score < 20',
      testType: 'e2e',
      status: 'passed',
      executionDetails: 'Card bin 400000 passed without OTP popup. Status changed to AUTHORIZED immediately.',
      createdBy: qaKevin.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req2.id,
      title: 'Verify OTP challenge modal rendered properly on 3DS challenge response',
      testType: 'manual',
      status: 'passed',
      executionDetails: 'ACS webview rendered with responsive viewport and keypad interaction on iOS & Android.',
      createdBy: qaLeadUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req2.id,
      title: 'Verify transaction decline behavior on invalid OTP attempt 3 times',
      testType: 'e2e',
      status: 'failed',
      executionDetails: 'BUG: ACS redirected to error 500 instead of returning HTTP 402 Card Declined with code OTP_MAX_ATTEMPTS.',
      createdBy: qaKevin.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req3.id,
      title: 'Verify NIK, Name, and DOB extraction from clear e-KTP photo',
      testType: 'e2e',
      status: 'passed',
      executionDetails: 'Tested with 25 test samples. NIK regex match: 100%, Name match: 99.2%.',
      createdBy: qaKevin.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req3.id,
      title: 'Handle blurred or glare-affected photo gracefully with user retry prompt',
      testType: 'manual',
      status: 'passed',
      executionDetails: 'User received instant real-time tooltip: "Please avoid camera glare over NIK area".',
      createdBy: qaLeadUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      requirementId: req4.id,
      title: 'Register hardware security key / TouchID on modern browsers',
      testType: 'manual',
      status: 'passed',
      executionDetails: 'Tested on macOS Safari TouchID, Windows Hello, and Android Fingerprint.',
      createdBy: qaLeadUser.id,
    },
  ]);

  console.log('✅ Requirements and test cases created.');

  // 6. Create QA Documents & Versions
  console.log('📄 Creating QA Documents & Markdown Versions...');

  const doc1 = await QaDocumentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    title: 'Test Plan: QRIS Dynamic QR & Settlement Engine',
    docType: 'test_plan',
    status: 'approved',
    ownerId: qaLeadUser.id,
    currentVersion: 1,
    createdBy: qaLeadUser.id,
  });

  await QaDocumentVersionModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    documentId: doc1.id,
    version: 1,
    title: 'Test Plan: QRIS Dynamic QR & Settlement Engine v1.0',
    contentMarkdown: `# Test Plan: QRIS Dynamic QR & Settlement Engine

## 1. Overview
This test plan covers functional, integration, and security verification for the QRIS Dynamic QR payment channel in accordance with Bank Indonesia ASPI standards.

## 2. Test Strategy
- **Functional Testing**: End-to-end QR code generation, scanning, and bank payment callbacks.
- **Resilience Testing**: Network timeouts, simulated bank gateway 502/504 errors, and idempotent callback handling.
- **Security Testing**: Payload tampering, signature verification with RSA-2048, and rate-limiting enforcement.
`,
    inScope: [
      { id: '1', text: 'Dynamic QRIS payload generation with ASPI Tag 54 amount validation', position: 0 },
      { id: '2', text: 'Real-time payment confirmation via Webhook with HMAC-SHA256 signature', position: 1 },
      { id: '3', text: 'Expiry timer handling and automated cancellation after 15 minutes', position: 2 },
    ],
    outScope: [
      { id: '1', text: 'Static merchant table stickers (Covered in Sprint 26)', position: 0 },
      { id: '2', text: 'Cross-border QRIS (Singapore NETS / Thailand PromptPay)', position: 1 },
    ],
    acceptanceCriteria: [
      { id: '1', text: 'All ASPI compliance test vectors pass with 100% assertion score', position: 0 },
      { id: '2', text: 'P99 generation latency is under 150ms under 300 concurrent users', position: 1 },
      { id: '3', text: 'Duplicate webhook callbacks do not trigger multiple ledger entries', position: 2 },
    ],
    changelog: 'Initial version approved by QA Lead & Product Owner.',
    createdBy: qaLeadUser.id,
  });

  const doc2 = await QaDocumentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    title: 'Product Brief: Digital KYC 2.0 & Face Liveness Verification',
    docType: 'product_brief',
    status: 'in_review',
    ownerId: poUser.id,
    currentVersion: 1,
    createdBy: poUser.id,
  });

  await QaDocumentVersionModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    documentId: doc2.id,
    version: 1,
    title: 'Product Brief: Digital KYC 2.0 v1.0',
    contentMarkdown: `# Product Brief: Digital KYC 2.0 & Biometric Verification

## Executive Summary
Upgrade user onboarding flow to reduce drop-off rate from 38% to under 12% by introducing client-side camera framing guides, instant OCR pre-fill, and active 3D face liveness detection.
`,
    inScope: [
      { id: '1', text: 'e-KTP OCR auto-detection with auto-shutter capture', position: 0 },
      { id: '2', text: 'Passive & active face liveness verification (blink, nod, smile)', position: 1 },
    ],
    outScope: [
      { id: '1', text: 'Passport and KITAS verification (Planned for Q4)', position: 0 },
    ],
    acceptanceCriteria: [
      { id: '1', text: 'User journey completion time < 90 seconds', position: 0 },
      { id: '2', text: 'False rejection rate (FRR) < 1.5%', position: 1 },
    ],
    changelog: 'Draft submitted for architecture and QA review.',
    createdBy: poUser.id,
  });

  console.log('✅ QA Documents and versions created.');

  // 7. Create Diverse Tasks & Subtasks
  console.log('🎯 Creating Tasks across PO, Dev, and QA...');

  const today = '2026-08-17';
  const tomorrow = '2026-08-18';
  const thisWeekEnd = '2026-08-21';
  const nextWeek = '2026-08-25';
  const thisMonthEnd = '2026-08-31';
  const overdue2 = '2026-08-14';

  // ==========================================
  // SECTION A: TASK DIBUAT TIM PO (AUTO-ASSIGN KE SARAH JENKINS)
  // Status: todo & in_progress, Assignee: Sarah Jenkins (PO), Reporter: Sarah Jenkins (PO)
  // ==========================================
  console.log('  📌 Creating PO Backlog, PRD & Specification Tasks (Assigned to PO)...');

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: null,
    title: '[PO Spec] Dynamic Merchant Tiering & Transaction Fee Slabs',
    description: 'Draft PRD defining automated MDR fee calculation (0.3% for Micro vs 0.7% for Enterprise) during dynamic QR generation. Ready for Dev estimation.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-18',
    dueDate: nextWeek,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: null,
    title: '[PO Spec] QRIS Refund & Partial Reversal Protocol Specification',
    description: 'Document user flow, cashier reversal PIN auth, and bank settlement ledger reversal steps for canceled QR transactions.',
    status: 'todo',
    priority: 'urgent',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-17',
    dueDate: thisWeekEnd,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    parentTaskId: null,
    title: '[PO Spec] BRD: Biometric Liveness Fallback via Agent Video Call',
    description: 'Define manual escalation path when automated 3D face liveness score is borderline (60-75%). Requires video KYC agent dashboard.',
    status: 'todo',
    priority: 'medium',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-20',
    dueDate: thisMonthEnd,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fPasskey.id,
    parentTaskId: null,
    title: '[PO Spec] PRD: Corporate Merchant Multi-User Role & Dual-Control Approval Matrix',
    description: 'Specification for Maker-Checker workflow on bulk payouts: Maker submits batch transfer, Checker approves with Passkey biometric.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-15',
    dueDate: thisWeekEnd,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fWebhook.id,
    parentTaskId: null,
    title: '[PO Spec] User Story: Automated Daily Settlement Reconciliation Email Digest',
    description: 'Specify CSV report layout, SFTP upload schedule, and encrypted email attachment containing daily settled vs pending transactions.',
    status: 'todo',
    priority: 'low',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-25',
    dueDate: thisMonthEnd,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fAiFraud.id,
    parentTaskId: null,
    title: '[PO Spec] Epic: AI Behavioral Anomaly Scoring on High-Value Transfers',
    description: 'Product requirements for ML velocity limits: block account automatically if >= 3 cards from different issuers are attempted within 180s.',
    status: 'todo',
    priority: 'medium',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-09-01',
    dueDate: '2026-09-15',
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: null,
    title: '[PO Spec] PRD: Merchant Settlement Instant Disbursement via BI-FAST',
    description: 'Real-time 24/7 bank disbursement rail specifications using BI-FAST ISO 20022 message formats.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: poUser.id, // Auto-assigned to PO
    reporterId: poUser.id,
    startDate: '2026-08-16',
    dueDate: nextWeek,
  });

  // ==========================================
  // SECTION A2: TASK DIBUAT ADMIN / TECH LEAD (AUTO-ASSIGN KE REYAND O'NEIL)
  // Status: in_progress & todo, Assignee: Reyand O'Neil (Admin), Reporter: Reyand O'Neil (Admin)
  // ==========================================
  console.log('  📌 Creating Admin / Tech Lead Architecture Tasks (Assigned to Admin)...');

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fDbReplication.id,
    parentTaskId: null,
    title: '[Tech Lead] OJK Data Encryption Key HSM Lifecycle & Key Rotation Architecture',
    description: 'Design annual envelope key rotation procedures and hardware security module (HSM) tamper-evident audit requirements.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: adminUser.id, // Auto-assigned to Admin / Tech Lead
    reporterId: adminUser.id,
    startDate: '2026-08-12',
    dueDate: thisWeekEnd,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fInfra.id,
    parentTaskId: null,
    title: '[Tech Lead] Core Banking Zero-Downtime Multi-Region Disaster Recovery Blueprint',
    description: 'Define Active-Passive failover RPO (< 1s) and RTO (< 30s) across AWS Jakarta and GCP Jakarta cloud regions.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: adminUser.id, // Auto-assigned to Admin / Tech Lead
    reporterId: adminUser.id,
    startDate: '2026-08-14',
    dueDate: nextWeek,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fPasskey.id,
    parentTaskId: null,
    title: '[Tech Lead] Microservices Security Audit & OAuth2 Token Introspection Protocol',
    description: 'Implement mutual TLS (mTLS) between payment microservices and standard RFC 7662 token introspection for internal API gateways.',
    status: 'todo',
    priority: 'high',
    assigneeId: adminUser.id, // Auto-assigned to Admin / Tech Lead
    reporterId: adminUser.id,
    startDate: '2026-08-18',
    dueDate: thisMonthEnd,
  });

  // ==========================================
  // SECTION B: TASK YANG SUDAH & SEDANG DIKERJAKAN TIM DEV (BE & FE)
  // ==========================================
  console.log('  ⚙️ Creating Dev BE & FE Execution Tasks & Subtasks...');

  // 1. QRIS Generation & Callback Ingestion Service
  const tParentQris = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: null,
    title: 'Implement QRIS Generation & Callback Ingestion Service',
    description: 'Core microservice module to produce ASPI-compliant dynamic QR payloads, broadcast real-time SSE payment updates, and verify bank webhook signatures.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: devBudi.id,
    reporterId: poUser.id,
    startDate: '2026-08-11',
    dueDate: thisWeekEnd,
  });

  const stQrisFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: tParentQris.id,
    deliveryArea: 'frontend',
    title: 'Build QR Code display modal with real-time countdown timer & sound prompt',
    description: 'Canvas-based QR code rendering with automatic poll and WebSocket fallback for live status transitions (Pending -> Paid -> Expired).',
    status: 'done',
    priority: 'high',
    assigneeId: devSiti.id,
    reporterId: devBudi.id,
    startDate: '2026-08-11',
    dueDate: '2026-08-14',
    completedAt: new Date('2026-08-14T17:00:00Z'),
  });

  const stQrisBe1 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: tParentQris.id,
    deliveryArea: 'backend',
    title: 'Implement ASPI-compliant QR payload generator API with CRC16 verification',
    description: 'Construct EMVCo TLV string data structure and sign payload with merchant cryptographic keys.',
    status: 'done',
    priority: 'urgent',
    assigneeId: devBudi.id,
    reporterId: poUser.id,
    startDate: '2026-08-11',
    dueDate: '2026-08-13',
    completedAt: new Date('2026-08-13T16:20:00Z'),
  });

  const stQrisBe2 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: tParentQris.id,
    deliveryArea: 'backend',
    title: 'Implement idempotent webhook receiver for Bank settlement notifications',
    description: 'Handle high-volume bank settlement webhooks with Redis distributed locks to prevent double-credit race conditions.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: devMichael.id,
    reporterId: devBudi.id,
    startDate: '2026-08-14',
    dueDate: today,
  });

  // 2. Credit Card 3D Secure 2.0 Integration
  const tParent3ds = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: f3ds.id,
    parentTaskId: null,
    title: 'Credit Card 3D Secure 2.0 Frictionless & Challenge Gateway',
    description: 'Full 3DS2 protocol flow integration with Mastercard Identity Check and Visa Secure ACS servers.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: devBudi.id,
    reporterId: poUser.id,
    startDate: '2026-08-10',
    dueDate: nextWeek,
  });

  const st3dsFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: f3ds.id,
    parentTaskId: tParent3ds.id,
    deliveryArea: 'frontend',
    title: 'Develop 3DS challenge iframe/webview modal with fallback support',
    description: 'Secure sandbox iframe modal listening for PostMessage events from Issuing Bank ACS server.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: devSiti.id,
    reporterId: devBudi.id,
    startDate: '2026-08-12',
    dueDate: tomorrow,
  });

  const st3dsBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: f3ds.id,
    parentTaskId: tParent3ds.id,
    deliveryArea: 'backend',
    title: 'Integrate Mastercard & Visa 3DS server-to-server challenge APIs',
    description: 'Encrypt CReq / CRes payload headers using AES-GCM and parse Authentication Value (CAVV/AAV).',
    status: 'done',
    priority: 'urgent',
    assigneeId: devBudi.id,
    reporterId: poUser.id,
    startDate: '2026-08-10',
    dueDate: '2026-08-15',
    completedAt: new Date('2026-08-15T18:00:00Z'),
  });

  // 3. OCR e-KTP Scanner & Cloud Vision Pipeline
  const tOcrParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    parentTaskId: null,
    title: 'OCR e-KTP Scanner & Cloud Vision Pipeline',
    description: 'Client-side camera guidance with on-device NIK bounding box detection and server-side OCR refinement.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: devSiti.id,
    reporterId: poUser.id,
    startDate: '2026-08-13',
    dueDate: thisMonthEnd,
  });

  const stOcrFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    parentTaskId: tOcrParent.id,
    deliveryArea: 'frontend',
    title: 'Create responsive camera capture interface with ID card border guide',
    description: 'WebRTC video stream overlay with gyroscope tilt indicator and auto-flash trigger when dark.',
    status: 'done',
    priority: 'high',
    assigneeId: devSiti.id,
    reporterId: devSiti.id,
    startDate: '2026-08-13',
    dueDate: '2026-08-16',
    completedAt: new Date('2026-08-16T15:00:00Z'),
  });

  const stOcrBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    parentTaskId: tOcrParent.id,
    deliveryArea: 'backend',
    title: 'Build async image pre-processing and OCR extraction worker',
    description: 'Crop bounding box, apply contrast enhancement filter, and extract key-value JSON data.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: devBudi.id,
    reporterId: poUser.id,
    startDate: '2026-08-14',
    dueDate: thisWeekEnd,
  });

  // 4. Database Read-Replicas & PgBouncer (Done by BE)
  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fDbReplication.id,
    parentTaskId: null,
    title: 'Database Read-Replicas & PgBouncer Connection Optimization',
    description: 'Route analytical reporting and dashboard queries to PostgreSQL read-only replica pool.',
    status: 'done',
    priority: 'medium',
    assigneeId: devBudi.id,
    reporterId: adminUser.id,
    startDate: '2026-08-01',
    dueDate: '2026-08-10',
    completedAt: new Date('2026-08-10T19:00:00Z'),
  });

  // ==========================================
  // SECTION C: TASK YANG SEDANG DI-TEST / DI-VERIFIKASI TIM QA
  // Status: in_review atau QA subtasks in_progress / in_review
  // ==========================================
  console.log('  🧪 Creating Tasks Currently Under Test / In Review by QA Team...');

  // 1. Automated AML & PEP Sanctions (IN REVIEW)
  const tAml = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fAml.id,
    parentTaskId: null,
    title: 'Automated AML & PEP Sanctions List Integration',
    description: 'Real-time fuzzy search against UN, OFAC, and PPATK politically exposed persons database. In active QA validation.',
    status: 'in_review',
    priority: 'high',
    assigneeId: devMichael.id,
    reporterId: poUser.id,
    startDate: '2026-08-08',
    dueDate: today,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fAml.id,
    parentTaskId: tAml.id,
    deliveryArea: 'backend',
    title: 'Integrate daily AML watchlist sync and Jaro-Winkler fuzzy matching algorithm',
    description: 'Index names using trigram similarity and generate automated compliance match score (0 to 100).',
    status: 'done',
    priority: 'high',
    assigneeId: devMichael.id,
    reporterId: devBudi.id,
    startDate: '2026-08-08',
    dueDate: '2026-08-15',
    completedAt: new Date('2026-08-15T12:00:00Z'),
  });

  const stAmlQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fAml.id,
    parentTaskId: tAml.id,
    deliveryArea: 'qa',
    title: 'Verify false positive threshold tuning and audit trail logging',
    description: 'Ensure match threshold >= 85 flags account for manual review while < 85 automatically approves.',
    status: 'in_review',
    priority: 'urgent',
    assigneeId: qaLeadUser.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-15',
    dueDate: today,
  });

  // 2. QA Subtasks currently in progress
  const stQrisQa1 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: tParentQris.id,
    deliveryArea: 'qa',
    title: 'Execute E2E QRIS transaction validation across multiple mock bank emulators',
    description: 'Validate BCA, Mandiri, BRI, and GoPay mock bank payment notifications and verify exact ledger balance adjustments.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: qaKevin.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-15',
    dueDate: tomorrow,
  });

  const stQrisQa2 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fQris.id,
    parentTaskId: tParentQris.id,
    deliveryArea: 'qa',
    title: 'Automate regression test suite for QR expired status & network drop recovery',
    description: 'Write Playwright and Supertest automation scenarios checking client UI recovery when network drops midway during scan.',
    status: 'todo',
    priority: 'medium',
    assigneeId: qaDina.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-18',
    dueDate: thisWeekEnd,
  });

  const st3dsQa1 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: f3ds.id,
    parentTaskId: tParent3ds.id,
    deliveryArea: 'qa',
    title: 'Conduct security pen-test on 3DS card data tokenization endpoint',
    description: 'Audit PCI-DSS compliance: ensure Primary Account Number (PAN) and CVV are never written to logs or database unencrypted.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: qaLeadUser.id,
    reporterId: adminUser.id,
    startDate: '2026-08-14',
    dueDate: thisWeekEnd,
  });

  const st3dsQa2 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: f3ds.id,
    parentTaskId: tParent3ds.id,
    deliveryArea: 'qa',
    title: 'Run test matrix for cardholder authentication failures & timeout recovery',
    description: 'Test scenarios: Wrong OTP, expired OTP session, 3DS server unreachable, and invalid cardholder billing address.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: qaKevin.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-16',
    dueDate: thisWeekEnd,
  });

  const stOcrQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fOcr.id,
    parentTaskId: tOcrParent.id,
    deliveryArea: 'qa',
    title: 'Test OCR extraction with 100+ synthetic ID card test samples (various lighting)',
    description: 'Benchmark character error rate (CER) across low-light, overexposed, skewed, and scratched card samples.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: qaKevin.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-16',
    dueDate: nextWeek,
  });

  // 3. Webhook Load Test (Done by QA)
  const tWebhook = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fWebhook.id,
    parentTaskId: null,
    title: 'High-Throughput Webhook Engine with Exponential Backoff',
    description: 'Merchant notification engine capable of delivering 2,000 requests/sec with retry schedule: 5s, 30s, 5m, 30m, 6h.',
    status: 'done',
    priority: 'medium',
    assigneeId: devMichael.id,
    reporterId: devBudi.id,
    startDate: '2026-08-01',
    dueDate: '2026-08-12',
    completedAt: new Date('2026-08-12T11:00:00Z'),
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fWebhook.id,
    parentTaskId: tWebhook.id,
    deliveryArea: 'backend',
    title: 'Build Redis Queue & Dead Letter Queue (DLQ) dispatcher',
    description: 'BullMQ workers with circuit breaker pattern to protect merchant destination servers from overwhelming surges.',
    status: 'done',
    priority: 'high',
    assigneeId: devMichael.id,
    reporterId: devBudi.id,
    startDate: '2026-08-01',
    dueDate: '2026-08-08',
    completedAt: new Date('2026-08-08T16:00:00Z'),
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: fWebhook.id,
    parentTaskId: tWebhook.id,
    deliveryArea: 'qa',
    title: 'Perform load test with 2,000 concurrent webhook delivery events',
    description: 'Simulated 500 merchant endpoints with varying latency (50ms to 5000ms). Verified zero dropped notifications.',
    status: 'done',
    priority: 'medium',
    assigneeId: qaDina.id,
    reporterId: qaLeadUser.id,
    startDate: '2026-08-09',
    dueDate: '2026-08-12',
    completedAt: new Date('2026-08-12T10:30:00Z'),
  });

  // 4. Unfiled QA & Security Tasks
  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: null,
    parentTaskId: null,
    title: 'Investigate Intermittent WebSocket Disconnections in QA Sandbox',
    description: 'Some automated test runs reported broken pipe after 60 seconds of idle connection during SSE test suite.',
    status: 'in_review',
    priority: 'urgent',
    assigneeId: qaKevin.id,
    reporterId: qaDina.id,
    startDate: '2026-08-16',
    dueDate: tomorrow,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    folderId: null,
    parentTaskId: null,
    title: 'Quarterly PCI-DSS Audit Evidence Preparation',
    description: 'Collate firewall change logs, database encryption keys rotation receipts, and quarterly pen-test sign-offs.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: qaLeadUser.id,
    reporterId: adminUser.id,
    startDate: '2026-08-01',
    dueDate: overdue2,
  });

  console.log('✅ Created comprehensive tasks across all lifecycle stages.');

  // 8. Traceability Links (Task Requirements & Task Documents)
  console.log('🔗 Creating Traceability Links...');

  await TaskRequirementModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParentQris.id,
      requirementId: req1.id,
      linkedBy: poUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParent3ds.id,
      requirementId: req2.id,
      linkedBy: poUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tOcrParent.id,
      requirementId: req3.id,
      linkedBy: poUser.id,
    },
  ]);

  await TaskDocumentModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParentQris.id,
      documentId: doc1.id,
      linkType: 'primary_prd',
      linkedBy: qaLeadUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tOcrParent.id,
      documentId: doc2.id,
      linkType: 'primary_prd',
      linkedBy: poUser.id,
    },
  ]);

  console.log('✅ Traceability links established.');

  // ==========================================
  // SECTION D: TEKTOKAN & ACTIVE DISCUSSIONS (PO, DEV, QA)
  // ==========================================
  console.log('💬 Creating Multi-Turn Tektokan Discussions & Mentions between PO, Dev, and QA...');

  // --- Tektokan Thread 1: QRIS Decimal Formatting & CRC16 Validation ---
  const cQris1 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParentQris.id,
    authorId: qaKevin.id,
    body: 'Hi @budi.santoso, I tested dynamic QRIS generation with decimal inputs (e.g. Rp 10.500,50) in Staging. Bank Mandiri sandbox emulator rejected it with "Invalid Amount Format". Does ASPI standard permit cents/decimals or must it be rounded to integer IDR?',
    createdAt: new Date('2026-08-14T09:15:00Z'),
  });

  await TaskCommentMentionModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    commentId: cQris1.id,
    userId: devBudi.id,
  });

  const cQris2 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParentQris.id,
    authorId: poUser.id,
    parentCommentId: cQris1.id,
    body: '@kevin.pratama @budi.santoso According to ASPI QRIS Spec 4.2.1, Indonesian Rupiah (IDR) transactions cannot contain decimal fractions. The amount must always be formatted as an integer string without decimals. I have clarified this in the Acceptance Criteria.',
    createdAt: new Date('2026-08-14T09:40:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cQris2.id, userId: qaKevin.id },
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cQris2.id, userId: devBudi.id },
  ]);

  const cQris3 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParentQris.id,
    authorId: devBudi.id,
    parentCommentId: cQris1.id,
    body: 'Thanks for clarifying @sarah.jenkins! I added Math.floor() normalization and auto-rounded the amount in PR #142 (deployed to Staging build 84). @kevin.pratama please re-test.',
    createdAt: new Date('2026-08-14T11:20:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cQris3.id, userId: poUser.id },
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cQris3.id, userId: qaKevin.id },
  ]);

  const cQris4 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParentQris.id,
    authorId: qaKevin.id,
    parentCommentId: cQris1.id,
    body: 'Verified in Staging! The QR payload generated properly with integer amount and CRC16 checksum passes Bank Mandiri validator. Marking test case as passed!',
    createdAt: new Date('2026-08-14T14:10:00Z'),
  });

  // --- Tektokan Thread 2: 3DS Challenge Timeout & Webview Hanging ---
  const c3ds1 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParent3ds.id,
    authorId: qaLeadUser.id,
    body: 'Critical finding @siti.rahma @budi.santoso: When the issuing bank ACS simulation experiences network latency > 30s, the 3DS iframe modal hangs with an infinite spinner. User is trapped without a retry button.',
    createdAt: new Date('2026-08-15T10:00:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace1.id, commentId: c3ds1.id, userId: devSiti.id },
    { id: uuidv4(), workspaceId: workspace1.id, commentId: c3ds1.id, userId: devBudi.id },
  ]);

  const c3ds2 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParent3ds.id,
    authorId: devSiti.id,
    parentCommentId: c3ds1.id,
    body: 'Good catch @alex.morgan! I will implement an AbortController with a 25-second watchdog timer in the webview listener. If no CRes event is received in 25s, we trigger a timeout UI banner with "Retry via OTP" and "Cancel Payment" buttons.',
    createdAt: new Date('2026-08-15T10:45:00Z'),
  });

  await TaskCommentMentionModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    commentId: c3ds2.id,
    userId: qaLeadUser.id,
  });

  const c3ds3 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tParent3ds.id,
    authorId: devBudi.id,
    parentCommentId: c3ds1.id,
    body: 'On the backend side, I will also emit HTTP 408 REQUEST_TIMEOUT on the payment status webhook if Visa Directory Server drops connection.',
    createdAt: new Date('2026-08-15T11:15:00Z'),
  });

  // --- Tektokan Thread 3: AML PEP Fuzzy Matching Tuning ---
  const cAml1 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tAml.id,
    authorId: poUser.id,
    body: '@michael.chen @alex.morgan Compliance team review noted that common prefixes like "Drs.", "Haji", and "Ir." caused high false-positive matches (94% similarity) on unrelated names. Can we normalize name honorifics before calculating trigram distance?',
    createdAt: new Date('2026-08-16T08:30:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cAml1.id, userId: devMichael.id },
    { id: uuidv4(), workspaceId: workspace1.id, commentId: cAml1.id, userId: qaLeadUser.id },
  ]);

  const cAml2 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tAml.id,
    authorId: devMichael.id,
    parentCommentId: cAml1.id,
    body: 'I have added an Indonesian honorifics regex sanitizer prior to the Jaro-Winkler scoring pipeline. Pushed to branch `feature/aml-prefix-filter` and updated Staging.',
    createdAt: new Date('2026-08-16T11:00:00Z'),
  });

  const cAml3 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace1.id,
    taskId: tAml.id,
    authorId: qaLeadUser.id,
    parentCommentId: cAml1.id,
    body: 'Re-running the 500-sample test suite against PPATK sanctions list now. False-positive rate dropped from 14.2% down to 1.6%. Excellent improvement!',
    createdAt: new Date('2026-08-16T15:30:00Z'),
  });

  console.log('✅ Multi-turn tektokan discussions created.');

  // 10. Task Attachments
  console.log('📎 Creating Task Attachments & QA Evidence...');

  await TaskAttachmentModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParentQris.id,
      fileName: 'aspi_qris_specification_v3.2.pdf',
      fileSize: 2458000,
      mimeType: 'application/pdf',
      storageRef: 'uploads/docs/aspi_qris_specification_v3.2.pdf',
      storageProvider: 'local',
      category: 'general',
      caption: 'Bank Indonesia official QRIS technical implementation specification.',
      uploaderId: poUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: stQrisQa1.id,
      fileName: 'qris_bca_mandiri_emulator_execution_trace.png',
      fileSize: 684200,
      mimeType: 'image/png',
      storageRef: 'uploads/evidence/qris_bca_mandiri_emulator_execution_trace.png',
      storageProvider: 'local',
      category: 'qa_evidence',
      caption: 'Screenshot of successful mock bank settlement callback in Staging.',
      uploaderId: qaKevin.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: st3dsQa1.id,
      fileName: '3ds_card_tokenization_security_audit.pdf',
      fileSize: 1125000,
      mimeType: 'application/pdf',
      storageRef: 'uploads/evidence/3ds_card_tokenization_security_audit.pdf',
      storageProvider: 'local',
      category: 'qa_evidence',
      caption: 'PCI-DSS SAQ-A tokenization penetration test report with 0 critical findings.',
      uploaderId: qaLeadUser.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tOcrParent.id,
      fileName: 'ektp_camera_framing_ui_mockup.png',
      fileSize: 945000,
      mimeType: 'image/png',
      storageRef: 'uploads/media/ektp_camera_framing_ui_mockup.png',
      storageProvider: 'local',
      category: 'product_media',
      caption: 'Design mockup of high-contrast camera framing guide for mobile viewport.',
      uploaderId: devSiti.id,
    },
  ]);

  console.log('✅ Attachments created.');

  // 11. Task Activity Logs (Audit Trail)
  console.log('📜 Creating Task Activity Logs...');

  await TaskActivityModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParentQris.id,
      actorId: poUser.id,
      action: 'task_created',
      metadataJson: { title: tParentQris.title, priority: tParentQris.priority },
      createdAt: new Date('2026-08-11T09:00:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tParentQris.id,
      actorId: devBudi.id,
      action: 'status_changed',
      metadataJson: { from: 'todo', to: 'in_progress' },
      createdAt: new Date('2026-08-11T10:15:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: stQrisFe.id,
      actorId: devSiti.id,
      action: 'status_changed',
      metadataJson: { from: 'in_progress', to: 'done' },
      createdAt: new Date('2026-08-14T17:00:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: stQrisBe1.id,
      actorId: devBudi.id,
      action: 'status_changed',
      metadataJson: { from: 'in_progress', to: 'done' },
      createdAt: new Date('2026-08-13T16:20:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace1.id,
      taskId: tAml.id,
      actorId: devMichael.id,
      action: 'status_changed',
      metadataJson: { from: 'in_progress', to: 'in_review' },
      createdAt: new Date('2026-08-15T12:00:00Z'),
    },
  ]);

  console.log('✅ Activity audit history created.');

  // Summary
  console.log('\n======================================================');
  console.log('🎉 RICH E2E SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('📊 Summary of Created Data:');
  console.log(`  • PO Backlog Tasks (Unassigned): 8 tasks created by Sarah Jenkins (PO)`);
  console.log(`  • Dev Tasks (BE & FE): 8 tasks & subtasks in progress/done by Budi & Siti & Michael`);
  console.log(`  • QA Testing Tasks: 7 tasks in review/testing by Alex, Kevin, Dina`);
  console.log(`  • Tektokan Discussions: 3 realistic multi-turn threaded comment chains with @mentions`);
  console.log(`  • Workspaces: 2 | Folders: 4 Initiatives + 7 Feature Workstreams`);
  console.log('======================================================\n');

  await sequelize.close();
}

if (process.argv[1]?.endsWith('seedFullTestData.ts') || process.argv[1]?.endsWith('seedFullTestData.js')) {
  seedFullTestData().catch((err) => {
    console.error('❌ Error executing seedFullTestData:', err);
    process.exit(1);
  });
}
