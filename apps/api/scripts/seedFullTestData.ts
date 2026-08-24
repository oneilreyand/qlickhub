import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../src/db/sequelize.js';
import {
  UserModel,
  WorkspaceModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
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
  TaskCreationPermissionModel,
  NotificationModel,
} from '../src/db/models/index.js';

const STORAGE_BASE_DIR = path.resolve(process.cwd(), 'data', 'evidence_storage');

// Helper to write real SVG image files to disk for attachment download & preview
function createEvidenceImageFile(
  workspaceId: string,
  taskId: string,
  fileName: string,
  svgContent: string,
): { storageRef: string; fileSize: number; mimeType: string } {
  const targetDir = path.join(STORAGE_BASE_DIR, workspaceId, taskId);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, fileName);
  fs.writeFileSync(filePath, svgContent, 'utf-8');
  const stats = fs.statSync(filePath);

  return {
    storageRef: `${workspaceId}/${taskId}/${fileName}`,
    fileSize: stats.size,
    mimeType: 'image/svg+xml',
  };
}

export async function seedFullTestData() {
  console.log('🔄 Connecting to database for pristine comprehensive E2E data seeding...');
  await sequelize.authenticate();
  console.log('✅ Database connected.');

  // 1. Truncate all public base tables (except SequelizeMeta)
  const [tables] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'SequelizeMeta';
  `);

  const tableNames = (tables as { table_name: string }[]).map((t) => `"${t.table_name}"`);
  if (tableNames.length > 0) {
    console.log(`🗑️ Truncating tables: ${tableNames.join(', ')} ...`);
    await sequelize.query(`TRUNCATE TABLE ${tableNames.join(', ')} CASCADE;`);
    console.log('✅ All existing data truncated successfully.');
  }

  // Ensure storage dir exists
  if (!fs.existsSync(STORAGE_BASE_DIR)) {
    fs.mkdirSync(STORAGE_BASE_DIR, { recursive: true });
  }

  // 2. Create explicit development fixture accounts for every persisted specialty.
  console.log(
    '👥 Creating 7 Core Users: Owner, PO, Dev BE, Dev FE, Dev Mobile, Dev Fullstack, and QA...',
  );
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    {
      id: uuidv4(),
      email: 'owner@assist.id',
      name: 'Reyand',
      role: 'admin' as const,
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'po@assist.id',
      name: 'Fajar',
      role: 'po' as const,
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'dev.be@assist.id',
      name: 'Indra',
      role: 'dev' as const,
      avatarUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'dev.fe@assist.id',
      name: 'Iwal',
      role: 'dev' as const,
      avatarUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'dev.mobile@assist.id',
      name: 'Nadia',
      role: 'dev' as const,
      avatarUrl: null,
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'dev.fullstack@assist.id',
      name: 'Raka',
      role: 'dev' as const,
      avatarUrl: null,
      passwordHash,
    },
    {
      id: uuidv4(),
      email: 'qa@assist.id',
      name: 'Depi',
      role: 'qa' as const,
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      passwordHash,
    },
  ];

  const createdUsers = await UserModel.bulkCreate(usersData);
  const userMap = new Map(createdUsers.map((u) => [u.email, u]));

  const userOwner = userMap.get('owner@assist.id')!;
  const userPo = userMap.get('po@assist.id')!;
  const userDevBe = userMap.get('dev.be@assist.id')!;
  const userDevFe = userMap.get('dev.fe@assist.id')!;
  const userDevMobile = userMap.get('dev.mobile@assist.id')!;
  const userDevFullstack = userMap.get('dev.fullstack@assist.id')!;
  const userQa = userMap.get('qa@assist.id')!;

  console.log(`✅ Created ${createdUsers.length} users with standard password 'Password123!'.`);

  // 3. Create Main Primary Workspace
  console.log('🏢 Creating Fintech Ecosystem & Core Banking Workspace...');
  const workspace = await WorkspaceModel.create({
    id: uuidv4(),
    name: 'Fintech Ecosystem & Core Banking Platform',
    slug: 'fintech-core-banking',
    description:
      'Enterprise payment orchestration, ASPI-standard QRIS dynamic gateway, biometric KYC verification, and automated QA traceability hub.',
    ownerId: userOwner.id,
    allowQaTaskCreation: true,
  });

  // Assign all users to the Workspace; authorization remains the generic dev role.
  const workspaceMembers = [
    { workspaceId: workspace.id, userId: userOwner.id, role: 'owner' as const },
    { workspaceId: workspace.id, userId: userPo.id, role: 'po' as const },
    { workspaceId: workspace.id, userId: userDevBe.id, role: 'dev' as const },
    { workspaceId: workspace.id, userId: userDevFe.id, role: 'dev' as const },
    { workspaceId: workspace.id, userId: userDevMobile.id, role: 'dev' as const },
    { workspaceId: workspace.id, userId: userDevFullstack.id, role: 'dev' as const },
    { workspaceId: workspace.id, userId: userQa.id, role: 'qa' as const },
  ];
  const createdWorkspaceMembers = await WorkspaceMemberModel.bulkCreate(workspaceMembers);
  const membershipByUserId = new Map(
    createdWorkspaceMembers.map((member) => [member.userId, member]),
  );
  await WorkspaceMemberSpecialtyModel.bulkCreate([
    {
      workspaceId: workspace.id,
      workspaceMemberId: membershipByUserId.get(userDevBe.id)!.id,
      specialty: 'backend',
      createdBy: userOwner.id,
    },
    {
      workspaceId: workspace.id,
      workspaceMemberId: membershipByUserId.get(userDevFe.id)!.id,
      specialty: 'frontend',
      createdBy: userOwner.id,
    },
    {
      workspaceId: workspace.id,
      workspaceMemberId: membershipByUserId.get(userDevMobile.id)!.id,
      specialty: 'mobile',
      createdBy: userOwner.id,
    },
    {
      workspaceId: workspace.id,
      workspaceMemberId: membershipByUserId.get(userDevFullstack.id)!.id,
      specialty: 'fullstack',
      createdBy: userOwner.id,
    },
  ]);

  // Grant Task Creation Permissions
  await TaskCreationPermissionModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      userId: userQa.id,
      grantedBy: userOwner.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      userId: userDevBe.id,
      grantedBy: userOwner.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      userId: userDevFe.id,
      grantedBy: userOwner.id,
    },
  ]);

  console.log('✅ Workspace created with persisted Developer specialties.');

  // 4. Create 2-Level Hierarchical Work Folders
  console.log('📁 Creating 2-Level Hierarchical Work Folders...');

  // Level 1: Sprint 24
  const fSprint24 = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: null,
    name: 'Sprint 24 - Payment Gateway & Real-time Settlement',
    position: 0,
    createdBy: userOwner.id,
  });

  const fQris = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fSprint24.id,
    name: 'QRIS Dynamic QR Code Flow',
    position: 0,
    createdBy: userOwner.id,
  });

  const fWebhook = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fSprint24.id,
    name: 'Webhook Callback & Idempotency Engine',
    position: 1,
    createdBy: userOwner.id,
  });

  const f3ds = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fSprint24.id,
    name: 'Credit Card 3D Secure 2.0 Integration',
    position: 2,
    createdBy: userOwner.id,
  });

  // Level 1: Sprint 25
  const fSprint25 = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: null,
    name: 'Sprint 25 - Digital Onboarding & KYC 2.0',
    position: 1,
    createdBy: userOwner.id,
  });

  const fOcr = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fSprint25.id,
    name: 'e-KTP OCR & Edge Bounding Box',
    position: 0,
    createdBy: userOwner.id,
  });

  const fAml = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fSprint25.id,
    name: 'Automated AML & PPATK Sanctions Screening',
    position: 1,
    createdBy: userOwner.id,
  });

  // Level 1: Q3 Infrastructure & Hardening
  const fInfra = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: null,
    name: 'Q3 Platform Resilience & Security Hardening',
    position: 2,
    createdBy: userOwner.id,
  });

  const fDbPool = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fInfra.id,
    name: 'Database High Availability & PgBouncer',
    position: 0,
    createdBy: userOwner.id,
  });

  const fPasskey = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fInfra.id,
    name: 'FIDO2 Passkey & WebAuthn Integration',
    position: 1,
    createdBy: userOwner.id,
  });

  // Level 1: Backlog & Future Initiatives
  const fBacklog = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: null,
    name: 'Backlog & Future Initiatives',
    position: 3,
    createdBy: userOwner.id,
  });

  const fAiFraud = await WorkFolderModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    parentFolderId: fBacklog.id,
    name: 'AI Smart Fraud Scoring & Anomaly Detection',
    position: 0,
    createdBy: userOwner.id,
  });

  console.log('✅ Hierarchical folders structure created.');

  // 5. Create PRD Requirements & Requirement Test Cases
  console.log('📋 Creating Requirements & Comprehensive Test Cases...');

  const req1 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    code: 'REQ-PAY-001',
    title: 'ASPI EMVCo Dynamic QRIS Generation with 15-Minute Expiry',
    description: `### Functional Specification for Dynamic QRIS
The system must generate standard ASPI EMVCo-compliant QRIS payloads with merchant ID, dynamic amount, and exact 15-minute expiration timestamp.

#### Key Constraints:
1. **TLV Structure**: Must conform to ASPI QRIS 4.2.1 EMVCo TLV format.
2. **Amount Tag 54**: Must be formatted as an integer string without floating decimal fractions (IDR cents are prohibited).
3. **CRC16 Checksum (Tag 63)**: Must calculate valid CRC-16/CCITT-FALSE checksum over all preceding payload bytes.
4. **TTL Expiry Enforcement**: Redis TTL key with 900 seconds (15 min) duration. Payment attempts after expiration must return \`HTTP 400 QR_EXPIRED\`.
5. **Idempotency**: Duplicate payment notifications from acquiring bank switch must not double-credit merchant balances.`,
    url: 'https://docs.bi.go.id/qris-aspi-spec-v3.2',
    status: 'active',
    createdBy: userPo.id,
  });

  const req2 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    code: 'REQ-KYC-001',
    title: 'e-KTP OCR Data Extraction with Minimum 98% Accuracy & Glare Suppression',
    description: `### Specification for Automated e-KTP Optical Character Recognition
Automatically parse NIK (16 numeric digits), Full Name, Date of Birth, Gender, Blood Type, Address, and Expiry from camera photo with real-time glare and blur resistance filters.

#### Regulatory Guidelines:
- Compliance with OJK Circular Letter No. 14/SEOJK.07/2014 on Consumer Protection and Digital Identity Verification.
- Validation against Dukcapil REST API v3 hash protocol.
- Character Error Rate (CER) must remain strictly below 1.5% across tested lighting environments.`,
    url: 'https://ojk.go.id/regulations/digital-kyc-guidelines',
    status: 'active',
    createdBy: userPo.id,
  });

  const req3 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    code: 'REQ-SEC-001',
    title: 'FIDO2 / WebAuthn Passkey Passwordless Biometric Merchant Authentication',
    description: `### FIDO2 WebAuthn Passkey Specification
Allow merchants and system administrators to register hardware biometric authenticators (Apple TouchID/FaceID, Windows Hello, YubiKey 5 NFC) via W3C WebAuthn Level 2 API for phishing-resistant passwordless authentication.

#### Security Requirements:
- User verification required (\`userVerification: "required"\`).
- Attestation statement format verification against Apple & Google root trust chains.
- Sign count replay attack detection: verify counter increments monotonically on every authentication challenge.`,
    url: 'https://w3c.github.io/webauthn/',
    status: 'active',
    createdBy: userOwner.id,
  });

  const req4 = await RequirementModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    code: 'REQ-AML-001',
    title: 'Automated AML & PPATK Sanctions Screening with Jaro-Winkler Matching',
    description: `### Anti-Money Laundering (AML) Screening Engine
Real-time fuzzy search against United Nations Security Council (UNSC), OFAC SDN, and PPATK politically exposed persons (PEP) blacklist database.

#### Fuzzy Matching Constraints:
- Jaro-Winkler similarity coefficient >= 0.85 triggers mandatory manual compliance review.
- Automatic Indonesian honorifics normalization (stripping prefixes: "Haji", "Drs.", "Ir.", "Prof.", "Hj.") prior to trigram distance computation.`,
    url: 'https://www.ppatk.go.id/peraturan/aml-screening-protocols',
    status: 'active',
    createdBy: userPo.id,
  });

  // Test Cases for Requirements with long, detailed execution output
  await RequirementTestCaseModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req1.id,
      title: 'Verify Dynamic QR payload generation conforms to ASPI QRIS EMVCo TLV specs',
      testType: 'e2e',
      status: 'passed',
      executionDetails: `### Test Execution Log (E2E Automated)
- **Framework**: Supertest + Jest
- **Environment**: Staging Cluster (k8s-core-sandbox-01)
- **Timestamp**: 2026-08-14 10:22:15 WIB

#### Request Payload:
\`\`\`json
{
  "merchantId": "MERC-ID-9928172",
  "storeId": "STORE-JKT-01",
  "transactionAmount": 150000,
  "currency": "IDR",
  "expiryDurationSeconds": 900
}
\`\`\`

#### Validation Checks:
- [x] Tag 00 (Payload Format Indicator): \`01\`
- [x] Tag 01 (Point of Initiation Method): \`12\` (Dynamic QR)
- [x] Tag 26 (Merchant Account Information - QRIS): Valid ASPI NNS \`93600009\`
- [x] Tag 53 (Transaction Currency): \`360\` (IDR)
- [x] Tag 54 (Transaction Amount): \`150000\` (Strictly integer formatted)
- [x] Tag 58 (Country Code): \`ID\`
- [x] Tag 63 (CRC-16/CCITT-FALSE): \`4A7F\` (Matched expected polynomial checksum 0x1021)

**Result**: ALL 7 ASSERTIONS PASSED (Duration: 34ms).`,
      createdBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req1.id,
      title: 'Verify payment rejection and HTTP 400 when dynamic QR exceeds 15-minute TTL',
      testType: 'integration',
      status: 'passed',
      executionDetails: `### Integration Test: QR Expiration Simulation
1. Created dynamic QR token \`qris_live_dyn_788921a\` with 15-minute TTL.
2. Fast-forwarded Redis mock clock to \`T + 15m 02s\`.
3. Injected simulated payment callback from Bank Central Asia (BCA) switch.
4. **Received Status**: \`HTTP 400 Bad Request\`
5. **Response Body**:
\`\`\`json
{
  "errorCode": "QRIS_TRANSACTION_EXPIRED",
  "message": "The dynamic QR code has expired at 2026-08-14T10:37:15Z. Please regenerate a new QR code.",
  "timestamp": "2026-08-14T10:37:17.102Z"
}
\`\`\`
**Result**: Redis expired key correctly triggered transactional rollback.`,
      createdBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req1.id,
      title: 'High-concurrency load test at 500 RPS on dynamic QR generation API',
      testType: 'integration',
      status: 'passed',
      executionDetails: `### K6 Benchmark Summary Report
- **Virtual Users (VUs)**: 100 concurrent workers
- **Duration**: 5 minutes sustained load
- **Target RPS**: 500 requests/second
- **Total Requests Executed**: 150,000 requests

| Metric | Target SLA | Measured Value | Status |
| :--- | :--- | :--- | :--- |
| **P50 Latency** | < 25ms | 11.4ms | ✅ PASS |
| **P95 Latency** | < 80ms | 38.2ms | ✅ PASS |
| **P99 Latency** | < 150ms | 64.9ms | ✅ PASS |
| **Error Rate (HTTP 5xx)** | < 0.01% | 0.000% (0 errors) | ✅ PASS |
| **CPU Utilization** | < 70% | 46.2% average | ✅ PASS |`,
      createdBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req2.id,
      title: 'e-KTP OCR accuracy verification across 120 diverse Indonesian ID samples',
      testType: 'e2e',
      status: 'failed',
      executionDetails: `### E2E Test Suite Run: OCR Extraction Matrix
- **Total Test Samples**: 120 physical & synthetic e-KTP cards
- **Passed Extractions**: 111 / 120 (92.5%)
- **Failed Extractions**: 9 / 120 (7.5%)
- **Required SLA**: >= 98.0% accuracy

#### Failure Analysis:
- In low-light environments (< 150 lux), camera flash reflection created a white glare streak across the 16-digit NIK field.
- The OCR bounding box parser failed to segment digits \`3\` and \`8\` properly due to inadequate contrast normalization.
- **Bug logged**: Task [FE-204] - Contrast auto-leveling filter needed in WebAssembly worker before calling server inference.`,
      createdBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req3.id,
      title: 'Register TouchID/FaceID passkey hardware credential and perform biometric login',
      testType: 'manual',
      status: 'passed',
      executionDetails: `### Manual Test Execution on Physical Devices:
1. **Device 1**: Apple MacBook Pro M3 Max (macOS 15.1, Safari 18.0) -> TouchID registration & assertion succeeded in 420ms.
2. **Device 2**: iPhone 15 Pro (iOS 18.0, Safari) -> FaceID prompt rendered smoothly, signed challenge verified against Apple WebAuthn Root CA.
3. **Device 3**: Lenovo ThinkPad (Windows 11 23H2, Chrome 128) -> Windows Hello PIN & Fingerprint authenticator passed.
4. **Device 4**: Google Pixel 8 (Android 15, Chrome) -> Biometric passkey credential sync via Google Password Manager validated.`,
      createdBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      requirementId: req4.id,
      title: 'Verify Indonesian honorifics sanitizer drops false-positive matches under 2.0%',
      testType: 'integration',
      status: 'passed',
      executionDetails: `### AML PEP Trigram Distance Benchmark:
- Test sample dataset: 500 common Indonesian names containing titles ("Ir. H. Budi Santoso, M.Sc.", "Dr. Hj. Siti Aminah").
- **Without Sanitizer**: False-positive manual review triggers = 71 cases (14.2%).
- **With Sanitizer**: False-positive triggers dropped to 8 cases (1.6%).
- Target SLA (< 2.0%) successfully achieved.`,
      createdBy: userQa.id,
    },
  ]);

  console.log('✅ Requirements and test cases created.');

  // 6. Create QA Documents & Rich Version Histories
  console.log('📄 Creating QA Documents & Markdown Test Plans...');

  const docTestPlan = await QaDocumentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    title: 'Master Test Plan: QRIS Dynamic QR & Bank Settlement Engine',
    docType: 'test_plan',
    status: 'approved',
    ownerId: userQa.id,
    currentVersion: 1,
    createdBy: userQa.id,
  });

  await QaDocumentVersionModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    documentId: docTestPlan.id,
    version: 1,
    title: 'Master Test Plan: QRIS Dynamic QR & Bank Settlement Engine v1.0',
    contentMarkdown: `# Master Test Plan: QRIS Dynamic QR & Bank Settlement Engine

## 1. Executive Summary & Objective
This document outlines the testing scope, strategy, test environment configurations, and acceptance criteria for the implementation of the **Dynamic QRIS Payment & Real-Time Bank Settlement Engine** within the Core Banking Platform.

## 2. Architecture & Transaction Flow
The dynamic QR generation service accepts merchant checkout parameters, formats the payload according to **ASPI QRIS 4.2.1 EMVCo Specification**, generates a high-resolution vector QR code, and establishes a Server-Sent Events (SSE) channel for real-time payment state broadcasting.

\`\`\`
[ Customer Mobile App ]
         │ (1. Scan Dynamic QR)
         ▼
[ Merchant POS / Web Checkout ] ────(2. Request QR)───► [ Core QRIS Gateway ]
                                                             │ (3. Save TTL Lock)
                                                             ▼
                                                    [ Redis Cluster 7.2 ]
                                                             ▲
                                                             │ (4. Bank Callback)
[ Bank Central Switching (ASPI) ] ───(5. Webhook HTTP POST)──┘
\`\`\`

## 3. Scope of Testing
- **Functional Testing**: Dynamic payload formation, CRC16 verification, fee calculation slab validation.
- **Resilience Testing**: Bank switch network dropouts, webhook retry backoff schedule, idempotent deduplication.
- **Security & Compliance**: HMAC-SHA256 signature verification, PCI-DSS tokenization compliance.
`,
    inScope: [
      {
        id: '1',
        text: 'Dynamic QRIS payload generation with ASPI Tag 54 amount validation',
        position: 0,
      },
      {
        id: '2',
        text: 'Real-time payment confirmation via Webhook with HMAC-SHA256 signature',
        position: 1,
      },
      {
        id: '3',
        text: 'Expiry timer handling and automated cancellation after 15 minutes',
        position: 2,
      },
      {
        id: '4',
        text: 'Redis distributed locking to eliminate double-credit race conditions',
        position: 3,
      },
    ],
    outScope: [
      { id: '1', text: 'Static merchant table stickers (Scheduled for Sprint 27)', position: 0 },
      {
        id: '2',
        text: 'Cross-border QRIS (Singapore NETS / Thailand PromptPay settlement rails)',
        position: 1,
      },
    ],
    acceptanceCriteria: [
      {
        id: '1',
        text: '100% of ASPI compliance EMVCo test vectors pass with exact CRC16 match',
        position: 0,
      },
      {
        id: '2',
        text: 'P99 generation latency is under 150ms under 500 concurrent requests/sec',
        position: 1,
      },
      {
        id: '3',
        text: 'Duplicate webhook callbacks do not trigger multiple ledger entries',
        position: 2,
      },
    ],
    changelog: 'Approved by Product Owner, Tech Lead, and QA Lead for production release.',
    createdBy: userQa.id,
  });

  const docKycBrief = await QaDocumentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fOcr.id,
    title: 'Product Brief: Digital KYC 2.0 & Biometric Face Liveness Verification',
    docType: 'product_brief',
    status: 'in_review',
    ownerId: userPo.id,
    currentVersion: 1,
    createdBy: userPo.id,
  });

  await QaDocumentVersionModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    documentId: docKycBrief.id,
    version: 1,
    title: 'Product Brief: Digital KYC 2.0 & Biometric Face Liveness Verification v1.0',
    contentMarkdown: `# Product Brief: Digital KYC 2.0 & Biometric Face Liveness

## 1. Problem Statement
The legacy onboarding funnel experienced an average user drop-off rate of **38.4%** due to manual typing errors during 16-digit NIK entry and recurring photo blur rejections.

## 2. Product Objectives & Target Metrics
1. **Reduce User Funnel Drop-off**: From 38.4% down to under 12.0%.
2. **Accelerate Time-to-Complete**: Median user onboarding time reduced from 4.8 minutes to under 75 seconds.
3. **Automate Data Extraction**: Achieve >= 98.0% zero-touch OCR auto-fill accuracy for Indonesian e-KTP.
`,
    inScope: [
      {
        id: '1',
        text: 'Real-time client camera framing guidance with gyroscope angle detection',
        position: 0,
      },
      {
        id: '2',
        text: 'Auto-shutter capture when card borders and sharpness pass threshold',
        position: 1,
      },
      {
        id: '3',
        text: 'Active & passive 3D face liveness detection (blink, tilt, smile detection)',
        position: 2,
      },
    ],
    outScope: [
      {
        id: '1',
        text: 'Passport and KITAS foreigner document verification (Planned for Q4)',
        position: 0,
      },
    ],
    acceptanceCriteria: [
      {
        id: '1',
        text: 'Median onboarding duration under 75 seconds on mobile 4G network',
        position: 0,
      },
      {
        id: '2',
        text: 'False Rejection Rate (FRR) < 1.5% and False Acceptance Rate (FAR) < 0.001%',
        position: 1,
      },
    ],
    changelog: 'Initial version draft submitted by Sarah Jenkins (PO).',
    createdBy: userPo.id,
  });

  console.log('✅ QA Documents and version history created.');

  // 7. Create End-to-End Parent Tasks & Subtasks with Maximal Text Lengths
  console.log(
    '🎯 Creating Rich Parent Tasks & Subtasks (Maximizing Text Lengths for Stress Testing)...',
  );

  const today = '2026-08-19';
  const yesterday = '2026-08-18';
  const tomorrow = '2026-08-20';
  const thisWeekEnd = '2026-08-22';
  const nextWeek = '2026-08-28';
  const thisMonthEnd = '2026-08-31';

  // ==========================================
  // SCENARIO 1: QRIS DYNAMIC GATEWAY (IN PROGRESS)
  // ==========================================
  const tQrisParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: null,
    title:
      '[EPIC-PAY-101] ASPI EMVCo Dynamic QRIS Generation with 15-Minute Expiry & Real-time Webhook Dispatcher',
    description: `# ASPI EMVCo Dynamic QRIS Generation Engine & Real-Time Settlement Hub

## 1. System Overview & Architectural Topology
This epic implements the end-to-end payment processing lifecycle for dynamic Indonesian National Standard QR (QRIS). The architecture couples an ultra-low latency TLV payload generation engine with asynchronous Redis-backed TTL state management, Server-Sent Events (SSE) for front-facing checkout clients, and an idempotent webhook notification dispatcher.

### Architectural Sequence Diagram:
\`\`\`
Customer Browser               Checkout Gateway             Redis 7.2 Cache          Acquiring Bank Switch
       │                              │                            │                           │
       ├─── 1. Click "Pay via QR" ───►│                            │                           │
       │                              ├─── 2. Generate Payload ───►│                           │
       │                              ├─── 3. Set TTL 900s ───────►│                           │
       │◄── 4. Render Dynamic QR ─────┤                            │                           │
       │    (SSE stream opened)       │                            │                           │
       │                              │                            │                           │
       │    (Customer Scans & Pays)   │                            │                           │
       │                              │◄── 5. Bank Webhook (POST) ─┼───────────────────────────┤
       │                              ├─── 6. Validate Signature ──┼───────────────────────────┤
       │                              ├─── 7. Acquire Mutex Lock ─►│                           │
       │                              ├─── 8. Settle Ledger DB ────┼───────────────────────────┤
       │◄── 9. Push "PAID" Event ─────┤                            │                           │
\`\`\`

---

## 2. Technical Payload Specifications (ASPI EMVCo TLV 4.2.1)
The backend must construct a strictly compliant Tag-Length-Value (TLV) string containing all mandatory tags:

| Tag ID | Field Name | Format | Example Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| **00** | Payload Format Indicator | String(2) | \`01\` | Must always be constant "01" |
| **01** | Point of Initiation | String(2) | \`12\` | "12" designates dynamic single-use QR |
| **26** | Merchant Account Info | TLV Sub-block | \`0016ID.CO.ASSIST.01\` | Global Unique Merchant Identifier |
| **52** | Merchant Category Code | String(4) | \`5411\` | Grocery Stores / General Merchant |
| **53** | Transaction Currency | String(3) | \`360\` | ISO 4217 Numeric Code for IDR |
| **54** | Transaction Amount | Number String | \`150000\` | Must NOT contain decimal fractions |
| **58** | Country Code | String(2) | \`ID\` | Indonesia ISO 3166-1 alpha-2 |
| **59** | Merchant Name | String(25) | \`ASSIST CORE PAY\` | Merchant brand legal entity name |
| **60** | Merchant City | String(15) | \`JAKARTA PUSAT\` | Merchant registered business location |
| **62** | Additional Data Field | TLV Sub-block | \`0108INV-9921\` | Reference invoice bill number |
| **63** | Cyclic Redundancy Check | Hex(4) | \`4A7F\` | CRC-16/CCITT-FALSE polynomial (0x1021) |

---

## 3. Resilience, Concurrency & Idempotency Rules
1. **Double-Credit Protection**: When processing high-frequency webhook notifications, the backend must execute an atomic \`SET lock:qris:{billId} "processing" EX 30 NX\` command before querying or mutating the database.
2. **Exponential Backoff Retry Schedule**: In case the merchant webhook destination returns HTTP 5xx or connection timeout, the BullMQ worker will retry delivery across 5 attempts: **5s, 30s, 2m, 15m, and 1h**.
3. **Dead Letter Queue (DLQ)**: Permanently unresolvable deliveries are pushed to \`payment:webhook:dlq\` for manual operator reconciliation.

---

## 4. Rollback & Disaster Recovery Plan
In the event of an unrecoverable failure in the primary payment gateway, traffic will automatically route to the secondary backup provider (Midtrans/Xendit fallback bridge) within 3 seconds via Cloudflare DNS health checks.`,
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: null,
    reporterId: userPo.id,
    reviewedBy: userOwner.id,
    reviewNotes: `### Architecture Review Sign-Off:
- Reviewed by Alex Owner (Tech Lead/Admin).
- Redis TTL lock design approved.
- Ensure strict PCI-DSS and OJK audit compliance during real bank callback handling.`,
    startDate: '2026-08-11',
    dueDate: thisWeekEnd,
  });

  // Subtask 1: Backend QR Payload Generator (DONE)
  const stQrisBe1 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-101] Implement ASPI EMVCo TLV Payload Generator with CRC16-CCITT & Redis TTL Expiry',
    description: `### Technical Implementation Details
Construct the core cryptographic payload builder for dynamic QRIS generation according to Bank Indonesia standards.

#### Tasks Completed:
- [x] Implemented \`EMVCoPayloadBuilder\` class with standard TLV encoding rules.
- [x] Integrated \`crc-16/ccitt-false\` polynomial calculator (\`polynomial: 0x1021, init: 0xFFFF, refIn: false, refOut: false, xorOut: 0x0000\`).
- [x] Configured Redis 7.2 TTL key with 900 seconds expiration.
- [x] Added unit tests covering 50 standard ASPI test vectors.

#### Sample cURL Request:
\`\`\`bash
curl -X POST https://api.assist.id/v1/payments/qris/dynamic \\
  -H "Authorization: Bearer <JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "ORD-20260819-00192",
    "amount": 250000,
    "storeName": "Coffee Shop Flagship Senopati",
    "terminalId": "POS-01"
  }'
\`\`\`

#### Sample Output Payload:
\`\`\`text
00020101021226590016ID.CO.ASSIST.0101189360000912345678900215MERC-ID-992817252045411530336054062500005802ID5927Coffee Shop Flagship Senopati6013JAKARTA SELATAN62180114ORD-20260819-0019263048B92
\`\`\``,
    status: 'done',
    priority: 'urgent',
    assigneeId: userDevBe.id,
    reporterId: userDevBe.id,
    reviewedBy: userOwner.id,
    reviewNotes:
      'Code reviewed and merged via PR #142. Performance test indicates 1.2ms average payload construction latency.',
    startDate: '2026-08-11',
    dueDate: yesterday,
    completedAt: new Date('2026-08-18T16:30:00Z'),
  });

  // Subtask 2: Frontend QR Display Modal with Timer (DONE)
  const stQrisFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'frontend',
    title:
      '[FE-102] Dynamic QR display component with SVG rendering, circular countdown timer & SSE listener',
    description: `### UI / UX Component Specification
Develop a responsive QR checkout dialog featuring high-contrast QR rendering, real-time SVG circular countdown ring, and live payment status listener via Server-Sent Events (SSE).

#### Features Delivered:
- [x] Render vector QR using \`qrcode.react\` SVG canvas with customizable merchant brand logo.
- [x] Circular SVG progress countdown animation (15:00 to 00:00).
- [x] Native audio sound prompt on successful payment confirmation.
- [x] Automated fallback polling if SSE connection is interrupted by client network switches.

#### State Machine Progression:
\`\`\`
[ INITIALIZING ] ──► [ WAITING_FOR_PAYMENT ] ──┬──► [ PAYMENT_CONFIRMED ] ──► [ REDIRECT_SUCCESS ]
                            │                  │
                            │ (T + 15 mins)    └──► [ PAYMENT_FAILED ] ──► [ RETRY_PROMPT ]
                            ▼
                     [ QR_EXPIRED_MODAL ]
\`\`\``,
    status: 'done',
    priority: 'high',
    assigneeId: userDevFe.id,
    reporterId: userDevBe.id,
    reviewedBy: userPo.id,
    reviewNotes:
      'UI and responsiveness verified across iPhone 15 Safari, Samsung Galaxy S24 Chrome, and Desktop browsers.',
    startDate: '2026-08-12',
    dueDate: yesterday,
    completedAt: new Date('2026-08-18T17:45:00Z'),
  });

  // Subtask 3: Backend Webhook & Idempotency Engine (IN PROGRESS)
  const stQrisBe2 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-103] Idempotent Webhook Receiver with HMAC-SHA256 signature verification & BullMQ Dead Letter Queue',
    description: `### Webhook Notification Engine Architecture
Ingest payment notifications from acquiring bank switches with strict cryptographic verification and distributed locking.

#### Implementation Requirements:
1. **Signature Header Verification**: Validate \`X-Assist-Signature: hmac-sha256(timestamp + "." + rawBody, merchantSecret)\`. Reject request if timestamp drift exceeds 300 seconds.
2. **Distributed Redis Mutex**: Prevent parallel race conditions on simultaneous callback retries.
3. **Database Transaction**: Atomic update of Order status to \`PAID\`, increment merchant ledger balance, and trigger merchant outbound webhook.`,
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: userDevBe.id,
    reporterId: userDevBe.id,
    startDate: '2026-08-15',
    dueDate: today,
  });

  // Subtask 4: Mobile payment-status handoff (IN PROGRESS)
  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'mobile',
    title: '[MOB-104] Native QR payment status handoff, deep-link recovery & offline retry state',
    description: `### Mobile Delivery Scope
Connect the native checkout flow to QR payment status updates while preserving the transaction state across backgrounding, deep links, and temporary offline conditions.

#### Acceptance Criteria:
- [ ] Android and iOS resume the active payment session after app backgrounding.
- [ ] Successful payment deep links route to the persisted receipt.
- [ ] Offline retry never creates a duplicate payment request.`,
    status: 'in_progress',
    priority: 'high',
    assigneeId: userDevMobile.id,
    reporterId: userPo.id,
    startDate: '2026-08-17',
    dueDate: tomorrow,
  });

  // Subtask 5: Fullstack merchant reconciliation view (TODO)
  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'fullstack',
    title: '[FS-105] Merchant reconciliation view with settlement API and discrepancy drill-down',
    description: `### Fullstack Delivery Scope
Deliver the authenticated reconciliation endpoint and matching merchant interface for QR settlements, including discrepancy visibility and export readiness.

#### Acceptance Criteria:
- [ ] Settlement totals are read from persisted ledger records.
- [ ] Merchant UI exposes unmatched transactions with accessible status labels.
- [ ] Workspace authorization is enforced by the backend.`,
    status: 'todo',
    priority: 'medium',
    assigneeId: userDevFullstack.id,
    reporterId: userPo.id,
    startDate: '2026-08-21',
    dueDate: nextWeek,
  });

  // Subtask 6: QA End-to-End Simulation & Stress Test (IN REVIEW)
  const stQrisQa1 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-104] Execute E2E Bank Switch Simulation, Chaos Network Timeout Injection & 500 RPS Stress Test',
    description: `### Comprehensive QA Verification Scope
Execute automated and manual test scenarios simulating various acquiring bank responses.

#### Test Execution Checklists:
- [x] Bank Central Asia (BCA) simulated settlement callback (Passed).
- [x] Bank Mandiri dynamic amount integer validation (Passed).
- [x] Simulated network dropout midway through SSE connection (Client recovered and polled state successfully).
- [x] K6 Concurrency Benchmark: 500 RPS sustained for 5 minutes with P95 latency of 38.2ms.
- [ ] Chaos Test: Simulate bank switch returning HTTP 504 Gateway Timeout during webhook acknowledgment.`,
    status: 'in_review',
    priority: 'high',
    assigneeId: userQa.id,
    reporterId: userQa.id,
    reviewedBy: userDevBe.id,
    reviewNotes: 'Pending final chaos test sign-off from Kevin Pratama (QA Lead).',
    startDate: '2026-08-16',
    dueDate: tomorrow,
  });

  // Subtask 7: QA Security Pen-Test (TODO)
  const stQrisQa2 = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fQris.id,
    parentTaskId: tQrisParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-105] Security Penetration Testing: Cryptographic Nonce Tampering & Replay Attack Defense',
    description: `### Penetration Testing Scope:
1. Replay previous bank webhook notifications with identical timestamps to check if signature deduplication blocks processing.
2. Attempt parameter tampering by altering transaction amount (Tag 54) while maintaining old CRC16 to ensure server returns \`CRC_CHECKSUM_MISMATCH\`.
3. Perform rate-limiting stress testing: burst 2,000 requests in 1 second from single IP address to verify Cloudflare and Express rate limiters.`,
    status: 'todo',
    priority: 'medium',
    assigneeId: userQa.id,
    reporterId: userOwner.id,
    startDate: '2026-08-20',
    dueDate: nextWeek,
  });

  // ==========================================
  // SCENARIO 2: DIGITAL ONBOARDING & KYC 2.0 (IN PROGRESS)
  // ==========================================
  const tKycParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fOcr.id,
    parentTaskId: null,
    title:
      '[EPIC-KYC-201] Next-Gen Biometric Onboarding: e-KTP Optical Character Recognition & Face Liveness Pipeline',
    description: `# Next-Gen Digital KYC 2.0 & Biometric Identity Verification

## 1. Executive Summary & Business Drivers
Upgrade the merchant onboarding experience to comply with Bank Indonesia and OJK regulatory standards while driving completion conversion rates. The solution combines on-device WebAssembly computer vision for real-time document bounding box detection with cloud OCR refinement and active 3D face liveness.

\`\`\`
[ Mobile Camera Stream ] ──► [ WebAssembly Edge Filter ] ──► [ Auto-Capture Trigger ]
                                      │                                │
                                      ├── Detect 16-Digit NIK Box      ▼
                                      └── Check Contrast / Glare ──► [ Cloud Vision API ]
                                                                       │
                                                                       ▼
                                                             [ Dukcapil REST v3 ]
                                                                       │
                                                                       ▼
                                                             [ Identity Verified ]
\`\`\`

---

## 2. Extraction Field Mapping Table:
| JSON Field | e-KTP Indonesian Label | Validation Regex | Mandatory |
| :--- | :--- | :--- | :--- |
| \`nik\` | NIK | \`^[1-9]{2}[0-9]{2}[0-9]{2}[0-9]{6}[0-9]{4}$\` | **Yes (16 digits)** |
| \`fullName\` | Nama | \`^[A-Za-z\\s\\.,\\'-]{2,100}$\` | **Yes** |
| \`birthPlaceDate\` | Tempat/Tgl Lahir | \`^[A-Za-z\\s]+,\\s\\d{2}-\\d{2}-\\d{4}$\` | **Yes** |
| \`gender\` | Jenis Kelamin | \`^(LAKI-LAKI\\|PEREMPUAN)$\` | **Yes** |
| \`bloodType\` | Gol. Darah | \`^(A\\|B\\|AB\\|O\\|-)$\` | No |
| \`address\` | Alamat | Text (Max 250 chars) | **Yes** |
| \`rtRw\` | RT/RW | \`^\\d{3}/\\d{3}$\` | **Yes** |
| \`village\` | Kel/Desa | Text (Max 100 chars) | **Yes** |
| \`district\` | Kecamatan | Text (Max 100 chars) | **Yes** |
| \`religion\` | Agama | \`^(ISLAM\\|KRISTEN\\|KATOLIK\\|HINDU\\|BUDDHA\\|KHONGHUCU)$\` | **Yes** |`,
    status: 'in_progress',
    priority: 'high',
    assigneeId: null,
    reporterId: userPo.id,
    startDate: '2026-08-13',
    dueDate: thisMonthEnd,
  });

  // Subtask: FE Camera Framing (DONE)
  const stKycFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fOcr.id,
    parentTaskId: tKycParent.id,
    deliveryArea: 'frontend',
    title:
      '[FE-201] WebRTC Camera Viewfinder with Real-time Card Guidance, Gyroscope Sensor & Auto-Shutter',
    description: `### Frontend WebRTC Implementation
Created a high-framerate camera viewfinder that guides users to align their Indonesian identity card within a rounded bounding frame.

#### Technical Highlights:
- Implemented real-time brightness and blur detector using HTML5 canvas pixel analysis.
- Integrated DeviceOrientation API to warn users when camera tilt exceeds 15 degrees.
- Triggered haptic feedback vibration when card alignment passes confidence threshold.`,
    status: 'done',
    priority: 'high',
    assigneeId: userDevFe.id,
    reporterId: userDevFe.id,
    startDate: '2026-08-13',
    dueDate: '2026-08-16',
    completedAt: new Date('2026-08-16T15:00:00Z'),
  });

  // Subtask: BE OCR Worker (IN PROGRESS)
  const stKycBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fOcr.id,
    parentTaskId: tKycParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-202] Async Cloud Vision Processing Pipeline with Image Deskewing, Grayscale & Regex Normalization',
    description: `### OCR Backend Worker Pipeline
Processes uploaded identity card photos with OpenCV image deskewing and Tesseract / Google Cloud Vision OCR extraction.

#### Processing Steps:
1. Normalize image resolution to standard 1920x1080.
2. Apply bilateral filtering to eliminate camera sensor noise while preserving text edge sharp transitions.
3. Extract NIK, Name, and DOB using deterministic regex parsers.`,
    status: 'in_progress',
    priority: 'high',
    assigneeId: userDevBe.id,
    reporterId: userPo.id,
    startDate: '2026-08-14',
    dueDate: thisWeekEnd,
  });

  // Subtask: QA Low-Light Test Run (CHANGES REQUESTED)
  const stKycQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fOcr.id,
    parentTaskId: tKycParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-204] Test Matrix Execution on 120 Synthetic e-KTP Cards Across Low-Light, Glare & Skewed Angles',
    description: `### QA Benchmark Findings & Rejection Details
Tested 120 synthetic and volunteer test cards in varied environmental conditions.

#### Failure Breakdown:
- **Low Light (< 150 lux)**: 9 cards failed NIK extraction because flash reflection obliterated digit contrast.
- **Skew (> 20 degrees)**: Bounding box auto-crop sheared the bottom date of birth line.

#### Action Required:
Frontend viewfinder must enforce minimal ambient light threshold and reject flash capture when glare is detected over the NIK bounding rectangle.`,
    status: 'changes_requested',
    priority: 'urgent',
    assigneeId: userQa.id,
    reporterId: userQa.id,
    reviewedBy: userQa.id,
    reviewNotes: `Rejection Feedback from Kevin Pratama (QA Lead):
- Extraction accuracy dropped to 92.5% in low-light conditions (Target SLA is >= 98.0%).
- Changes requested: Add client-side glare detection before triggering auto-shutter.`,
    startDate: '2026-08-16',
    dueDate: today,
  });

  // ==========================================
  // SCENARIO 2B: AUTOMATED AML & SANCTIONS (IN REVIEW)
  // ==========================================
  const tAmlParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fAml.id,
    parentTaskId: null,
    title:
      '[EPIC-AML-202] Automated AML & PPATK Sanctions List Screening Engine with Trigram Indexing',
    description: `# Automated Anti-Money Laundering & Sanctions Screening Hub

## 1. Compliance Architecture & Sanctions Lists
Real-time high-throughput watchlist screening against United Nations (UNSC), OFAC Specially Designated Nationals, and Indonesian PPATK databases.

## 2. Match Scoring Algorithm:
- **Trigram Similarity**: Pre-filters 120,000 watchlist records down to top 50 candidates in < 3ms.
- **Jaro-Winkler Metric**: Applies fine-grained prefix scaling with Indonesian honorific normalization.
- **Decision Engine**: Score >= 85 flags account for human compliance officer review; score < 85 automatically passes.`,
    status: 'in_review',
    priority: 'high',
    assigneeId: null,
    reporterId: userPo.id,
    startDate: '2026-08-08',
    dueDate: today,
  });

  // Subtask: BE AML PEP Fuzzy Matching (DONE)
  const stAmlBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fAml.id,
    parentTaskId: tAmlParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-203] Real-time Jaro-Winkler & Trigram AML/PEP Sanctions Screening Engine with Honorific Sanitizer',
    description: `### AML Compliance Matching Microservice
Fuzzy matches applicant names against PPATK and OFAC SDN sanctions list using trigram indexes and Jaro-Winkler coefficient calculations.

#### Key Optimizations:
- Stripped 28 common Indonesian honorific titles prior to distance computation.
- Maintained P99 query latency under 8.4ms against 120,000 blacklisted identity records.`,
    status: 'done',
    priority: 'high',
    assigneeId: userDevBe.id,
    reporterId: userPo.id,
    startDate: '2026-08-08',
    dueDate: '2026-08-15',
    completedAt: new Date('2026-08-15T12:00:00Z'),
  });

  // Subtask: QA AML Test Run (IN REVIEW)
  const stAmlQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fAml.id,
    parentTaskId: tAmlParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-205] Verify Jaro-Winkler fuzzy matching precision & honorific stripping on 500 test vectors',
    description:
      'Validated 500 common Indonesian names containing titles. Verified false-positive review triggers dropped from 14.2% down to 1.6%.',
    status: 'in_review',
    priority: 'high',
    assigneeId: userQa.id,
    reporterId: userQa.id,
    startDate: '2026-08-16',
    dueDate: today,
  });

  // ==========================================
  // SCENARIO 3: INFRASTRUCTURE, DB POOLING & RESILIENCE (DONE)
  // ==========================================
  const tInfraParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fDbPool.id,
    parentTaskId: null,
    title:
      '[EPIC-INFRA-301] PostgreSQL Read-Replicas, PgBouncer Connection Pooling & Disaster Recovery Failover',
    description: `# Enterprise Platform Resilience & Zero-Downtime Database Architecture

## 1. Objective
Establish multi-node PostgreSQL read-replica clusters and PgBouncer transaction connection pooling to support sustained throughput of **10,000 transactions/second** while guaranteeing sub-second Recovery Point Objective (RPO).

\`\`\`
[ Microservices API Pool ]
          │
          ▼
   [ PgBouncer 1.22 ] (Transaction Mode, max_client_conn = 5000)
          │
    ┌─────┴───────────────────────┐
    ▼ (Writes / Mutations)        ▼ (Reads / Analytics)
[ PostgreSQL Primary ] ──(WAL)──► [ PostgreSQL Read Replica 01 ]
 (AWS Jakarta ap-southeast-3)     [ PostgreSQL Read Replica 02 ]
\`\`\``,
    status: 'done',
    priority: 'high',
    assigneeId: null,
    reporterId: userOwner.id,
    reviewedBy: userOwner.id,
    reviewNotes:
      'Disaster recovery failover simulation completed with 11.8s RTO and 0.0s data loss.',
    startDate: '2026-08-01',
    dueDate: '2026-08-15',
    completedAt: new Date('2026-08-15T18:00:00Z'),
  });

  const stInfraBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fDbPool.id,
    parentTaskId: tInfraParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-301] PgBouncer transaction pooling configuration & Sequelize read/write pool routing',
    description:
      'Configured transaction pooling and split Sequelize queries so all analytical reporting queries route to read replicas.',
    status: 'done',
    priority: 'high',
    assigneeId: userDevBe.id,
    reporterId: userOwner.id,
    startDate: '2026-08-01',
    dueDate: '2026-08-10',
    completedAt: new Date('2026-08-10T19:00:00Z'),
  });

  const stInfraQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fDbPool.id,
    parentTaskId: tInfraParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-302] Chaos Engineering: Kill Primary DB Node & verify automated replica promotion within 12 seconds',
    description:
      'Injected SIGKILL into Primary DB container under 1,000 active client connections. Verified Patroni auto-promoted replica in 11.8s.',
    status: 'done',
    priority: 'high',
    assigneeId: userQa.id,
    reporterId: userQa.id,
    startDate: '2026-08-11',
    dueDate: '2026-08-14',
    completedAt: new Date('2026-08-14T14:20:00Z'),
  });

  // ==========================================
  // SCENARIO 4: FIDO2 WEBAUTHN PASSKEY (IN REVIEW)
  // ==========================================
  const tPasskeyParent = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fPasskey.id,
    parentTaskId: null,
    title:
      '[EPIC-SEC-302] FIDO2 WebAuthn Passkey Biometric Authentication for Merchant SuperAdmin Portal',
    description: `# FIDO2 / WebAuthn Hardware Passkey Security Protocol

## 1. Specification & Threat Model
Eliminate credential stuffing and phishing vectors by enabling hardware cryptographic security keys (TouchID, FaceID, YubiKey) for merchant dashboard superadmins.

### Challenge-Response Ceremony:
\`\`\`
1. Client -> Server: POST /v1/auth/passkey/generate-challenge
2. Server -> Client: Returns Cryptographic Random Nonce (32 bytes) + RP ID "assist.id"
3. Client: Calls navigator.credentials.get({ publicKey: ... })
4. Client Hardware: Prompts User Biometric -> Signs Challenge with Private Key
5. Client -> Server: POST /v1/auth/passkey/verify-assertion (authenticatorData + clientDataJSON + signature)
6. Server: Verifies Signature with Stored Public Key & Increments Sign Counter
\`\`\``,
    status: 'in_review',
    priority: 'urgent',
    assigneeId: null,
    reporterId: userOwner.id,
    startDate: '2026-08-14',
    dueDate: thisWeekEnd,
  });

  const stPasskeyBe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fPasskey.id,
    parentTaskId: tPasskeyParent.id,
    deliveryArea: 'backend',
    title:
      '[BE-303] WebAuthn Registration and Authentication Ceremony Endpoints with Attestation Verification',
    description:
      'Constructed FIDO2 ceremony endpoints with CBOR decoding and sign counter monotonic increment assertion.',
    status: 'done',
    priority: 'urgent',
    assigneeId: userDevBe.id,
    reporterId: userOwner.id,
    startDate: '2026-08-14',
    dueDate: '2026-08-17',
    completedAt: new Date('2026-08-17T18:00:00Z'),
  });

  const stPasskeyFe = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fPasskey.id,
    parentTaskId: tPasskeyParent.id,
    deliveryArea: 'frontend',
    title:
      '[FE-304] Client WebAuthn Navigator Credentials API Integration with TouchID / FaceID Biometric Prompt',
    description:
      'Built clean React biometric enrollment modal with device capability detection and graceful fallback.',
    status: 'in_review',
    priority: 'high',
    assigneeId: userDevFe.id,
    reporterId: userDevFe.id,
    startDate: '2026-08-16',
    dueDate: today,
  });

  const stPasskeyQa = await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fPasskey.id,
    parentTaskId: tPasskeyParent.id,
    deliveryArea: 'qa',
    title:
      '[QA-305] Cross-Browser & Cross-Platform WebAuthn Compatibility Matrix on Physical Hardware',
    description:
      'Testing biometric authentication across iOS Safari FaceID, Android Chrome Fingerprint, macOS TouchID, and Windows Hello.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: userQa.id,
    reporterId: userQa.id,
    startDate: '2026-08-17',
    dueDate: thisWeekEnd,
  });

  // ==========================================
  // SCENARIO 5: PO BACKLOG & SPECIFICATIONS (TODO & IN PROGRESS)
  // ==========================================
  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fAiFraud.id,
    parentTaskId: null,
    title:
      '[PO Spec] PRD: Machine Learning Transaction Velocity Scoring & Real-Time Card Testing Mitigation',
    description: `# PRD: AI Real-Time Fraud & Card Testing Anomaly Engine

## 1. Background & Threat Landscape
Fraudsters frequently use compromised BIN lists to test stolen credit cards with automated scripts (100+ attempts/minute). This feature introduces an online XGBoost anomaly scoring pipeline that flags velocity anomalies in under 15ms.

## 2. Velocity Rules Matrix:
- Rule 1: More than 3 failed attempts from single IP in 60s -> 15-minute IP rate limit.
- Rule 2: More than 2 different card issuers attempted from single device fingerprint in 180s -> Force 3DS Step-Up challenge.
- Rule 3: Transaction amount > 5x historical 30-day merchant average -> Trigger Manager approval push notification.`,
    status: 'in_progress',
    priority: 'high',
    assigneeId: null,
    reporterId: userPo.id,
    startDate: '2026-08-18',
    dueDate: nextWeek,
  });

  await TaskModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    folderId: fWebhook.id,
    parentTaskId: null,
    title:
      '[PO Spec] User Story: Automated Daily Settlement Reconciliation CSV & SFTP Batch Dispatch',
    description: `### User Story: Daily Automated Merchant Settlement Reconciliation
As a corporate merchant finance manager, I want to receive an encrypted CSV report of all settled QRIS and Credit Card transactions at 00:01 WIB every morning via SFTP and email, so that I can automatically reconcile bank deposits against my ERP ledger without manual data export.`,
    status: 'todo',
    priority: 'medium',
    assigneeId: null,
    reporterId: userPo.id,
    startDate: '2026-08-22',
    dueDate: thisMonthEnd,
  });

  console.log('✅ Comprehensive parent tasks and subtasks created.');

  // 8. Traceability Links (Task Requirements & Task Documents)
  console.log('🔗 Establishing Traceability Links...');

  await TaskRequirementModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tQrisParent.id,
      requirementId: req1.id,
      linkedBy: userPo.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tKycParent.id,
      requirementId: req2.id,
      linkedBy: userPo.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tPasskeyParent.id,
      requirementId: req3.id,
      linkedBy: userOwner.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tAmlParent.id,
      requirementId: req4.id,
      linkedBy: userPo.id,
    },
  ]);

  await TaskDocumentModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tQrisParent.id,
      documentId: docTestPlan.id,
      linkType: 'primary_prd',
      linkedBy: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tKycParent.id,
      documentId: docKycBrief.id,
      linkType: 'primary_prd',
      linkedBy: userPo.id,
    },
  ]);

  console.log('✅ Traceability links established.');

  // 9. Create Real Image Files and Task Attachments
  console.log('📎 Creating Real SVG Image Files & Task Attachment Records...');

  // 1. QRIS Payment Flow SVG Diagram
  const svgQrisDiagram = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#0b1c30" rx="16"/>
  <text x="400" y="45" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">ASPI EMVCo Dynamic QRIS Payment Architecture</text>
  
  <!-- Node: Customer -->
  <rect x="50" y="100" width="180" height="90" fill="#1e293b" stroke="#6366f1" stroke-width="2" rx="12"/>
  <text x="140" y="138" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Customer Mobile</text>
  <text x="140" y="160" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">BCA / Mandiri / GoPay</text>

  <!-- Node: Gateway -->
  <rect x="310" y="100" width="180" height="90" fill="#1e293b" stroke="#10b981" stroke-width="2" rx="12"/>
  <text x="400" y="138" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">QRIS Gateway Engine</text>
  <text x="400" y="160" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">ASPI TLV + Redis TTL</text>

  <!-- Node: Bank Switch -->
  <rect x="570" y="100" width="180" height="90" fill="#1e293b" stroke="#f59e0b" stroke-width="2" rx="12"/>
  <text x="660" y="138" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Bank Switch (ASPI)</text>
  <text x="660" y="160" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">Real-time Settlement</text>

  <!-- Flow Arrows -->
  <path d="M 230 145 L 310 145" stroke="#6366f1" stroke-width="3" fill="none" marker-end="url(#arrow)"/>
  <path d="M 490 145 L 570 145" stroke="#10b981" stroke-width="3" fill="none"/>
  
  <!-- Lower Node: Redis Mutex -->
  <rect x="310" y="260" width="180" height="80" fill="#1e293b" stroke="#ec4899" stroke-width="2" rx="12"/>
  <text x="400" y="295" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Redis 7.2 Cluster</text>
  <text x="400" y="318" fill="#f472b6" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">TTL Lock: 900s</text>

  <path d="M 400 190 L 400 260" stroke="#ec4899" stroke-width="2" stroke-dasharray="4" fill="none"/>
