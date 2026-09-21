export const typeDefs = `#graphql
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String
    avatarUrl: String
    businessId: ID!
    createdAt: String!
  }

  enum CurrencyCode {
    GHS
    USD
  }

  type Business {
    id: ID!
    name: String!
    slug: String!
    email: String
    phone: String
    address: String
    logoUrl: String
    currency: CurrencyCode!
    createdAt: String!
    updatedAt: String!
  }

  type AccessInfo {
    permissions: [String!]!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    expiresIn: String!
    user: User!
    business: Business!
  }

  type TokenRefresh {
    accessToken: String!
    expiresIn: String!
  }

  type Session {
    id: ID!
    deviceLabel: String
    lastSeenAt: String!
    createdAt: String!
  }

  type Role {
    id: ID!
    businessId: ID!
    name: String!
    description: String
    permissions: [String!]!
    isSystem: Boolean!
    createdAt: String!
  }

  type Employee {
    id: ID!
    businessId: ID!
    userId: ID
    firstName: String!
    lastName: String!
    email: String
    phone: String
    avatarUrl: String
    roleIds: [ID!]!
    isActive: Boolean!
    hasPosPin: Boolean!
    createdAt: String!
  }

  type PosEmployeeCard {
    id: ID!
    firstName: String!
    lastName: String!
    avatarUrl: String
    canSignInWithPassword: Boolean!
    canSignInWithPin: Boolean!
  }

  type PosSessionState {
    business: Business
    deviceUser: User
    activeEmployee: Employee
    permissions: [String!]!
  }

  type PosActivation {
    activeEmployee: Employee!
    permissions: [String!]!
  }

  type AuditLog {
    id: ID!
    action: String!
    entityType: String!
    entityId: String
    ipAddress: String
    metadata: JSON
    createdAt: String!
  }

  type ProductCategory {
    id: ID!
    name: String!
    description: String
    parentId: ID
    createdAt: String!
  }

  type ProductType {
    id: ID!
    name: String!
    description: String
    sortOrder: Int!
    active: Boolean!
    createdAt: String!
  }

  enum ProductMetadataValueType {
    TEXT
    NUMBER
    SELECT
  }

  type ProductMetadataField {
    id: ID!
    productTypeId: ID
    key: String!
    label: String!
    valueType: ProductMetadataValueType!
    unit: String
    options: [String!]!
    sortOrder: Int!
    active: Boolean!
  }

  enum ProductDiscountType {
    NONE
    PERCENT
    FIXED
  }

  type Product {
    id: ID!
    categoryId: ID
    productTypeId: ID
    name: String!
    sku: String
    barcode: String
    price: Float!
    cost: Float!
    trackInventory: Boolean!
    isActive: Boolean!
    imageUrl: String
    metadata: JSON
    expiryDate: String
    discountType: ProductDiscountType!
    discountValue: Float!
    createdAt: String!
  }

  enum MediaEntityType {
    BUSINESS
    PRODUCT
    SERVICE
    EMPLOYEE
    CUSTOMER
  }

  type MediaAsset {
    id: ID!
    businessId: ID!
    filename: String!
    url: String!
    mimeType: String!
    sizeBytes: Int!
    altText: String
    entityType: MediaEntityType
    entityId: ID
    createdAt: String!
    updatedAt: String!
  }

  type Location {
    id: ID!
    name: String!
    isDefault: Boolean!
    createdAt: String!
  }

  type StockLevel {
    id: ID!
    productId: ID!
    locationId: ID!
    quantity: Float!
    updatedAt: String!
  }

  type StockMovement {
    id: ID!
    productId: ID!
    locationId: ID!
    movementType: String!
    quantityDelta: Float!
    referenceType: String
    referenceId: String
    createdAt: String!
  }

  type StockTransfer {
    id: ID!
    fromLocationId: ID!
    toLocationId: ID!
    status: String!
    lines: [StockTransferLine!]!
    createdAt: String!
  }

  type StockTransferLine {
    productId: ID!
    quantity: Float!
  }

  type Supplier {
    id: ID!
    name: String!
    email: String
    phone: String
    address: String
    createdAt: String!
  }

  enum PaymentChannelType {
    BANK_ACCOUNT
    MOBILE_MONEY
  }

  type PaymentChannel {
    id: ID!
    type: PaymentChannelType!
    name: String!
    accountNumber: String
    network: String
    number: String
    createdAt: String!
  }

  type PurchaseOrder {
    id: ID!
    supplierId: ID!
    locationId: ID!
    status: String!
    lines: [PurchaseLine!]!
    createdAt: String!
  }

  type PurchaseLine {
    productId: ID!
    quantityOrdered: Float!
    quantityReceived: Float!
    unitCost: Float!
  }

  type Customer {
    id: ID!
    firstName: String!
    lastName: String!
    email: String
    phone: String
    createdAt: String!
  }

  type CashRegister {
    id: ID!
    name: String!
    locationId: ID!
    isActive: Boolean!
  }

  type RegisterSession {
    id: ID!
    registerId: ID!
    status: String!
    openingFloat: Float!
    closingAmount: Float
    openedAt: String!
    closedAt: String
  }

  type SaleLine {
    lineType: String!
    productId: ID
    serviceId: ID
    name: String!
    quantity: Float!
    unitPrice: Float!
    discountAmount: Float!
    lineTotal: Float!
  }

  type Sale {
    id: ID!
    customerId: ID
    registerSessionId: ID
    employeeId: ID
    status: String!
    lines: [SaleLine!]!
    subtotal: Float!
    discountTotal: Float!
    taxTotal: Float!
    total: Float!
    createdAt: String!
  }

  type Payment {
    id: ID!
    saleId: ID!
    method: String!
    amount: Float!
    reference: String
    paymentChannelId: ID
    createdAt: String!
  }

  type DiscountRule {
    id: ID!
    name: String!
    type: String!
    value: Float!
    isActive: Boolean!
  }

  enum TaxApplicationMode {
    INCLUSIVE
    EXCLUSIVE
  }

  type TaxRule {
    id: ID!
    name: String!
    rate: Float!
    mode: TaxApplicationMode!
    isActive: Boolean!
  }

  input TaxRuleInput {
    name: String!
    rate: Float!
    mode: TaxApplicationMode!
    isActive: Boolean
  }

  enum ReturnKind {
    RETURN
    REFUND
  }

  enum ReturnStockDisposition {
    RESTOCK
    WASTE
  }

  type ReturnRecord {
    id: ID!
    saleId: ID!
    totalRefund: Float!
    kind: ReturnKind!
    stockDisposition: ReturnStockDisposition!
    reason: String
    createdAt: String!
  }

  type Receipt {
    businessName: String!
    saleId: ID!
    soldByName: String
    subtotal: Float!
    discountTotal: Float!
    taxTotal: Float!
    total: Float!
    html: String!
    escPosStub: String!
  }

  type Shift {
    id: ID!
    employeeId: ID!
    startAt: String!
    endAt: String!
    notes: String
  }

  type AttendanceRecord {
    id: ID!
    employeeId: ID!
    clockInAt: String!
    clockOutAt: String
  }

  type PerformanceMetric {
    id: ID!
    employeeId: ID!
    periodStart: String!
    periodEnd: String!
    salesTotal: Float!
    appointmentCount: Int!
  }

  type Service {
    id: ID!
    name: String!
    description: String
    durationMinutes: Int!
    price: Float!
    isActive: Boolean!
    imageUrl: String
  }

  input ServiceInput {
    name: String!
    durationMinutes: Int!
    price: Float!
    description: String
    imageUrl: String
  }

  type Appointment {
    id: ID!
    customerId: ID!
    startAt: String!
    endAt: String!
    status: String!
    serviceIds: [ID!]!
    assignedEmployeeIds: [ID!]!
    notes: String
  }

  type StaffServiceAssignment {
    id: ID!
    employeeId: ID!
    serviceId: ID!
  }

  type CommissionRule {
    id: ID!
    name: String!
    percent: Float!
    appliesTo: String!
    isActive: Boolean!
  }

  type CommissionEntry {
    id: ID!
    employeeId: ID!
    saleId: ID
    appointmentId: ID
    amount: Float!
    createdAt: String!
  }

  type Expense {
    id: ID!
    category: String!
    amount: Float!
    description: String
    incurredAt: String!
  }

  type Invoice {
    id: ID!
    invoiceNumber: String!
    saleId: ID
    employeeId: ID
    status: String!
    total: Float!
    issuedAt: String
  }

  type LoyaltyRule {
    id: ID!
    name: String!
    pointsPerCurrency: Float!
    isActive: Boolean!
  }

  type CustomerLoyaltyBalance {
    id: ID!
    customerId: ID!
    points: Float!
  }

  type Notification {
    id: ID!
    title: String!
    body: String!
    readAt: String
    createdAt: String!
  }

  type FraudRule {
    id: ID!
    name: String!
    ruleType: String!
    threshold: Float!
    isActive: Boolean!
  }

  type ActivityFlag {
    id: ID!
    severity: String!
    message: String!
    resolvedAt: String
    createdAt: String!
  }

  type DashboardSummary {
    salesToday: Float!
    openRegisterSessions: Int!
    lowStockCount: Int!
    appointmentsToday: Int!
  }

  type DashboardKpis {
    salesToday: Float!
    salesYesterday: Float!
    salesTodayChangePercent: Float!
    salesLast7Days: Float!
    salesLast30Days: Float!
    ordersToday: Int!
    ordersLast7Days: Int!
    avgOrderValue30Days: Float!
    openRegisterSessions: Int!
    lowStockCount: Int!
    appointmentsToday: Int!
    appointmentsNext7Days: Int!
    customerCount: Int!
    newCustomers30Days: Int!
    productCount: Int!
    expensesLast30Days: Float!
    netRevenue30Days: Float!
  }

  type DashboardSeriesPoint {
    label: String!
    value: Float!
    count: Int!
  }

  type DashboardRankedItem {
    id: ID!
    name: String!
    value: Float!
    secondary: Float
  }

  type DashboardFinancePoint {
    label: String!
    revenue: Float!
    expenses: Float!
  }

  type HomeDashboard {
    kpis: DashboardKpis!
    salesTrend: [DashboardSeriesPoint!]!
    ordersTrend: [DashboardSeriesPoint!]!
    salesByDayOfWeek: [DashboardSeriesPoint!]!
    topProducts: [DashboardRankedItem!]!
    lowStockProducts: [DashboardRankedItem!]!
    appointmentsTrend: [DashboardSeriesPoint!]!
    revenueVsExpenses: [DashboardFinancePoint!]!
  }

  type PosStaffDashboardKpis {
    salesToday: Float!
    salesYesterday: Float!
    salesTodayChangePercent: Float!
    salesLast7Days: Float!
    salesLast30Days: Float!
    ordersToday: Int!
    ordersLast7Days: Int!
    avgOrderValue30Days: Float!
  }

  type PosStaffDashboard {
    employeeName: String!
    kpis: PosStaffDashboardKpis!
    salesTrend: [DashboardSeriesPoint!]!
    ordersTrend: [DashboardSeriesPoint!]!
  }

  type SalesReportRow {
    period: String!
    total: Float!
    count: Int!
  }

  type InventoryReportRow {
    productId: ID!
    productName: String!
    quantity: Float!
  }

  type SyncQueueItem {
    id: ID!
    entityType: String!
    entityId: String!
    operation: String!
    syncedAt: String
  }

  type ExportPayload {
    filename: String!
    csv: String!
  }

  input RegisterInput {
    businessName: String!
    email: String!
    password: String!
    name: String!
    deviceLabel: String
  }

  input LoginInput {
    email: String!
    password: String!
    deviceLabel: String
  }

  input BusinessProfileInput {
    name: String
    email: String
    phone: String
    address: String
    logoUrl: String
    currency: CurrencyCode
  }

  input RoleInput {
    name: String!
    description: String
    permissions: [String!]!
  }

  input EmployeeInput {
    firstName: String!
    lastName: String!
    email: String
    phone: String
    avatarUrl: String
    roleIds: [ID!]!
    userId: ID
    """Set or change POS PIN (4–32 chars). Omit to leave unchanged."""
    posPin: String
  }

  input MyProfileInput {
    name: String
    avatarUrl: String
  }

  input CustomerInput {
    firstName: String!
    lastName: String!
    email: String
    phone: String
  }

  input SupplierInput {
    name: String!
    email: String
    phone: String
    address: String
  }

  input PaymentChannelInput {
    type: PaymentChannelType!
    name: String!
    accountNumber: String
    network: String
    number: String
  }

  input ProductCategoryInput {
    name: String!
    description: String
    parentId: ID
  }

  input ProductInput {
    categoryId: ID
    productTypeId: ID
    name: String!
    sku: String
    barcode: String
    price: Float!
    cost: Float
    trackInventory: Boolean
    imageUrl: String
    metadata: JSON
    expiryDate: String
    discountType: ProductDiscountType
    discountValue: Float
  }

  input ProductTypeInput {
    name: String!
    description: String
    sortOrder: Int
    active: Boolean
  }

  input ProductTypeUpdateInput {
    name: String
    description: String
    sortOrder: Int
    active: Boolean
  }

  input ProductMetadataFieldInput {
    productTypeId: ID!
    label: String!
    valueType: ProductMetadataValueType!
    unit: String
    options: [String!]
    sortOrder: Int
    active: Boolean
  }

  input ProductMetadataFieldUpdateInput {
    label: String
    valueType: ProductMetadataValueType
    unit: String
    options: [String!]
    sortOrder: Int
    active: Boolean
  }

  input SaleLineInput {
    lineType: String!
    productId: ID
    serviceId: ID
    name: String!
    quantity: Float!
    unitPrice: Float!
    discountAmount: Float
  }

  input PaymentInput {
    method: String!
    amount: Float!
    reference: String
    paymentChannelId: ID
  }

  input SyncPushInput {
    entityType: String!
    entityId: String!
    operation: String!
    payload: JSON!
    clientUpdatedAt: String!
  }

  type Query {
    health: String!
    me: User
    myAccess: AccessInfo
    business: Business
    permissionsCatalog: [String!]!
    sessions: [Session!]!
    paymentChannels: [PaymentChannel!]!
    roles: [Role!]!
    role(id: ID!): Role
    employees: [Employee!]!
    employee(id: ID!): Employee
    auditLogs(limit: Int): [AuditLog!]!
    productCategories: [ProductCategory!]!
    productTypes(includeInactive: Boolean): [ProductType!]!
    productMetadataFields(includeInactive: Boolean, productTypeId: ID): [ProductMetadataField!]!
    products: [Product!]!
    product(id: ID!): Product
    locations: [Location!]!
    stockLevels(locationId: ID): [StockLevel!]!
    stockMovements(limit: Int): [StockMovement!]!
    stockTransfers: [StockTransfer!]!
    suppliers: [Supplier!]!
    purchaseOrders: [PurchaseOrder!]!
    customers: [Customer!]!
    customerPurchaseHistory(customerId: ID!): [Sale!]!
    cashRegisters: [CashRegister!]!
    openRegisterSessions: [RegisterSession!]!
    registerSession(id: ID!): RegisterSession
    sales(status: String): [Sale!]!
    sale(id: ID!): Sale
    discountRules: [DiscountRule!]!
    taxRules: [TaxRule!]!
    shifts: [Shift!]!
    attendanceRecords(employeeId: ID): [AttendanceRecord!]!
    performanceMetrics(employeeId: ID): [PerformanceMetric!]!
    services: [Service!]!
    appointments: [Appointment!]!
    staffServiceAssignments: [StaffServiceAssignment!]!
    commissionRules: [CommissionRule!]!
    commissionEntries(employeeId: ID): [CommissionEntry!]!
    expenses: [Expense!]!
    invoices: [Invoice!]!
    loyaltyRules: [LoyaltyRule!]!
    customerLoyaltyBalance(customerId: ID!): CustomerLoyaltyBalance
    notifications: [Notification!]!
    fraudRules: [FraudRule!]!
    activityFlags: [ActivityFlag!]!
    dashboardSummary: DashboardSummary!
    homeDashboard(trendDays: Int): HomeDashboard!
    posStaffDashboard(trendDays: Int): PosStaffDashboard!
    salesReport(days: Int): [SalesReportRow!]!
    inventoryReport: [InventoryReportRow!]!
    employeeReport(days: Int): [PerformanceMetric!]!
    financialReport(days: Int): SalesReportRow
    syncQueuePending: [SyncQueueItem!]!
    mediaAssets(entityType: MediaEntityType, entityId: ID, search: String): [MediaAsset!]!
    mediaAsset(id: ID!): MediaAsset
    posEmployeeRoster: [PosEmployeeCard!]!
    posSession: PosSessionState!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    refreshToken(refreshToken: String!): TokenRefresh!
    logout: Boolean!
    updateMyProfile(input: MyProfileInput!): User!
    activatePosEmployee(employeeId: ID!, password: String!): PosActivation!
    deactivatePosEmployee: Boolean!
    revokeSession(sessionId: ID!): Boolean!
    updateBusinessProfile(input: BusinessProfileInput!): Business!
    createPaymentChannel(input: PaymentChannelInput!): PaymentChannel!
    updatePaymentChannel(id: ID!, input: PaymentChannelInput!): PaymentChannel!
    deletePaymentChannel(id: ID!): Boolean!
    createRole(input: RoleInput!): Role!
    updateRole(id: ID!, input: RoleInput!): Role!
    deleteRole(id: ID!): Boolean!
    createEmployee(input: EmployeeInput!): Employee!
    updateEmployee(id: ID!, input: EmployeeInput!): Employee!
    deleteEmployee(id: ID!): Boolean!
    createProductCategory(input: ProductCategoryInput!): ProductCategory!
    createProductType(input: ProductTypeInput!): ProductType!
    updateProductType(id: ID!, input: ProductTypeUpdateInput!): ProductType!
    deleteProductType(id: ID!): Boolean!
    createProductMetadataField(input: ProductMetadataFieldInput!): ProductMetadataField!
    updateProductMetadataField(id: ID!, input: ProductMetadataFieldUpdateInput!): ProductMetadataField!
    deleteProductMetadataField(id: ID!): Boolean!
    seedProductMetadataFields: Int!
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
    generateProductBarcode(id: ID!): Product!
    createLocation(name: String!, isDefault: Boolean): Location!
    adjustStock(productId: ID!, locationId: ID!, quantityDelta: Float!, notes: String): StockMovement!
    createStockTransfer(fromLocationId: ID!, toLocationId: ID!, lines: [StockTransferLineInput!]!): StockTransfer!
    completeStockTransfer(id: ID!): StockTransfer!
    createSupplier(name: String!, email: String, phone: String, address: String): Supplier!
    updateSupplier(id: ID!, input: SupplierInput!): Supplier!
    deleteSupplier(id: ID!): Boolean!
    createPurchaseOrder(supplierId: ID!, locationId: ID!, lines: [PurchaseLineInput!]!): PurchaseOrder!
    receivePurchaseOrder(id: ID!, lines: [ReceiveLineInput!]!): PurchaseOrder!
    createCustomer(firstName: String!, lastName: String!, email: String, phone: String): Customer!
    updateCustomer(id: ID!, input: CustomerInput!): Customer!
    deleteCustomer(id: ID!): Boolean!
    createCashRegister(name: String!, locationId: ID!): CashRegister!
    openRegisterSession(registerId: ID!, openingFloat: Float): RegisterSession!
    closeRegisterSession(id: ID!, closingAmount: Float!): RegisterSession!
    createSaleDraft(registerSessionId: ID, customerId: ID, lines: [SaleLineInput!]!): Sale!
    finalizeSale(id: ID!, payments: [PaymentInput!]!): Sale!
    createReturn(
      saleId: ID!
      lines: [ReturnLineInput!]!
      reason: String
      kind: ReturnKind
      stockDisposition: ReturnStockDisposition
    ): ReturnRecord!
    createDiscountRule(name: String!, type: String!, value: Float!): DiscountRule!
    createTaxRule(input: TaxRuleInput!): TaxRule!
    updateTaxRule(id: ID!, input: TaxRuleInput!): TaxRule!
    deleteTaxRule(id: ID!): Boolean!
    createShift(employeeId: ID!, startAt: String!, endAt: String!, notes: String): Shift!
    clockIn: AttendanceRecord!
    clockOut: AttendanceRecord!
    computePerformanceMetrics(employeeId: ID!, periodStart: String!, periodEnd: String!): PerformanceMetric!
    createService(input: ServiceInput!): Service!
    updateService(id: ID!, input: ServiceInput!): Service!
    deleteService(id: ID!): Boolean!
    createAppointment(customerId: ID!, startAt: String!, endAt: String!, serviceIds: [ID!]!, assignedEmployeeIds: [ID!]!): Appointment!
    assignStaffService(employeeId: ID!, serviceId: ID!): StaffServiceAssignment!
    createCommissionRule(name: String!, percent: Float!, appliesTo: String): CommissionRule!
    createExpense(category: String!, amount: Float!, incurredAt: String!, description: String): Expense!
    createInvoiceFromSale(saleId: ID!): Invoice!
    createLoyaltyRule(name: String!, pointsPerCurrency: Float!): LoyaltyRule!
    markNotificationRead(id: ID!): Notification!
    createFraudRule(name: String!, ruleType: String!, threshold: Float!): FraudRule!
    resolveActivityFlag(id: ID!): ActivityFlag!
    exportProductsCsv: ExportPayload!
    importProductsCsv(csv: String!): Int!
    syncPush(items: [SyncPushInput!]!): [SyncQueueItem!]!
    syncAck(ids: [ID!]!): Boolean!
    saleReceipt(saleId: ID!): Receipt!
    createMediaAsset(input: CreateMediaAssetInput!): MediaAsset!
    updateMediaAsset(id: ID!, input: UpdateMediaAssetInput!): MediaAsset!
    deleteMediaAsset(id: ID!): Boolean!
  }

  input CreateMediaAssetInput {
    filename: String!
    mimeType: String!
    dataBase64: String!
    altText: String
    entityType: MediaEntityType
    entityId: ID
  }

  input UpdateMediaAssetInput {
    altText: String
    entityType: MediaEntityType
    entityId: ID
    clearEntityLink: Boolean
  }

  input StockTransferLineInput {
    productId: ID!
    quantity: Float!
  }

  input PurchaseLineInput {
    productId: ID!
    quantityOrdered: Float!
    unitCost: Float!
  }

  input ReceiveLineInput {
    productId: ID!
    quantity: Float!
  }

  input ReturnLineInput {
    productId: ID!
    quantity: Float!
    refundAmount: Float!
  }

  type Subscription {
    notificationAdded(businessId: ID!): Notification!
  }
`;