</svg>`;

  const att1File = createEvidenceImageFile(
    workspace.id,
    tQrisParent.id,
    'qris_payment_flow_architecture.svg',
    svgQrisDiagram,
  );

  // 2. K6 Benchmark Latency Chart SVG
  const svgK6Chart = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#0f172a" rx="16"/>
  <text x="400" y="45" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">K6 Stress Test: 500 RPS Concurrency Benchmark</text>
  
  <!-- Chart Axes -->
  <line x1="100" y1="320" x2="720" y2="320" stroke="#475569" stroke-width="2"/>
  <line x1="100" y1="100" x2="100" y2="320" stroke="#475569" stroke-width="2"/>
  
  <!-- Y-Axis Labels -->
  <text x="85" y="110" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="end">150ms (SLA)</text>
  <text x="85" y="180" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="end">100ms</text>
  <text x="85" y="250" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="end">50ms</text>
  <text x="85" y="320" fill="#94a3b8" font-family="monospace" font-size="10" text-anchor="end">0ms</text>

  <!-- SLA Reference Line -->
  <line x1="100" y1="110" x2="720" y2="110" stroke="#ef4444" stroke-width="2" stroke-dasharray="6"/>

  <!-- Latency Area Curve -->
  <path d="M 100 300 Q 250 280, 400 270 T 700 260 L 700 320 L 100 320 Z" fill="rgba(16, 185, 129, 0.25)"/>
  <path d="M 100 300 Q 250 280, 400 270 T 700 260" stroke="#10b981" stroke-width="3" fill="none"/>

  <!-- Data Callouts -->
  <circle cx="400" cy="270" r="5" fill="#10b981"/>
  <text x="400" y="250" fill="#34d399" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">P95: 38.2ms</text>

  <circle cx="700" cy="260" r="5" fill="#10b981"/>
  <text x="680" y="240" fill="#34d399" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">P99: 64.9ms</text>
</svg>`;

  const att2File = createEvidenceImageFile(
    workspace.id,
    stQrisQa1.id,
    'k6_stress_test_latency_distribution.svg',
    svgK6Chart,
  );

  // 3. e-KTP Viewfinder UI Wireframe SVG
  const svgEktpViewfinder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
  <rect width="800" height="450" fill="#1e1e2e" rx="16"/>
  <text x="400" y="40" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">e-KTP WebRTC Camera Viewfinder UI Specification</text>

  <!-- Phone Frame -->
  <rect x="250" y="70" width="300" height="340" fill="#11111b" stroke="#585b70" stroke-width="3" rx="24"/>
  
  <!-- Viewfinder ID Card Box -->
  <rect x="275" y="140" width="250" height="155" fill="none" stroke="#a6e3a1" stroke-width="3" rx="12" stroke-dasharray="8"/>
  <text x="400" y="225" fill="#a6e3a1" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Fit Identity Card Inside Frame</text>

  <!-- NIK Scan Sub-box -->
  <rect x="295" y="175" width="210" height="28" fill="rgba(166, 227, 161, 0.15)" stroke="#a6e3a1" stroke-width="1.5" rx="6"/>
  <text x="400" y="194" fill="#a6e3a1" font-family="monospace" font-size="10" text-anchor="middle">NIK [16-Digits Box]</text>

  <!-- Guidance Badge -->
  <rect x="300" y="320" width="200" height="32" fill="#313244" rx="16"/>
  <text x="400" y="341" fill="#cdd6f4" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">Hold Still - Auto Capturing...</text>
</svg>`;

  const att3File = createEvidenceImageFile(
    workspace.id,
    stKycFe.id,
    'ektp_camera_viewfinder_ui_mockup.svg',
    svgEktpViewfinder,
  );

  // 4. Low-light Bug Evidence SVG
  const svgBugEvidence = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#181825" rx="16"/>
  <text x="400" y="45" fill="#f38ba8" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">QA Bug Evidence: Low-Light Glare Reflection over NIK</text>

  <!-- Simulated Card with Glare -->
  <rect x="180" y="90" width="440" height="240" fill="#313244" stroke="#f38ba8" stroke-width="3" rx="14"/>
  <text x="210" y="130" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">REPUBLIK INDONESIA</text>
  <text x="210" y="155" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12">PROVINSI DKI JAKARTA</text>

  <!-- Glare streak covering NIK -->
  <path d="M 200 200 Q 400 180, 600 210 L 610 235 Q 400 205, 190 225 Z" fill="rgba(255, 255, 255, 0.85)"/>
  <text x="400" y="218" fill="#11111b" font-family="monospace" font-size="11" font-weight="bold" text-anchor="middle">GLARE STREAK: NIK 317103********88 OBLITERATED</text>

  <!-- Error Tag -->
  <rect x="260" y="270" width="280" height="34" fill="#f38ba8" rx="8"/>
  <text x="400" y="292" fill="#11111b" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" text-anchor="middle">OCR Extraction Accuracy: 92.5% (FAIL &lt; 98%)</text>
</svg>`;

  const att4File = createEvidenceImageFile(
    workspace.id,
    stKycQa.id,
    'ocr_bounding_box_extraction_failure.svg',
    svgBugEvidence,
  );

  // 5. WebAuthn Passkey Sequence Diagram SVG
  const svgWebAuthn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#0f172a" rx="16"/>
  <text x="400" y="45" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="18" font-weight="bold" text-anchor="middle">FIDO2 / WebAuthn Passkey Biometric Ceremony</text>

  <rect x="60" y="90" width="180" height="70" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="10"/>
  <text x="150" y="125" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">1. Client Browser</text>
  <text x="150" y="145" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">navigator.credentials</text>

  <rect x="310" y="90" width="180" height="70" fill="#1e293b" stroke="#a855f7" stroke-width="2" rx="10"/>
  <text x="400" y="125" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">2. Biometric HW</text>
  <text x="400" y="145" fill="#c084fc" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">TouchID / Secure Enclave</text>

  <rect x="560" y="90" width="180" height="70" fill="#1e293b" stroke="#10b981" stroke-width="2" rx="10"/>
  <text x="650" y="125" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">3. Relying Party API</text>
  <text x="650" y="145" fill="#6ee7b7" font-family="system-ui, sans-serif" font-size="10" text-anchor="middle">Verify Challenge Nonce</text>

  <!-- Flow lines -->
  <path d="M 240 125 L 310 125" stroke="#38bdf8" stroke-width="2" fill="none"/>
  <path d="M 490 125 L 560 125" stroke="#a855f7" stroke-width="2" fill="none"/>
  
  <rect x="180" y="240" width="440" height="80" fill="#1e293b" stroke="#64748b" stroke-width="1.5" rx="12"/>
  <text x="400" y="275" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Zero Shared Secrets over the Wire</text>
  <text x="400" y="298" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">Private keys never leave the device hardware Secure Enclave.</text>
</svg>`;

  const att5File = createEvidenceImageFile(
    workspace.id,
    tPasskeyParent.id,
    'webauthn_passkey_security_ceremony.svg',
    svgWebAuthn,
  );

  // Bulk create attachments in DB
  await TaskAttachmentModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tQrisParent.id,
      fileName: 'qris_payment_flow_architecture.svg',
      fileSize: att1File.fileSize,
      mimeType: att1File.mimeType,
      storageRef: att1File.storageRef,
      storageProvider: 'local',
      category: 'product_media',
      caption: 'End-to-end architecture topology and sequence flow for dynamic QRIS generation.',
      uploaderId: userOwner.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: stQrisQa1.id,
      fileName: 'k6_stress_test_latency_distribution.svg',
      fileSize: att2File.fileSize,
      mimeType: att2File.mimeType,
      storageRef: att2File.storageRef,
      storageProvider: 'local',
      category: 'qa_evidence',
      caption: 'K6 performance run results at 500 RPS demonstrating P99 latency of 64.9ms.',
      uploaderId: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: stKycFe.id,
      fileName: 'ektp_camera_viewfinder_ui_mockup.svg',
      fileSize: att3File.fileSize,
      mimeType: att3File.mimeType,
      storageRef: att3File.storageRef,
      storageProvider: 'local',
      category: 'product_media',
      caption: 'Mobile camera viewfinder wireframe with card boundary guidance overlay.',
      uploaderId: userDevFe.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: stKycQa.id,
      fileName: 'ocr_bounding_box_extraction_failure.svg',
      fileSize: att4File.fileSize,
      mimeType: att4File.mimeType,
      storageRef: att4File.storageRef,
      storageProvider: 'local',
      category: 'qa_evidence',
      caption: 'Evidence of low-light flash glare obscuring the 16-digit NIK segment.',
      uploaderId: userQa.id,
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tPasskeyParent.id,
      fileName: 'webauthn_passkey_security_ceremony.svg',
      fileSize: att5File.fileSize,
      mimeType: att5File.mimeType,
      storageRef: att5File.storageRef,
      storageProvider: 'local',
      category: 'product_media',
      caption: 'FIDO2 WebAuthn cryptographic authentication challenge ceremony.',
      uploaderId: userOwner.id,
    },
  ]);

  console.log('✅ Real SVG images written to disk and attached to tasks.');

  // 10. Threaded Collaborative Tektokan Conversations with Mentions
  console.log('💬 Creating Multi-Turn Threaded Discussions & Mentions between PO, Dev, and QA...');

  // Thread 1: QRIS Decimal Formatting Debate
  const cQris1 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tQrisParent.id,
    authorId: userQa.id,
    body: `Hi @budi.santoso, I executed our automated test suite against the Bank Mandiri dynamic QR validator sandbox. When testing amounts containing decimals (e.g. \`Rp 25.000,50\`), the acquiring switch rejected the payload with \`ERR_INVALID_AMOUNT_FORMAT\`.

Does the ASPI QRIS 4.2.1 specification permit fractional cents for Indonesian Rupiah, or must the payload strictly enforce integer rounding?`,
    createdAt: new Date('2026-08-14T09:15:00Z'),
  });

  await TaskCommentMentionModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    commentId: cQris1.id,
    userId: userDevBe.id,
  });

  const cQris2 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tQrisParent.id,
    authorId: userPo.id,
    parentCommentId: cQris1.id,
    body: `@kevin.pratama @budi.santoso According to Bank Indonesia ASPI Spec Section 4.2.1, Tag 54 for IDR currency (ISO 360) must strictly be formatted as an integer numeric string without decimals.

I have updated the Acceptance Criteria in **REQ-PAY-001** to make this constraint explicit. Please normalize all incoming amounts using \`Math.floor()\` or \`BigInt\` formatting before constructing Tag 54.`,
    createdAt: new Date('2026-08-14T09:40:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace.id, commentId: cQris2.id, userId: userQa.id },
    { id: uuidv4(), workspaceId: workspace.id, commentId: cQris2.id, userId: userDevBe.id },
  ]);

  const cQris3 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tQrisParent.id,
    authorId: userDevBe.id,
    parentCommentId: cQris1.id,
    body: `Thanks for the immediate clarification @sarah.jenkins!

I have implemented integer normalization in \`EMVCoPayloadBuilder.ts\` and pushed PR #142 to Staging build 88. @kevin.pratama please re-run the Bank Mandiri test suite on Staging.`,
    createdAt: new Date('2026-08-14T11:20:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace.id, commentId: cQris3.id, userId: userPo.id },
    { id: uuidv4(), workspaceId: workspace.id, commentId: cQris3.id, userId: userQa.id },
  ]);

  const cQris4 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tQrisParent.id,
    authorId: userQa.id,
    parentCommentId: cQris1.id,
    body: `Re-tested on Staging build 88! All 50 ASPI compliance vectors passed, including dynamic amounts up to Rp 10.000.000. Verified CRC16 checksum polynomial matches. Marking test case as **PASSED**! 🎉`,
    createdAt: new Date('2026-08-14T14:10:00Z'),
  });

  // Thread 2: KYC Glare and Low-Light Rejection Debate
  const cKyc1 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tKycParent.id,
    authorId: userQa.id,
    body: `@siti.rahma @budi.santoso I have updated task [QA-204] with status **Changes Requested**.

When testing in dim room lighting (< 150 lux), the smartphone LED flash creates a direct specular reflection across the NIK area, reducing OCR extraction accuracy to **92.5%** (below our 98% SLA). See attached bug screenshot for evidence.`,
    createdAt: new Date('2026-08-16T15:30:00Z'),
  });

  await TaskCommentMentionModel.bulkCreate([
    { id: uuidv4(), workspaceId: workspace.id, commentId: cKyc1.id, userId: userDevFe.id },
    { id: uuidv4(), workspaceId: workspace.id, commentId: cKyc1.id, userId: userDevBe.id },
  ]);

  const cKyc2 = await TaskCommentModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    taskId: tKycParent.id,
    authorId: userDevFe.id,
    parentCommentId: cKyc1.id,
    body: `Great catch @kevin.pratama. I will add a real-time luminance histogram calculation in the WebAssembly viewfinder module.

If pixel brightness variance indicates harsh glare over the central bounding box, we will display an interactive toast prompt: *"Please tilt camera slightly to avoid flash reflection"*, preventing premature auto-shutter capture.`,
    createdAt: new Date('2026-08-16T16:15:00Z'),
  });

  await TaskCommentMentionModel.create({
    id: uuidv4(),
    workspaceId: workspace.id,
    commentId: cKyc2.id,
    userId: userQa.id,
  });

  console.log('✅ Multi-turn threaded discussions created.');

  // 11. Task Activity Audit Trail
  console.log('📜 Creating Task Activity Logs...');

  await TaskActivityModel.bulkCreate([
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tQrisParent.id,
      actorId: userPo.id,
      action: 'task_created',
      metadataJson: { title: tQrisParent.title, priority: tQrisParent.priority },
      createdAt: new Date('2026-08-11T09:00:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: tQrisParent.id,
      actorId: userDevBe.id,
      action: 'status_changed',
      metadataJson: { from: 'todo', to: 'in_progress' },
      createdAt: new Date('2026-08-11T10:15:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: stQrisFe.id,
      actorId: userDevFe.id,
      action: 'status_changed',
      metadataJson: { from: 'in_progress', to: 'done' },
      createdAt: new Date('2026-08-18T17:45:00Z'),
    },
    {
      id: uuidv4(),
      workspaceId: workspace.id,
      taskId: stKycQa.id,
      actorId: userQa.id,
      action: 'status_changed',
      metadataJson: { from: 'in_review', to: 'changes_requested' },
      createdAt: new Date('2026-08-16T15:30:00Z'),
    },
  ]);

  console.log('✅ Activity audit trail created.');

  // 13. Seed Realistic In-App Notifications
  await NotificationModel.bulkCreate([
    {
      id: uuidv4(),
      userId: userDevFe.id,
      workspaceId: workspace.id,
      taskId: stKycFe.id,
      actorId: userQa.id,
      type: 'mention',
      title: 'New Mention in KYC Discussion',
      message:
        'Depi mentioned you: "@Iwal (Dev FE) Please check OCR camera canvas orientation issue on iOS WebKit."',
      isRead: false,
      createdAt: new Date('2026-08-17T11:20:00Z'),
    },
    {
      id: uuidv4(),
      userId: userDevFe.id,
      workspaceId: workspace.id,
      taskId: stQrisFe.id,
      actorId: userPo.id,
      type: 'status_change',
      title: 'Task Status Updated',
      message:
        'Fajar (PO) moved "Indonesian Standard QRIS Checkout UI & Dynamic QR Canvas" to DONE.',
      isRead: false,
      createdAt: new Date('2026-08-18T18:00:00Z'),
    },
    {
      id: uuidv4(),
      userId: userDevFe.id,
      workspaceId: workspace.id,
      taskId: stPasskeyFe.id,
      actorId: userPo.id,
      type: 'assignment',
      title: 'New Subtask Assigned',
      message: 'Fajar (PO) assigned you to "[FE] WebAuthn Passkey Registration Flow".',
      isRead: true,
      readAt: new Date('2026-08-18T09:30:00Z'),
      createdAt: new Date('2026-08-17T09:00:00Z'),
    },
    {
      id: uuidv4(),
      userId: userDevBe.id,
      workspaceId: workspace.id,
      taskId: stQrisBe1.id,
      actorId: userDevFe.id,
      type: 'mention',
      title: 'New Mention in QRIS Discussion',
      message:
        'Iwal mentioned you: "@Indra (Dev BE) SSE payment event stream contract tested and working smoothly."',
      isRead: false,
      createdAt: new Date('2026-08-18T14:15:00Z'),
    },
    {
      id: uuidv4(),
      userId: userDevBe.id,
      workspaceId: workspace.id,
      taskId: stAmlBe.id,
      actorId: userPo.id,
      type: 'assignment',
      title: 'New Subtask Assigned',
      message: 'Fajar (PO) assigned you to "[BE] Rules Engine & Redis Velocity Limiter".',
      isRead: true,
      readAt: new Date('2026-08-17T10:00:00Z'),
      createdAt: new Date('2026-08-16T08:30:00Z'),
    },
    {
      id: uuidv4(),
      userId: userQa.id,
      workspaceId: workspace.id,
      taskId: stQrisQa1.id,
      actorId: userDevFe.id,
      type: 'status_change',
      title: 'Ready for QA Verification',
      message: 'Iwal moved "Indonesian Standard QRIS Checkout UI" to IN REVIEW.',
      isRead: false,
      createdAt: new Date('2026-08-18T16:30:00Z'),
    },
    {
      id: uuidv4(),
      userId: userQa.id,
      workspaceId: workspace.id,
      taskId: stKycQa.id,
      actorId: userPo.id,
      type: 'assignment',
      title: 'New Subtask Assigned',
      message:
        'Fajar (PO) assigned you to "[QA] End-to-End KYC Verification & False-Positive Regression Matrix".',
      isRead: true,
      readAt: new Date('2026-08-15T10:00:00Z'),
      createdAt: new Date('2026-08-15T09:00:00Z'),
    },
    {
      id: uuidv4(),
      userId: userPo.id,
      workspaceId: workspace.id,
      taskId: stKycQa.id,
      actorId: userQa.id,
      type: 'status_change',
      title: 'Quality Gate Notice',
      message: 'Depi (QA Lead) requested changes on "KYC Video Liveness Verification Flow".',
      isRead: false,
      createdAt: new Date('2026-08-16T15:35:00Z'),
    },
    {
      id: uuidv4(),
      userId: userOwner.id,
      workspaceId: workspace.id,
      type: 'system',
      title: '🌟 Welcome to Qlick Hub',
      message:
        'Workspace "Fintech Ecosystem & Core Banking Platform" is fully configured and ready for collaboration.',
      isRead: false,
      createdAt: new Date('2026-08-19T08:00:00Z'),
    },
  ]);

  console.log('✅ Persistent in-app notifications created.');

  // Summary
  console.log('\n======================================================');
  console.log('🎉 PRISTINE E2E RE-SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('👥 Users Created (All passwords: Password123!):');
  console.log('   1. [Owner/Admin]  owner@assist.id     (Reyand)');
  console.log('   2. [PO]           po@assist.id        (Fajar)');
  console.log('   3. [Dev BE]       dev.be@assist.id    (Indra)');
  console.log('   4. [Dev FE]       dev.fe@assist.id    (Iwal)');
  console.log('   5. [Dev Mobile]   dev.mobile@assist.id (Nadia)');
  console.log('   6. [Dev Fullstack] dev.fullstack@assist.id (Raka)');
  console.log('   7. [QA Lead]      qa@assist.id        (Depi)');
  console.log('------------------------------------------------------');
  console.log('🏢 Workspace: Fintech Ecosystem & Core Banking Platform');
  console.log('📁 Hierarchical Folders: 4 Level-1 Epics, 7 Feature Subfolders');
  console.log(
    '🎯 Tasks & Subtasks: Full lifecycle across Backend, Frontend, Mobile, Fullstack, and QA',
  );
  console.log('📎 Image Attachments: Real SVG diagrams created and linked on disk');
  console.log('💬 Discussions: Multi-turn threaded debates with @mentions');
  console.log('📋 Traceability: Requirements, Test Cases & QA Markdown Plans');
  console.log('======================================================\n');

  await sequelize.close();
}

if (
  process.argv[1]?.endsWith('seedFullTestData.ts') ||
  process.argv[1]?.endsWith('seedFullTestData.js')
) {
  seedFullTestData().catch((err) => {
    console.error('❌ Error executing seedFullTestData:', err);
    process.exit(1);
  });
}
